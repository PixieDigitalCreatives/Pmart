import React, { useRef, useEffect, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { locationService } from '@/services/locationService';
import { MapPin, Navigation, Loader } from 'lucide-react';
import { Button } from '@/components/ui';

const isDev = import.meta.env.DEV;
const log = (...args) => { if (isDev) console.log('[MAP AddressMap]', ...args); };

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

// Default center is P-Mart Sasaram
const DEFAULT_LNG = 84.0156;
const DEFAULT_LAT = 24.9589;

export const AddressMap = ({
  onLocationSelect,
  initialLat = DEFAULT_LAT,
  initialLng = DEFAULT_LNG,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [mapError, setMapError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addressPreview, setAddressPreview] = useState('Drag pin or click map to select location');

  const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

  useEffect(() => {
    log('component mounted');

    if (!hasWebGL()) {
      setMapError('Map unavailable in this browser (WebGL required).');
      return;
    }

    if (!apiKey) {
      setMapError('Map service unavailable. API key not configured.');
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
        center: [initialLng, initialLat],
        zoom: 15,
      });

      log('map created');

      map.current.on('load', () => {
        log('style loaded — calling resize');
        map.current.resize();
        setMapReady(true);

        // Create draggable marker
        const el = document.createElement('div');
        el.style.cssText = 'width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:#ea4335;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));cursor:grab';
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>`;

        marker.current = new maptilersdk.Marker({ element: el, draggable: true })
          .setLngLat([initialLng, initialLat])
          .addTo(map.current);
        log('marker created at', initialLng, initialLat);

        marker.current.on('dragend', () => {
          const lngLat = marker.current.getLngLat();
          log('marker dragged to', lngLat.lng, lngLat.lat);
          updateLocation(lngLat.lat, lngLat.lng);
        });

        map.current.on('click', (e) => {
          log('map clicked at', e.lngLat.lng, e.lngLat.lat);
          marker.current.setLngLat(e.lngLat);
          updateLocation(e.lngLat.lat, e.lngLat.lng);
        });
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

    const onResize = () => { if (map.current) map.current.resize(); };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (map.current) {
        map.current.remove();
        map.current = null;
        log('map removed');
      }
    };
  }, [apiKey, initialLat, initialLng]);

  const updateLocation = async (lat, lng) => {
    setIsLoading(true);
    setAddressPreview('Resolving address...');
    try {
      const geoData = await locationService.reverseGeocode(lat, lng);
      if (geoData) {
        setAddressPreview(geoData.formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        if (onLocationSelect) onLocationSelect(geoData);
      }
    } catch {
      const preview = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddressPreview(preview);
      if (onLocationSelect) onLocationSelect({ latitude: lat, longitude: lng });
    } finally {
      setIsLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    if (!map.current || !marker.current) {
      setMapError('Map not ready yet. Please wait.');
      return;
    }
    setIsLoading(true);
    setMapError('');
    try {
      const pos = await locationService.getCurrentLocation();
      log('current location:', pos.lng, pos.lat);
      map.current.flyTo({ center: [pos.lng, pos.lat], zoom: 16 });
      marker.current.setLngLat([pos.lng, pos.lat]);
      await updateLocation(pos.lat, pos.lng);
    } catch (e) {
      setMapError(e.message || 'Location permission denied.');
    } finally {
      setIsLoading(false);
    }
  };

  if (mapError) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex flex-col items-center gap-2">
        <MapPin size={24} />
        <p className="text-sm font-medium text-center">{mapError}</p>
        <Button
          type="button"
          onClick={() => { setMapError(''); useCurrentLocation(); }}
          className="text-sm text-blue-600 underline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Map container — explicit height is critical for MapTiler */}
      <div style={{ position: 'relative', width: '100%', height: '260px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div
          ref={mapContainer}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Use Current Location button */}
        <Button
          type="button"
          onClick={useCurrentLocation}
          disabled={isLoading}
          style={{
            position: 'absolute', bottom: '12px', right: '12px', zIndex: 10,
            background: 'white', border: '1px solid #e5e7eb',
            borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)', cursor: isLoading ? 'wait' : 'pointer'
          }}
          title="Use my current location"
        >
          {isLoading ? <Loader size={16} className="animate-spin text-gray-500" /> : <Navigation size={16} className="text-blue-600" />}
        </Button>
        {/* Loading overlay */}
        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', zIndex: 5 }}>
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>Loading map...</span>
          </div>
        )}
      </div>
      {/* Address preview */}
      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 flex items-start gap-2">
        <MapPin size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
        <span>{isLoading ? 'Resolving address...' : addressPreview}</span>
      </div>
    </div>
  );
};
