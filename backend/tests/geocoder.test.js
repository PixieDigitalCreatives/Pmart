'use strict';

const { startDb, stopDb, clearDb, api, auth, createUser, createShop, NEAR, FAR } = require('./helpers');
const { getGeocoderProvider, MapTilerGeocoderAdapter, GeoapifyGeocoderAdapter, cleanPincode } = require('../src/modules/address/geocoder.provider');
const { ServiceZone } = require('../src/modules/shop/serviceZone.model');
const { env } = require('../src/config/env');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

describe('Geocoder Provider & Clean Pincode Utilities', () => {
  it('cleans and validates Indian pincodes', () => {
    expect(cleanPincode('821115')).toBe('821115');
    expect(cleanPincode(' 821 115 ')).toBe('821115');
    expect(cleanPincode('12345')).toBe('');
    expect(cleanPincode('abcdef')).toBe('');
    expect(cleanPincode(null)).toBe('');
  });

  it('defaults to MapTilerGeocoderAdapter when LOCATION_V2_ENABLED is false', () => {
    expect(env.LOCATION_V2_ENABLED).toBe(false);
    const provider = getGeocoderProvider();
    expect(provider).toBeInstanceOf(MapTilerGeocoderAdapter);
  });

  it('GeoapifyGeocoderAdapter parses reverse-geocode payload and preserves requested pin coordinates (Rule C)', async () => {
    const adapter = new GeoapifyGeocoderAdapter('test-key');
    const mockGeoapifyResponse = {
      results: [
        {
          formatted: 'Station Road, Sasaram, Bihar 821115, India',
          address_line1: 'Station Road',
          address_line2: 'Sasaram, Bihar 821115',
          housenumber: '12',
          street: 'Station Road',
          suburb: 'Gaurakshini',
          city: 'Sasaram',
          district: 'Rohtas',
          state: 'Bihar',
          postcode: '821115',
          country: 'India',
          lon: 84.015,
          lat: 24.958
        }
      ]
    };

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockGeoapifyResponse
    });

    try {
      const queryCoords = { lat: 24.9589, lng: 84.0156 };
      const res = await adapter.reverseGeocode(queryCoords);

      expect(res.success).toBe(true);
      expect(res.data.street).toBe('12 Station Road');
      expect(res.data.area).toBe('Gaurakshini');
      expect(res.data.city).toBe('Sasaram');
      expect(res.data.pincode).toBe('821115');
      // Rule C: coordinates must match the queried pin coordinates, NOT the geocoder's coordinates!
      expect(res.data.location).toEqual(queryCoords);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('GeoapifyGeocoderAdapter formats autocomplete results with GeoJSON [lng, lat] coordinates (Rule B)', async () => {
    const adapter = new GeoapifyGeocoderAdapter('test-key');
    const mockAutocomplete = {
      results: [
        {
          place_id: 'place_123',
          formatted: 'Sasaram Railway Station, Station Road, Sasaram',
          name: 'Sasaram Railway Station',
          address_line1: 'Sasaram Railway Station',
          address_line2: 'Station Road, Sasaram, Bihar 821115',
          lon: 84.0155,
          lat: 24.9582,
          city: 'Sasaram',
          state: 'Bihar',
          postcode: '821115'
        }
      ]
    };

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAutocomplete
    });

    try {
      const res = await adapter.autocomplete({ query: 'Sasaram', biasCoords: [84.0156, 24.9589] });
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      // Rule B: coordinates order in GeoJSON is [lon, lat]
      expect(res.data[0].coordinates).toEqual([84.0155, 24.9582]);
      expect(res.data[0].primary).toBe('Sasaram Railway Station');
      expect(res.data[0].pincode).toBe('821115');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('exposes autocomplete endpoint under /api/addresses/autocomplete', async () => {
    const customer = await createUser('CUSTOMER');
    const res = await api()
      .get('/api/addresses/autocomplete?q=Sasaram')
      .set(auth(customer));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('checks serviceability with polygon service zones when LOCATION_V2_ENABLED is true', async () => {
    const customer = await createUser('CUSTOMER');
    const owner = await createUser('SHOP_OWNER');
    const shop = await createShop(owner);

    // Create a service zone polygon encompassing NEAR [84.0156, 24.9589]
    await ServiceZone.create({
      name: 'Sasaram Express Zone',
      shop: shop._id,
      boundaries: {
        type: 'Polygon',
        coordinates: [
          [
            [84.00, 24.94],
            [84.04, 24.94],
            [84.04, 24.98],
            [84.00, 24.98],
            [84.00, 24.94]
          ]
        ]
      },
      isActive: true,
      estimatedDeliveryMinutes: 15
    });

    // Temporarily enable flag for this test
    const originalFlag = env.LOCATION_V2_ENABLED;
    env.LOCATION_V2_ENABLED = true;

    try {
      const nearRes = await api()
        .post('/api/addresses/serviceability')
        .set(auth(customer))
        .send({ lat: NEAR[1], lng: NEAR[0] });

      expect(nearRes.status).toBe(200);
      expect(nearRes.body.data.serviceable).toBe(true);
      expect(nearRes.body.data.nearestShop.name).toBe(shop.name);

      const farRes = await api()
        .post('/api/addresses/serviceability')
        .set(auth(customer))
        .send({ lat: FAR[1], lng: FAR[0] });

      expect(farRes.status).toBe(200);
      expect(farRes.body.data.serviceable).toBe(false);
    } finally {
      env.LOCATION_V2_ENABLED = originalFlag;
    }
  });
});

