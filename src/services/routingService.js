import api from './apiClient';

/**
 * Fetch a driving route between two points using the backend proxy cache.
 * 
 * @param {Array<Number>} origin - [lng, lat]
 * @param {Array<Number>} destination - [lng, lat]
 * @returns {Promise<Object|null>} { geometry: GeoJSON LineString, distanceMeters, durationSeconds }
 */
export const getRoute = async (origin, destination) => {
  if (!origin || !destination) return null;
  
  const [oLng, oLat] = origin;
  const [dLng, dLat] = destination;
  
  // Guard against invalid coordinates
  if (oLng === 0 && oLat === 0) return null;
  if (dLng === 0 && dLat === 0) return null;
  if (oLng === dLng && oLat === dLat) return null;

  try {
    const res = await api.get('/routing', {
      params: {
        origin: `${oLng},${oLat}`,
        destination: `${dLng},${dLat}`,
        profile: 'driving'
      }
    });

    if (res.data.success && res.data.data) {
      return res.data.data;
    }
    return null;
  } catch (error) {
    console.error('[RoutingService] Failed to fetch route from backend proxy:', error);
    return null;
  }
};
