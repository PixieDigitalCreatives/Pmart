/**
 * PMart Routing Service
 * Connects to OSRM (Open Source Routing Machine) public API to fetch real road geometries.
 */

/**
 * Fetch a driving route between two points.
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
    const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Routing API failed with status ${res.status}`);
    }
    const data = await res.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }
    
    const route = data.routes[0];
    return {
      geometry: route.geometry, // GeoJSON LineString { type: "LineString", coordinates: [[lng, lat], ...] }
      distanceMeters: route.distance,
      durationSeconds: route.duration
    };
  } catch (error) {
    console.error('[RoutingService] Failed to fetch route:', error);
    return null;
  }
};
