import apiClient from './apiClient';
import { openSocket } from './socket';

const TERMINAL = ['DELIVERED', 'CANCELLED', 'REJECTED'];
const POLL_MS = 20000;

/** Normalizes the /orders/:id/tracking response into plain { lat, lng } points. */
const normalize = (data) => {
  const coords = data.customerLocation?.location?.coordinates;
  return {
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    status: data.status,
    rider: data.rider || null,
    shop: data.shop || null,
    hubLocation: data.hubLocation ? { ...data.hubLocation, name: data.shop?.name } : null,
    customerLocation: coords ? { lat: coords[1], lng: coords[0] } : null,
    riderLocation: data.tracking?.lat != null ? { lat: data.tracking.lat, lng: data.tracking.lng, updatedAt: data.tracking.updatedAt } : null
  };
};

export const trackingService = {
  async getTracking(orderId) {
    const res = await apiClient.get(`/orders/${orderId}/tracking`);
    return normalize(res.data.data);
  },

  /**
   * Streams tracking for an order: an initial snapshot, live rider GPS over the socket,
   * status pushes, and a slow poll as a fallback. Returns an unsubscribe function.
   * onUpdate receives partial objects to merge: snapshot fields, { riderLocation }, or { status }.
   */
  subscribe(orderId, onUpdate) {
    let stopped = false;
    let timer = null;

    const refresh = async () => {
      try {
        const snapshot = await this.getTracking(orderId);
        if (stopped) return;
        onUpdate(snapshot);
        if (TERMINAL.includes(snapshot.status)) stop();
      } catch {
        // Keep the last known state; the next poll retries.
      }
    };

    const socket = openSocket();
    socket.on('connect', () => socket.emit('join_order', orderId));
    socket.on('rider:location:update', (p) => {
      if (String(p.orderId) === String(orderId)) {
        onUpdate({ riderLocation: { lat: p.latitude, lng: p.longitude, updatedAt: p.timestamp } });
      }
    });
    socket.on('order_status_update', (p) => {
      if (String(p.orderId) === String(orderId)) refresh();
    });

    function stop() {
      stopped = true;
      clearInterval(timer);
      socket.close();
    }

    refresh();
    timer = setInterval(refresh, POLL_MS);
    return stop;
  }
};
