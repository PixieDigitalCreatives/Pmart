import { useState, useEffect, useCallback, useRef } from 'react';
import { trackingService } from '@/services/trackingService';

/**
 * useLiveTracking Hook
 * Subscribes to real-time location and status updates for an order.
 * Transport-agnostic: Works with WebSocket, SSE, Polling, or mock simulation.
 */
export const useLiveTracking = (orderId) => {
  const [trackingData, setTrackingData] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [hubLocation, setHubLocation] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(12);
  const [distanceKm, setDistanceKm] = useState(1.8);
  const [status, setStatus] = useState('OUT_FOR_DELIVERY');
  const [trackingState, setTrackingState] = useState('TRACKING_LOADING');
  const [route, setRoute] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState(null);
  const [recenterCount, setRecenterCount] = useState(0);

  const prevLocationRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    setTrackingState('TRACKING_LOADING');
    setIsConnected(true);
    setError(null);

    // Initial snapshot fetch
    trackingService.getTracking(orderId)
      .then((data) => {
        setTrackingData(data);
        setRiderLocation(data.rider?.location);
        setCustomerLocation(data.customerLocation);
        setHubLocation(data.hubLocation);
        setEtaMinutes(data.etaMinutes);
        setDistanceKm(data.distanceKm);
        setStatus(data.status);
        setTrackingState(data.trackingState || 'TRACKING_ACTIVE');
        setRoute(data.route);
        prevLocationRef.current = data.rider?.location;
      })
      .catch((err) => {
        console.error('Failed to load tracking snapshot:', err);
        setError('Live location is temporarily unavailable');
        setTrackingState('TRACKING_UNAVAILABLE');
      });

    // Start live subscription
    const unsubscribe = trackingService.subscribeToTracking(orderId, (update) => {
      setTrackingData(update);
      setRiderLocation(update.rider?.location);
      setCustomerLocation(update.customerLocation);
      setHubLocation(update.hubLocation);
      setEtaMinutes(update.etaMinutes);
      setDistanceKm(update.distanceKm);
      setStatus(update.status);
      setTrackingState(update.trackingState);
      setRoute(update.route);
      setIsConnected(true);
    });

    return () => {
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
    recenter
  };
};
