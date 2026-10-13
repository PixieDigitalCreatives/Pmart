'use strict';

const { badRequest } = require('./http-error');

/**
 * Validates a latitude/longitude pair and returns it as numbers.
 * Rejects non-numeric values, out-of-range values and the (0, 0) default.
 */
function parseLatLng(lat, lng) {
  const parsedLat = typeof lat === 'string' ? Number(lat) : lat;
  const parsedLng = typeof lng === 'string' ? Number(lng) : lng;

  if (typeof parsedLat !== 'number' || typeof parsedLng !== 'number' || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    throw badRequest('Coordinates must be valid numbers', 'INVALID_COORDINATES');
  }
  if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
    throw badRequest('Coordinates are out of range', 'INVALID_COORDINATES');
  }
  if (parsedLat === 0 && parsedLng === 0) {
    throw badRequest('Coordinates 0,0 are not a valid location', 'INVALID_COORDINATES');
  }
  return { lat: parsedLat, lng: parsedLng };
}

/** Great-circle distance in kilometres (haversine). */
function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

module.exports = { parseLatLng, distanceKm };
