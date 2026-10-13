import { useState, useEffect, useRef, useCallback } from 'react';
import { trackingService } from '@/services/trackingService';
import { getRoute } from '@/services/routingService';

const ROUTE_REFRESH_MS = 10000;

/**
 * Live tracking for one order: rider position, destination, store, and a road route with ETA.
 * ETA/distance come from the routing service; they stay null if no route is available.
 */
export const useLiveTracking = (orderId) => {
  const [state, setState] = useState({ status: null, rider: null, riderLocation: null, customerLocation: null, hubLocation: null });
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [recenterCount, setRecenterCount] = useState(0);
  const lastRouteAt = useRef(0);

  useEffect(() => {
    if (!orderId) return undefined;
    const unsubscribe = trackingService.subscribe(orderId, (patch) => setState((prev) => ({ ...prev, ...patch })));
    return unsubscribe;
  }, [orderId]);

  const { riderLocation, customerLocation } = state;

  useEffect(() => {
    if (!riderLocation || !customerLocation) return;
    const now = Date.now();
    if (now - lastRouteAt.current < ROUTE_REFRESH_MS) return;
    lastRouteAt.current = now;

    let cancelled = false;
    getRoute([riderLocation.lng, riderLocation.lat], [customerLocation.lng, customerLocation.lat])
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setRoute(data.geometry);
          setDistanceKm(Number((data.distanceMeters / 1000).toFixed(1)));
          setEtaMinutes(Math.max(1, Math.ceil(data.durationSeconds / 60)));
          setRouteError(false);
        } else {
          setRouteError(true);
        }
      })
      .catch(() => !cancelled && setRouteError(true));
    return () => {
      cancelled = true;
    };
  }, [riderLocation, customerLocation]);

  const recenter = useCallback(() => setRecenterCount((c) => c + 1), []);

  return {
    ...state,
    trackingState: riderLocation ? 'TRACKING_ACTIVE' : 'TRACKING_WAITING',
    route,
    routeError,
    etaMinutes,
    distanceKm,
    recenterTrigger: recenterCount,
    recenter
  };
};
