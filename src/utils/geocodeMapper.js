/**
 * Canonical reverse-geocode mapper for MapTiler responses.
 *
 * MapTiler returns GeoJSON FeatureCollection. For a reverse-geocode query, the
 * first feature (`features[0]`) is the most specific match, and its `.context`
 * array provides hierarchical administrative data.
 *
 * Actual MapTiler `.context` id prefixes observed for Indian locations:
 *   postal_code.*   → pincode (e.g. "201 305")
 *   place.*         → locality/sub-place (e.g. "Greater Noida")
 *   municipality.*  → city (has place_designation:"city", e.g. "Noida")
 *   county.*        → tehsil/taluk (e.g. "Dadri")
 *   subregion.*     → district (e.g. "Gautam Buddha Nagar")
 *   region.*        → state (e.g. "Uttar Pradesh")
 *   country.*       → country (e.g. "India")
 *
 * Feature-level properties:
 *   .text           → street name (e.g. "Dadri Road")
 *   .address        → house/building fragment (e.g. "plot no.7, nsez phase 2")
 *   .place_name     → full formatted address string
 *   .center         → [lng, lat]
 */

/**
 * Helper to extract a value from the MapTiler context array by id prefix.
 */
const getContextValue = (context, idPrefix) => {
  if (!Array.isArray(context)) return '';
  const item = context.find(c => c.id && c.id.startsWith(idPrefix));
  return item ? (item.text || '') : '';
};

/**
 * Normalises a pincode string: strips spaces, validates 6-digit Indian format.
 * Returns the cleaned pincode or empty string if invalid.
 */
const normalisePincode = (raw) => {
  if (!raw) return '';
  const cleaned = raw.replace(/\s+/g, '');
  return /^\d{6}$/.test(cleaned) ? cleaned : '';
};

/**
 * Maps a raw MapTiler reverse-geocode JSON response into PMart's canonical
 * structured address object.
 *
 * @param {object} maptilerResponse - The full JSON response from MapTiler geocoding API.
 * @param {number} requestLng - The longitude that was queried (authoritative).
 * @param {number} requestLat - The latitude that was queried (authoritative).
 * @returns {object|null} Structured address object, or null if no features.
 */
export const mapReverseGeocodeResult = (maptilerResponse, requestLng, requestLat) => {
  if (
    !maptilerResponse ||
    !maptilerResponse.features ||
    maptilerResponse.features.length === 0
  ) {
    return null;
  }

  // The first feature is the most specific (street/address level).
  const feature = maptilerResponse.features[0];
  const context = feature.context || [];

  // Extract structured fields from the real response.
  const street = feature.text || '';
  const addressFragment = feature.address || ''; // house/building info if present
  const placeName = feature.place_name || '';

  // Administrative hierarchy from context.
  const postalCodeRaw = getContextValue(context, 'postal_code');
  const pincode = normalisePincode(postalCodeRaw);

  const locality = getContextValue(context, 'place');          // e.g. "Greater Noida"
  const city = getContextValue(context, 'municipality');       // e.g. "Noida"
  const county = getContextValue(context, 'county');           // e.g. "Dadri"
  const district = getContextValue(context, 'subregion');      // e.g. "Gautam Buddha Nagar"
  const state = getContextValue(context, 'region');            // e.g. "Uttar Pradesh"
  const country = getContextValue(context, 'country') || 'India';

  // Build area from locality; if locality equals city, leave area empty to avoid duplication.
  const area = (locality && locality !== city) ? locality : '';

  // Build a meaningful formatted address from actual extracted fields.
  const formattedParts = [
    street,
    area,
    city,
    district,
    state ? (pincode ? `${state} - ${pincode}` : state) : '',
    country
  ].filter(Boolean);
  const formattedAddress = formattedParts.join(', ');

  return {
    // Fields the geocoder may or may not provide — never fabricated.
    houseNumber: '',             // Geocoders rarely provide flat-level detail; left for user input.
    buildingName: '',            // Same — user enters this.
    floor: '',                   // Never available from geocoder.
    street: street,              // e.g. "Dadri Road"
    area: area,                  // e.g. "Greater Noida" (locality if different from city)
    landmark: '',                // Never available from geocoder; user enters.
    city: city || locality || county || '',  // Best available city-level value.
    district: district,          // e.g. "Gautam Buddha Nagar"
    state: state,                // e.g. "Uttar Pradesh"
    pincode: pincode,            // e.g. "201305"
    country: country,            // e.g. "India"
    formattedAddress: formattedAddress,
    latitude: requestLat,
    longitude: requestLng,
    // Raw reference data for debugging.
    _rawPlaceName: placeName,
    _rawAddressFragment: addressFragment
  };
};

/**
 * Maps a forward-geocode search result feature into the same canonical shape.
 * After selecting a search result, the coordinates from that result become
 * authoritative, and we extract address info from its context.
 *
 * @param {object} feature - A single GeoJSON feature from MapTiler forward geocoding.
 * @returns {object} Structured address object.
 */
export const mapSearchResultToAddress = (feature) => {
  if (!feature) return null;

  const [lng, lat] = feature.center || [0, 0];
  const context = feature.context || [];

  const street = feature.text || '';
  const placeName = feature.place_name || '';

  const postalCodeRaw = getContextValue(context, 'postal_code');
  const pincode = normalisePincode(postalCodeRaw);

  const locality = getContextValue(context, 'place');
  const city = getContextValue(context, 'municipality');
  const district = getContextValue(context, 'subregion');
  const state = getContextValue(context, 'region');
  const country = getContextValue(context, 'country') || 'India';

  const area = (locality && locality !== city) ? locality : '';

  const formattedParts = [
    street,
    area,
    city,
    district,
    state ? (pincode ? `${state} - ${pincode}` : state) : '',
    country
  ].filter(Boolean);
  const formattedAddress = formattedParts.join(', ');

  return {
    houseNumber: '',
    buildingName: '',
    floor: '',
    street: street,
    area: area,
    landmark: '',
    city: city || locality || '',
    district: district,
    state: state,
    pincode: pincode,
    country: country,
    formattedAddress: formattedAddress,
    latitude: lat,
    longitude: lng
  };
};
