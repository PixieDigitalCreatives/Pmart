'use strict';

const { env } = require('../../config/env');
const { HttpError } = require('../../utils/http-error');
const { logger } = require('../../utils/logger');

/**
 * Normalizes an Indian 6-digit PIN code.
 */
function cleanPincode(raw) {
  if (!raw) return '';
  const cleaned = String(raw).replace(/\s+/g, '');
  return /^\d{6}$/.test(cleaned) ? cleaned : '';
}

/**
 * MapTiler Geocoder Adapter (Baseline Provider)
 */
class MapTilerGeocoderAdapter {
  async reverseGeocode({ lat, lng }) {
    if (!env.MAPTILER_API_KEY) {
      throw new HttpError(503, 'Address lookup is not configured on this server', 'GEOCODING_NOT_CONFIGURED');
    }

    const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${encodeURIComponent(env.MAPTILER_API_KEY)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let payload;

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`status ${response.status}`);
      payload = await response.json();
    } catch (err) {
      logger.warn(`MapTiler reverse geocode error: ${err.message}`);
      throw new HttpError(502, 'Address lookup failed. Please enter the address manually.', 'GEOCODING_FAILED');
    } finally {
      clearTimeout(timeout);
    }

    const feature = payload && payload.features && payload.features[0];
    if (!feature) {
      return { success: false, message: 'No address found for this location' };
    }

    const context = feature.context || [];
    const fromContext = (prefix) => {
      const item = context.find((c) => c.id && c.id.startsWith(prefix));
      return item ? item.text || '' : '';
    };

    const pincode = cleanPincode(fromContext('postal_code'));
    const locality = fromContext('place');
    const city = fromContext('municipality');
    const district = fromContext('subregion');
    const state = fromContext('region');
    const area = locality && locality !== city ? locality : '';
    const street = feature.text || '';
    const country = fromContext('country') || 'India';

    return {
      success: true,
      data: {
        street,
        area,
        city: city || locality || fromContext('county') || '',
        district,
        state,
        pincode,
        country,
        formattedAddress: [street, area, city, district, state && pincode ? `${state} - ${pincode}` : state, country].filter(Boolean).join(', '),
        addressFragment: feature.address || '',
        location: { lat, lng }
      }
    };
  }

  async autocomplete({ query }) {
    if (!env.MAPTILER_API_KEY) {
      return { success: true, data: [] };
    }

    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${encodeURIComponent(env.MAPTILER_API_KEY)}&country=in&limit=5`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const payload = await response.json();
      const features = (payload && payload.features) || [];

      const results = features.map((f) => ({
        id: f.id,
        label: f.place_name || f.text,
        primary: f.text,
        secondary: (f.place_name || '').replace(f.text, '').replace(/^,\s*/, ''),
        coordinates: f.center || [0, 0] // [lng, lat]
      }));

      return { success: true, data: results };
    } catch (err) {
      logger.warn(`MapTiler autocomplete error: ${err.message}`);
      return { success: true, data: [] };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Geoapify Geocoder Adapter
 */
class GeoapifyGeocoderAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async reverseGeocode({ lat, lng }) {
    if (!this.apiKey) {
      logger.warn('Geoapify API key missing, falling back to MapTiler');
      return new MapTilerGeocoderAdapter().reverseGeocode({ lat, lng });
    }

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      apiKey: this.apiKey
    });

    const url = `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let payload;

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.status === 429) {
        logger.warn('Geoapify rate limit reached (429)');
        throw new HttpError(429, 'Location service rate limit reached. Please try again shortly.', 'RATE_LIMITED');
      }
      if (!response.ok) {
        logger.warn(`Geoapify returned status ${response.status}`);
        throw new Error(`status ${response.status}`);
      }
      payload = await response.json();
    } catch (err) {
      if (err instanceof HttpError) throw err;
      logger.warn(`Geoapify reverse geocode error: ${err.message}`);
      throw new HttpError(502, 'Address lookup failed. Please enter the address manually.', 'GEOCODING_FAILED');
    } finally {
      clearTimeout(timeout);
    }

    const results = payload && payload.results;
    if (!results || results.length === 0) {
      return { success: false, message: 'No address found for this location' };
    }

    const r = results[0];
    const pincode = cleanPincode(r.postcode);
    const street = [r.housenumber, r.street || r.road].filter(Boolean).join(' ') || r.name || '';
    const area = r.suburb || r.neighbourhood || r.district || '';
    const city = r.city || r.municipality || r.county || '';
    const district = r.district || r.state_district || '';
    const state = r.state || '';
    const country = r.country || 'India';

    return {
      success: true,
      data: {
        street,
        area,
        city,
        district,
        state,
        pincode,
        country,
        formattedAddress: r.formatted || [street, area, city, state && pincode ? `${state} - ${pincode}` : state, country].filter(Boolean).join(', '),
        addressFragment: r.address_line1 || '',
        location: { lat, lng } // Rule C: preserves exact queried pin coordinates!
      }
    };
  }

  async autocomplete({ query, biasCoords, limit = 5 }) {
    if (!this.apiKey) {
      return new MapTilerGeocoderAdapter().autocomplete({ query });
    }

    const params = new URLSearchParams({
      text: query,
      format: 'json',
      filter: 'countrycode:in',
      limit: String(limit),
      lang: 'en',
      apiKey: this.apiKey
    });

    if (biasCoords && Array.isArray(biasCoords) && biasCoords.length === 2) {
      // Geoapify bias proximity format is lon,lat
      params.append('bias', `proximity:${biasCoords[0]},${biasCoords[1]}`);
    }

    const url = `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        logger.warn(`Geoapify autocomplete status ${response.status}`);
        return { success: true, data: [] };
      }
      const payload = await response.json();
      const results = (payload && payload.results) || [];

      const mapped = results.map((r) => ({
        id: r.place_id || `${r.lon},${r.lat}`,
        label: r.formatted,
        primary: r.address_line1 || r.name || r.street || '',
        secondary: r.address_line2 || [r.city, r.state, r.postcode].filter(Boolean).join(', '),
        coordinates: [r.lon, r.lat], // GeoJSON [lng, lat]
        city: r.city || '',
        state: r.state || '',
        pincode: cleanPincode(r.postcode)
      }));

      return { success: true, data: mapped };
    } catch (err) {
      logger.warn(`Geoapify autocomplete error: ${err.message}`);
      return { success: true, data: [] };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Returns active geocoder adapter according to feature flag configuration.
 */
function getGeocoderProvider() {
  if (env.LOCATION_V2_ENABLED && env.GEOAPIFY_API_KEY) {
    return new GeoapifyGeocoderAdapter(env.GEOAPIFY_API_KEY);
  }
  return new MapTilerGeocoderAdapter();
}

module.exports = {
  getGeocoderProvider,
  MapTilerGeocoderAdapter,
  GeoapifyGeocoderAdapter,
  cleanPincode
};
