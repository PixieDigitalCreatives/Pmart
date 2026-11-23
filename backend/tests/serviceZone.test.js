'use strict';

const { startDb, stopDb, clearDb, createUser, createShop, NEAR, FAR } = require('./helpers');
const { Shop } = require('../src/modules/shop/shop.model');
const { ServiceZone } = require('../src/modules/shop/serviceZone.model');

beforeAll(startDb);
afterAll(stopDb);
afterEach(clearDb);

describe('ServiceZone model and spatial queries', () => {
  it('creates a service zone with GeoJSON Polygon and 2dsphere index', async () => {
    const owner = await createUser('SHOP_OWNER');
    const shop = await createShop(owner);

    // Bounding polygon roughly encompassing Sasaram central area around NEAR (84.0156, 24.9589)
    // GeoJSON polygon coordinates are [[[lng, lat], [lng, lat], ...]] with closed ring (first == last)
    const polygonCoordinates = [
      [
        [84.00, 24.94],
        [84.04, 24.94],
        [84.04, 24.98],
        [84.00, 24.98],
        [84.00, 24.94]
      ]
    ];

    const zone = await ServiceZone.create({
      name: 'Sasaram Central Zone',
      shop: shop._id,
      boundaries: {
        type: 'Polygon',
        coordinates: polygonCoordinates
      },
      isActive: true
    });

    expect(zone._id).toBeDefined();
    expect(zone.name).toBe('Sasaram Central Zone');
    expect(zone.boundaries.type).toBe('Polygon');

    // Test $geoIntersects containment with NEAR [84.0156, 24.9589]
    const matchedZone = await ServiceZone.findOne({
      isActive: true,
      boundaries: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: NEAR
          }
        }
      }
    });

    expect(matchedZone).not.toBeNull();
    expect(matchedZone._id.toString()).toBe(zone._id.toString());

    // Test FAR point [84.2, 25.1] is outside the polygon
    const farMatch = await ServiceZone.findOne({
      isActive: true,
      boundaries: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: FAR
          }
        }
      }
    });

    expect(farMatch).toBeNull();
  });

  it('rejects empty coordinates for service zone boundaries', async () => {
    const owner = await createUser('SHOP_OWNER');
    const shop = await createShop(owner);

    await expect(
      ServiceZone.create({
        name: 'Empty Zone',
        shop: shop._id,
        boundaries: {
          type: 'Polygon',
          coordinates: []
        }
      })
    ).rejects.toThrow();
  });
});

