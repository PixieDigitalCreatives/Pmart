import React, { useRef, useEffect, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import { getRoute } from '../../services/routingService';
import '@maptiler/sdk/dist/maptiler-sdk.css';

const isDev = import.meta.env.DEV;
const log = (...args) => { if (isDev) console.log('[MAP AdminDelivery]', ...args); };

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export const LiveDeliveryMap = ({ deliveries, selectedDelivery }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const hasFittedBoundsRef = useRef(false);
  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [routeError, setRouteError] = useState(false);

  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

  useEffect(() => {
    log('component mounted');

    if (!hasWebGL()) {
      setMapError('Map rendering unavailable in this browser (WebGL required).');
      return;
    }

    if (!apiKey || apiKey === 'YOUR_MAPTILER_KEY_HERE') {
      log('API key missing');
      setMapError('Map unavailable. VITE_MAPTILER_API_KEY not set.');
      return;
    }

    if (map.current) return;

    const container = mapContainer.current;
    if (!container) {
      log('container is null');
      return;
    }

    const rect = container.getBoundingClientRect();
    log('container dimensions:', rect.width, 'x', rect.height);

    maptilersdk.config.apiKey = apiKey;
    log('API key present: true, creating map');

    try {
      map.current = new maptilersdk.Map({
        container,
        style: maptilersdk.MapStyle.STREETS_V2,
        center: [84.0156, 24.9589], // P-Mart Sasaram default
        zoom: 11,
      });

      log('map created');

      map.current.on('load', () => {
        log('style loaded — calling resize');
        map.current.resize();
        setMapReady(true);
      });

      map.current.on('style.error', (e) => {
        log('style error', e);
        setMapError('Map style failed to load.');
      });

      map.current.on('error', (e) => {
        log('map error', e?.error?.message || e);
      });
    } catch (err) {
      log('map init exception:', err.message);
      setMapError('Map failed to initialize: ' + err.message);
    }

    const onResize = () => { if (map.current) map.current.resize(); };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      Object.values(markersRef.current).forEach(m => {
        if (m.animationFrame) cancelAnimationFrame(m.animationFrame);
      });
      if (map.current) {
        map.current.remove();
        map.current = null;
        log('map removed');
      }
    };
  }, [apiKey]);

  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Remove stale markers
    const currentIds = new Set(deliveries.map(d => d.orderId || d._id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].riderMarker?.remove();
        markersRef.current[id].customerMarker?.remove();
        if (markersRef.current[id].animationFrame) {
          cancelAnimationFrame(markersRef.current[id].animationFrame);
        }
        delete markersRef.current[id];
      }
    });

    const bounds = new maptilersdk.LngLatBounds();
    let hasPoints = false;

    deliveries.forEach(delivery => {
      const id = delivery.orderId || delivery._id;

      const rLat = delivery.riderLocation?.lat || delivery.tracking?.location?.lat;
      const rLng = delivery.riderLocation?.lng || delivery.tracking?.location?.lng;
      const cLat = delivery.customerLocation?.lat || delivery.deliveryAddress?.coordinates?.lat || delivery.deliveryAddress?.location?.coordinates?.[1];
      const cLng = delivery.customerLocation?.lng || delivery.deliveryAddress?.coordinates?.lng || delivery.deliveryAddress?.location?.coordinates?.[0];

      if (rLat && rLng) {
        hasPoints = true;
        bounds.extend([rLng, rLat]);
      }
      
      if (cLat && cLng) {
        hasPoints = true;
        bounds.extend([cLng, cLat]);
      }

      if (!rLat || !rLng) {
        // If rider isn't tracked yet, but we have customer, we still want to show the customer
        if (cLat && cLng) {
          if (!markersRef.current[id]) {
            markersRef.current[id] = { riderMarker: null, customerMarker: null };
          }
          if (!markersRef.current[id].customerMarker) {
            const cEl = document.createElement('div');
            cEl.style.cssText = 'width:16px;height:16px;background:#48BB78;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)';
            const customerMarker = new maptilersdk.Marker({ element: cEl })
              .setLngLat([cLng, cLat])
              .addTo(map.current);
            markersRef.current[id].customerMarker = customerMarker;
          } else {
            markersRef.current[id].customerMarker.setLngLat([cLng, cLat]);
          }
        }
        return;
      }

      if (markersRef.current[id] && markersRef.current[id].riderMarker) {
        const startLngLat = markersRef.current[id].riderMarker.getLngLat();
        const endLngLat = [rLng, rLat];
        
        if (startLngLat.lng !== endLngLat[0] || startLngLat.lat !== endLngLat[1]) {
          if (markersRef.current[id].animationFrame) {
            cancelAnimationFrame(markersRef.current[id].animationFrame);
          }
          
          const startTime = performance.now();
          const duration = 1000;
          
          const animateMarker = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
            
            const currentLng = startLngLat.lng + (endLngLat[0] - startLngLat.lng) * easeProgress;
            const currentLat = startLngLat.lat + (endLngLat[1] - startLngLat.lat) * easeProgress;
            
            if (markersRef.current[id] && markersRef.current[id].riderMarker) {
              markersRef.current[id].riderMarker.setLngLat([currentLng, currentLat]);
            }
            
            if (progress < 1) {
              markersRef.current[id].animationFrame = requestAnimationFrame(animateMarker);
            } else {
              markersRef.current[id].animationFrame = null;
            }
          };
          
          markersRef.current[id].animationFrame = requestAnimationFrame(animateMarker);
        }
      } else {
        const popup = new maptilersdk.Popup({ offset: 25 }).setHTML(`
          <div style="color:#111;padding:6px;font-family:sans-serif;font-size:13px">
            <strong>${delivery.riderName || 'Rider'}</strong><br/>
            Order: #${String(id).slice(-6)}<br/>
            Status: ${delivery.status || 'Active'}
          </div>
        `);

        const el = document.createElement('div');
        el.style.cssText = 'width:28px;height:28px;background:#E53E3E;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:pointer';
        el.title = delivery.riderName || 'Rider';

        const riderMarker = new maptilersdk.Marker({ element: el })
          .setLngLat([rLng, rLat])
          .setPopup(popup)
          .addTo(map.current);
        log('rider marker created', id, rLng, rLat);

        let customerMarker = null;
        if (cLat && cLng) {
          const cEl = document.createElement('div');
          cEl.style.cssText = 'width:16px;height:16px;background:#48BB78;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)';
          customerMarker = new maptilersdk.Marker({ element: cEl })
            .setLngLat([cLng, cLat])
            .addTo(map.current);
          log('customer marker created', id, cLng, cLat);
        }

        markersRef.current[id] = { riderMarker, customerMarker, animationFrame: null };
      }
    });

    if (hasPoints && !hasFittedBoundsRef.current) {
      try {
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
        hasFittedBoundsRef.current = true;
      } catch {
        // ignore
      }
    }
  }, [deliveries, mapReady]);

  // Fetch Route for Selected Delivery
  useEffect(() => {
    let isMounted = true;
    const fetchSelectedRoute = async () => {
      if (!selectedDelivery) {
        setActiveRoute(null);
        return;
      }
      const rLat = selectedDelivery.riderLocation?.lat || selectedDelivery.tracking?.location?.lat;
      const rLng = selectedDelivery.riderLocation?.lng || selectedDelivery.tracking?.location?.lng;
      const cLat = selectedDelivery.customerLocation?.lat || selectedDelivery.deliveryAddress?.coordinates?.lat || selectedDelivery.deliveryAddress?.location?.coordinates?.[1];
      const cLng = selectedDelivery.customerLocation?.lng || selectedDelivery.deliveryAddress?.coordinates?.lng || selectedDelivery.deliveryAddress?.location?.coordinates?.[0];

      if (rLat && rLng && cLat && cLng) {
        try {
          const routeData = await getRoute([rLng, rLat], [cLng, cLat]);
          if (isMounted) {
            if (routeData) {
              setActiveRoute(routeData.geometry);
              setRouteError(false);
            } else {
              setActiveRoute(null);
              setRouteError(true);
            }
          }
        } catch (e) {
          log('Admin route fetch failed', e);
          if (isMounted) {
            setActiveRoute(null);
            setRouteError(true);
          }
        }
      } else {
        setActiveRoute(null);
        setRouteError(false);
      }
    };
    fetchSelectedRoute();
    return () => { isMounted = false; };
  }, [selectedDelivery]);

  // Render Route
  useEffect(() => {
    if (!map.current || !mapReady) return;

    if (activeRoute) {
      const sourceId = 'selected-route';
      const layerId = 'selected-route-line';

      if (map.current.getSource(sourceId)) {
        map.current.getSource(sourceId).setData(activeRoute);
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: activeRoute
        });
        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#1a73e8', // primary blue
            'line-width': 5,
            'line-opacity': 0.8
          }
        });
      }
    } else {
      if (map.current.getLayer('selected-route-line')) map.current.removeLayer('selected-route-line');
      if (map.current.getSource('selected-route')) map.current.removeSource('selected-route');
    }
  }, [activeRoute, mapReady]);

  if (mapError) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-100 text-center p-8" style={{ height: '580px' }}>
        <div>
          <p className="text-gray-500 font-semibold mb-1">Map unavailable</p>
          <p className="text-gray-400 text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '580px' }}>
      <div
        ref={mapContainer}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <span className="text-gray-400 text-sm">Loading map...</span>
        </div>
      )}

      {/* Route Error Fallback */}
      {routeError && selectedDelivery && (
        <div className="absolute top-4 right-4 z-10 bg-white shadow-md border border-yellow-200 rounded-md p-3 flex items-start max-w-xs animate-in fade-in slide-in-from-top-2">
          <div className="text-yellow-500 mr-2 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">Route Unavailable</h4>
            <p className="text-xs text-gray-600 mt-0.5">Live tracking active, but route unavailable.</p>
          </div>
        </div>
      )}
    </div>
  );
};
