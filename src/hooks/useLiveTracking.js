import { useState, useEffect, useCallback, useRef } from 'react';
import { trackingService } from '@/services/trackingService';
import { getRoute } from '@/services/routingService';

const isDev = import.meta.env.DEV;
const log = (...args) => { if (isDev) console.log('[useLiveTracking]', ...args); };

/**
 * useLiveTracking Hook
 * Subscribes to real-time location and status updates for an order.
 */
export const useLiveTracking = (orderId) => {
  const [trackingData, setTrackingData] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [hubLocation, setHubLocation] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [status, setStatus] = useState(null);
  const [trackingState, setTrackingState] = useState('TRACKING_LOADING');
  const [route, setRoute] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState(null);
  const [recenterCount, setRecenterCount] = useState(0);

  useEffect(() => {
    if (!orderId) return;

    log('subscribing to tracking for orderId:', orderId);
    setTrackingState('TRACKING_LOADING');
    setIsConnected(true);
    setError(null);

    let isMounted = true;
    let lastRouteFetchTime = 0;
    let currentRiderLoc = null;
    let currentCustLoc = null;

    const fetchRouteDebounced = async (rLoc, cLoc) => {
      const now = Date.now();
      // Only fetch route every 10 seconds to avoid spamming the routing API
      if (now - lastRouteFetchTime < 10000) return;
      lastRouteFetchTime = now;

      try {
        const routeData = await getRoute([rLoc.lng, rLoc.lat], [cLoc.lng, cLoc.lat]);
        if (isMounted && routeData) {
          setRoute(routeData.geometry);
          setDistanceKm(Number((routeData.distanceMeters / 1000).toFixed(1)));
          setEtaMinutes(Math.max(1, Math.ceil(routeData.durationSeconds / 60)));
        }
      } catch (err) {
        log('Route fetch failed', err);
      }
    };

    const unsubscribe = trackingService.subscribeToTracking(orderId, (update) => {
      const payload = update.data || update;
      log('tracking update received, keys:', Object.keys(payload));

      if (payload.customerLocation?.coordinates) {
        currentCustLoc = payload.customerLocation.coordinates;
        setCustomerLocation(currentCustLoc);
      } else if (payload.deliveryAddress?.coordinates) {
        currentCustLoc = payload.deliveryAddress.coordinates;
        setCustomerLocation(currentCustLoc);
      }

      // Handle Rider GPS update
      if (payload.tracking?.location?.lat) {
        currentRiderLoc = { lat: payload.tracking.location.lat, lng: payload.tracking.location.lng };
        setRiderLocation(currentRiderLoc);
        
        // Fetch Route if we have both locations
        if (currentCustLoc) {
          fetchRouteDebounced(currentRiderLoc, currentCustLoc);
        }
      }

      // Only update the rest if it's a full tracking snapshot (not just a GPS relay)
      if (payload.customerLocation !== undefined || payload.status !== undefined || payload.deliveryAddress !== undefined) {
        setTrackingData(payload);
        setHubLocation(payload.hubLocation || payload.shop?.address);
        if (payload.status) setStatus(payload.status);
        if (payload.trackingState) setTrackingState(payload.trackingState);
        setIsConnected(true);
      } else if (payload.trackingState) {
        // Minimal socket relay — just update state
        setTrackingState(payload.trackingState);
      }
    });

    return () => {
      isMounted = false;
      log('unsubscribing from tracking for orderId:', orderId);
      unsubscribe();
    };
  }, [orderId]);

  const recenter = useCallback(() => {
    setRecenterCount((c) => c + 1);
  }, []);

  return {
    trackingData,
    riderLocation,
    customerLocation,
    hubLocation,
    etaMinutes,
    distanceKm,
    status,
    trackingState,
    route,
    isConnected,
    error,
    recenterTrigger: recenterCount,
    recenter,
  };
};
