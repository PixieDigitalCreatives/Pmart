import apiClient from './apiClient';
import { io } from 'socket.io-client';

const activeSubscriptions = new Map();
const socketConnections = new Map();
const callbackMap = new Map();

// Use VITE_API_URL if set, otherwise derive from VITE_API_BASE_URL, fallback to localhost
const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_API_BASE_URL?.replace('/api', '')) ||
  'http://localhost:5000';

const isDev = import.meta.env.DEV;
const log = (...args) => { if (isDev) console.log('[TrackingService]', ...args); };

export const trackingService = {
  /**
   * Fetch current tracking snapshot for an order
   */
  async getTracking(orderId) {
    const response = await apiClient.get(`/orders/${orderId}/tracking`);
    return this.enrichTrackingData(response.data);
  },

  enrichTrackingData(data) {
    const payload = data.data || data;

    let distanceKm = null;
    let etaMinutes = null;

    const riderLoc = payload.tracking?.location || payload.rider?.location;
    const custLoc = payload.customerLocation?.coordinates || payload.deliveryAddress?.coordinates;

    if (riderLoc?.lat && riderLoc?.lng && custLoc?.lat && custLoc?.lng) {
      const R = 6371;
      const dLat = (custLoc.lat - riderLoc.lat) * Math.PI / 180;
      const dLon = (custLoc.lng - riderLoc.lng) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(riderLoc.lat * Math.PI / 180) *
          Math.cos(custLoc.lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      // ETA: no routing API integrated — display "Calculating..." in UI
      etaMinutes = null;
    }

    payload.distanceKm = distanceKm !== null ? Number(distanceKm.toFixed(1)) : null;
    payload.etaMinutes = etaMinutes;

    return data;
  },

  /**
   * Subscribe to live location updates.
   * Returns an unsubscribe function.
   */
  subscribeToTracking(orderId, callback) {
    if (activeSubscriptions.has(orderId)) {
      this.unsubscribeFromTracking(orderId);
    }

    callbackMap.set(orderId, callback);

    const emitUpdate = async () => {
      try {
        const data = await this.getTracking(orderId);
        const cb = callbackMap.get(orderId);
        if (cb) cb(data);
        
        const status = data?.data?.status || data?.status;
        const normStatus = String(status).toUpperCase();
        if (normStatus === 'DELIVERED' || normStatus === 'CANCELLED' || normStatus === 'REJECTED' || normStatus === 'DELIVERY_FAILED') {
          log('Terminal state reached. Auto-unsubscribing from tracking for order:', orderId);
          this.unsubscribeFromTracking(orderId);
        }
      } catch (err) {
        log('Tracking poll error:', err.message);
      }
    };

    // Initial fetch
    emitUpdate();

    // Socket.io for real-time rider GPS
    log('Connecting to socket:', SOCKET_URL);
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => log('Socket connected, joining order room:', orderId));
    socket.on('connect_error', (err) => log('Socket connect error:', err.message));

    socket.emit('join_order', orderId);

    socket.on('rider:location:update', (data) => {
      log('CUSTOMER GPS RECEIVED orderId:', data.orderId, 'lat:', data.latitude, 'lng:', data.longitude);
      // Directly feed the GPS update to the callback without a full re-fetch
      const cb = callbackMap.get(orderId);
      if (cb) {
        cb({
          data: {
            tracking: {
              location: { lat: data.latitude, lng: data.longitude },
              updatedAt: data.timestamp
            },
            trackingState: 'TRACKING_ACTIVE',
          }
        });
      }
    });

    socketConnections.set(orderId, socket);

    // Fallback polling every 20s for status changes
    const intervalId = setInterval(emitUpdate, 20000);
    activeSubscriptions.set(orderId, intervalId);

    return () => this.unsubscribeFromTracking(orderId);
  },

  /**
   * Unsubscribe from order tracking
   */
  unsubscribeFromTracking(orderId) {
    if (activeSubscriptions.has(orderId)) {
      clearInterval(activeSubscriptions.get(orderId));
      activeSubscriptions.delete(orderId);
    }
    if (socketConnections.has(orderId)) {
      const socket = socketConnections.get(orderId);
      socket.disconnect();
      socketConnections.delete(orderId);
      log('Socket disconnected for order:', orderId);
    }
    callbackMap.delete(orderId);
  }
};
