'use strict';

const { Shop } = require('./shop.model');
const { ServiceZone } = require('./serviceZone.model');
const { distanceKm } = require('../../utils/geo');
const { env } = require('../../config/env');

/** Returns active shops whose delivery radius covers the point, nearest first. */
async function findServingShops({ lat, lng }) {
  // If Location V2 is enabled, first check polygon service zones
  if (env.LOCATION_V2_ENABLED) {
    try {
      const matchingZones = await ServiceZone.find({
        isActive: true,
        boundaries: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          }
        }
      })
        .populate('shop')
        .sort({ priority: -1 })
        .lean();

      if (matchingZones.length > 0) {
        const activeZones = matchingZones.filter((z) => z.shop && z.shop.isActive);
        if (activeZones.length > 0) {
          return activeZones
            .map((z) => ({
              shop: z.shop,
              distance: distanceKm({ lat, lng }, z.shop.location),
              serviceZone: { id: z._id, name: z.name, estimatedDeliveryMinutes: z.estimatedDeliveryMinutes }
            }))
            .sort((a, b) => a.distance - b.distance);
        }
      }
    } catch {
      // Fall through to circular radius check on any spatial query exception
    }
  }

  // Baseline circular radius serviceability
  const shops = await Shop.find({ isActive: true }).select('name location deliveryRadiusKm isAcceptingOrders').lean();
  return shops
    .map((shop) => ({ shop, distance: distanceKm({ lat, lng }, shop.location) }))
    .filter(({ shop, distance }) => distance <= (shop.deliveryRadiusKm || 0))
    .sort((a, b) => a.distance - b.distance);
}

/** Returns ids of the shops owned by the given user. */
async function ownedShopIds(userId) {
  const shops = await Shop.find({ owner: userId }).select('_id').lean();
  return shops.map((s) => s._id);
}

module.exports = { findServingShops, ownedShopIds };
