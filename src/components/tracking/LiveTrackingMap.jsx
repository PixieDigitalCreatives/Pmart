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
  route = null
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({ rider: null, customer: null, hub: null });
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
        markersRef.current.rider.setLngLat([rLng, rLat]);
        log('rider marker moved', rLng, rLat);
      }
    }

    if (hasPoints) {
      try {
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 800 });
      } catch {
        // fitBounds can fail on single-point bounds — flyTo instead
        if (rLat && rLng) map.current.flyTo({ center: [rLng, rLat], zoom: 15 });
      }
    }
  }, [riderLocation, customerLocation, hubLocation, mapReady, riderName]);

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
        }, 'waterway'); // Insert below labels if possible, but 'waterway' might not exist, usually just add to top or below symbol layers
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
    </div>
  );
};
