import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import './LiveTrackingMap.scss';

const isDev = import.meta.env.DEV;
const log = (...args) => { if (isDev) console.log('[MAP LiveTracking]', ...args); };

// Check WebGL support
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

export const LiveTrackingMap = ({
  riderLocation,
  customerLocation,
  hubLocation,
  height = '420px',
  orderId = '',
  riderName = 'Rider',
  recenterTrigger = 0,
  route = null,
  routeError = false
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({ rider: null, customer: null, hub: null, animationFrame: null, hasFittedBounds: false });
  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

  // Initialize map once
  useEffect(() => {
    log('component mounted, container:', mapContainer.current);

    if (!hasWebGL()) {
      setMapError('Map rendering is unavailable in this browser (WebGL required).');
      return;
    }

    if (!apiKey || apiKey === 'YOUR_MAPTILER_KEY_HERE') {
      log('API key missing');
      setMapError('Map unavailable. API key not configured.');
      return;
    }

    if (map.current) return; // already initialized

    const container = mapContainer.current;
    if (!container) {
      log('Container ref is null — cannot init map');
      return;
    }

    const rect = container.getBoundingClientRect();
    log('container dimensions:', rect.width, 'x', rect.height);

    maptilersdk.config.apiKey = apiKey;
    log('API key present: true');
    log('creating map');

    try {
      map.current = new maptilersdk.Map({
        container,
        style: maptilersdk.MapStyle.STREETS_V2,
        center: [84.0156, 24.9589], // P-Mart Sasaram default
        zoom: 13,
      });

      log('map created');

      map.current.on('load', () => {
        log('style loaded — calling resize');
        map.current.resize();
        setMapReady(true);
      });

      map.current.on('style.error', (e) => {
        log('style error', e);
        setMapError('Map style failed to load. Check API key and network.');
      });

      map.current.on('error', (e) => {
        log('map error', e?.error?.message || e);
      });

    } catch (err) {
      log('map init exception:', err.message);
      setMapError('Map failed to initialize: ' + err.message);
    }

    // Handle window resize
    const onResize = () => {
      if (map.current) map.current.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (markersRef.current.animationFrame) {
        cancelAnimationFrame(markersRef.current.animationFrame);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
        log('map removed on unmount');
      }
    };
  }, [apiKey]);

  // Recenter trigger from parent
  useEffect(() => {
    if (recenterTrigger && map.current) {
      map.current.resize();
    }
  }, [recenterTrigger]);

  // Update markers when locations change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const bounds = new maptilersdk.LngLatBounds();
    let hasPoints = false;

    // ── HUB ──
    // hubLocation is a shop object or shop.address object: { coordinates: {lat, lng}, ... }
    const hLat = hubLocation?.address?.coordinates?.lat || hubLocation?.coordinates?.lat;
    const hLng = hubLocation?.address?.coordinates?.lng || hubLocation?.coordinates?.lng;
    if (hLat && hLng) {
      hasPoints = true;
      bounds.extend([hLng, hLat]);
      if (!markersRef.current.hub) {
        const el = document.createElement('div');
        el.style.cssText = 'width:20px;height:20px;background:#1a73e8;border-radius:4px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)';
        markersRef.current.hub = new maptilersdk.Marker({ element: el })
          .setLngLat([hLng, hLat])
          .setPopup(new maptilersdk.Popup({ offset: 25 }).setText('Hub: P-Mart'))
          .addTo(map.current);
        log('hub marker created', hLng, hLat);
      } else {
        markersRef.current.hub.setLngLat([hLng, hLat]);
        log('hub marker moved', hLng, hLat);
      }
    }

    // ── CUSTOMER ──
    // customerLocation is order.deliveryAddress: { coordinates: {lat, lng}, ... }
    const cLat = customerLocation?.coordinates?.lat;
    const cLng = customerLocation?.coordinates?.lng;
    if (cLat && cLng) {
      hasPoints = true;
      bounds.extend([cLng, cLat]);
      if (!markersRef.current.customer) {
        const el = document.createElement('div');
        el.style.cssText = 'width:22px;height:22px;background:#ea4335;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)';
        markersRef.current.customer = new maptilersdk.Marker({ element: el })
          .setLngLat([cLng, cLat])
          .setPopup(new maptilersdk.Popup({ offset: 25 }).setText('Customer Destination'))
          .addTo(map.current);
        log('customer marker created', cLng, cLat);
      } else {
        markersRef.current.customer.setLngLat([cLng, cLat]);
        log('customer marker moved', cLng, cLat);
      }
    }

    // ── RIDER ──
    // riderLocation comes from socket: { lat, lng }
    const rLat = riderLocation?.lat;
    const rLng = riderLocation?.lng;
    if (rLat && rLng) {
      hasPoints = true;
      bounds.extend([rLng, rLat]);
      if (!markersRef.current.rider) {
        const el = document.createElement('div');
        el.style.cssText = 'width:28px;height:28px;background:#34a853;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(52,168,83,0.6)';
        markersRef.current.rider = new maptilersdk.Marker({ element: el })
          .setLngLat([rLng, rLat])
          .setPopup(new maptilersdk.Popup({ offset: 25 }).setText(riderName))
          .addTo(map.current);
        log('rider marker created', rLng, rLat);
      } else {
        const startLngLat = markersRef.current.rider.getLngLat();
        const endLngLat = [rLng, rLat];
        
        // Only animate if position actually changed
        if (startLngLat.lng !== endLngLat[0] || startLngLat.lat !== endLngLat[1]) {
          if (markersRef.current.animationFrame) {
            cancelAnimationFrame(markersRef.current.animationFrame);
          }
          
          const startTime = performance.now();
          const duration = 1000;
          
          const animateMarker = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
            
            const currentLng = startLngLat.lng + (endLngLat[0] - startLngLat.lng) * easeProgress;
            const currentLat = startLngLat.lat + (endLngLat[1] - startLngLat.lat) * easeProgress;
            
            if (markersRef.current.rider) {
              markersRef.current.rider.setLngLat([currentLng, currentLat]);
            }
            
            if (progress < 1) {
              markersRef.current.animationFrame = requestAnimationFrame(animateMarker);
            } else {
              markersRef.current.animationFrame = null;
            }
          };
          
          markersRef.current.animationFrame = requestAnimationFrame(animateMarker);
        }
      }
    }

    if (hasPoints && (!markersRef.current.hasFittedBounds || recenterTrigger)) {
      try {
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
        markersRef.current.hasFittedBounds = true;
      } catch {
        // fitBounds can fail on single-point bounds — flyTo instead
        if (rLat && rLng) {
          map.current.flyTo({ center: [rLng, rLat], zoom: 15 });
          markersRef.current.hasFittedBounds = true;
        }
      }
    }
  }, [riderLocation, customerLocation, hubLocation, mapReady, riderName, recenterTrigger]);

  // Render Route
  useEffect(() => {
    if (!map.current || !mapReady) return;

    if (route) {
      const sourceId = 'route';
      const layerId = 'route-line';

      if (map.current.getSource(sourceId)) {
        map.current.getSource(sourceId).setData(route);
      } else {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: route
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
            'line-color': '#1a73e8',
            'line-width': 5,
            'line-opacity': 0.8
          }
        }); // Removed 'waterway' parameter which causes missing layer bug in MapTiler STREETS_V2
      }
    } else {
      if (map.current.getLayer('route-line')) map.current.removeLayer('route-line');
      if (map.current.getSource('route')) map.current.removeSource('route');
    }
  }, [route, mapReady]);

  if (mapError) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200 text-center p-6"
        style={{ height }}
      >
        <div>
          <p className="text-gray-500 font-medium mb-1">Map unavailable</p>
          <p className="text-gray-400 text-sm">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden shadow-sm pmart-live-tracking-map ${mapError ? 'error' : ''}`}
      style={{ 
        height: height, 
        minHeight: height,
        maxHeight: 'min(70dvh, 600px)', // Bounded fallback
        flexShrink: 0
      }}
    >
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
      {routeError && (
        <div className="absolute top-4 right-4 z-10 bg-white shadow-md border border-yellow-200 rounded-md p-3 flex items-start max-w-xs animate-in fade-in slide-in-from-top-2">
          <div className="text-yellow-500 mr-2 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">Route Unavailable</h4>
            <p className="text-xs text-gray-600 mt-0.5">Live tracking is active, but road directions cannot be generated at this time.</p>
          </div>
        </div>
      )}
    </div>
  );
};
