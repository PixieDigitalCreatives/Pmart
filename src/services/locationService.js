import * as maptilersdk from '@maptiler/sdk';
import apiClient from './apiClient';

// Configure MapTiler API Key from env
if (import.meta.env.VITE_MAPTILER_API_KEY) {
  maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
}

export const locationService = {
  /**
   * Prompts the user for GPS permission and returns current position
   * @returns {Promise<{lat: number, lng: number, accuracy: number, timestamp: number}>}
   */
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let message = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location permission.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              message = 'The request to get user location timed out.';
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  },

  /**
   * Validates if coordinates are within valid Earth ranges
   */
  validateCoordinates: (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    if (isNaN(lat) || isNaN(lng)) return false;
    if (lat === 0 && lng === 0) return false; // Null Island is generally an error
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;
    return true;
  },

  /**
   * Autocomplete address search via backend provider
   * @param {string} query
   * @param {[number, number]} [biasCoords] - [lng, lat]
   * @returns {Promise<Array<{id: string, text: string, place_name: string, center: [number, number]}>>}
   */
  autocomplete: async (query, biasCoords) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (biasCoords && Array.isArray(biasCoords) && biasCoords.length === 2) {
        params.append('lng', biasCoords[0]);
        params.append('lat', biasCoords[1]);
      }
      const res = await apiClient.get(`/addresses/autocomplete?${params.toString()}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data.map((item) => ({
          id: item.id,
          text: item.primary,
          place_name: item.secondary || item.label,
          center: item.coordinates
        }));
      }
    } catch {
      // Fallback to client geocoder if backend autocomplete is unavailable
    }
    return [];
  },

  /**
   * Reverse geocodes coordinates to a readable address using MapTiler
   */
  reverseGeocode: async (lat, lng) => {
    if (!locationService.validateCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates for reverse geocoding');
    }

    try {
      // Use MapTiler SDK geocoding
      const result = await maptilersdk.geocoding.reverse([lng, lat]);
      
      if (result && result.features && result.features.length > 0) {
        // Extract address components from MapTiler response
        const feature = result.features[0];
        
        let houseNumber = '';
        let street = '';
        let area = '';
        let city = '';
        let state = '';
        let pincode = '';
        
        // MapTiler returns a context array containing the hierarchy
        const context = feature.context || [];
        
        // Find specific types
        for (const c of context) {
          if (c.id.startsWith('neighborhood') || c.id.startsWith('sublocality')) area = c.text;
          if (c.id.startsWith('city') || c.id.startsWith('municipality')) city = c.text;
          if (c.id.startsWith('state') || c.id.startsWith('region')) state = c.text;
          if (c.id.startsWith('postal_code')) pincode = c.text;
        }

        // If the feature itself is one of these types
        if (feature.place_type.includes('address')) {
          houseNumber = feature.address || '';
          street = feature.text || '';
        } else if (feature.place_type.includes('neighborhood')) {
          area = feature.text;
        } else if (feature.place_type.includes('poi')) {
          street = feature.text;
        }

        return {
          latitude: lat,
          longitude: lng,
          houseNumber,
          street,
          area,
          city,
          state,
          pincode,
          formattedAddress: feature.place_name || ''
        };
      }
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw new Error('Failed to resolve address from map coordinates');
    }
  },

  /**
   * Calculates straight line distance between two points in km (Haversine)
   */
  calculateDistanceKm: (lat1, lng1, lat2, lng2) => {
    if (!locationService.validateCoordinates(lat1, lng1) || !locationService.validateCoordinates(lat2, lng2)) {
      return null;
    }
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Number((R * c).toFixed(1));
  }
};
