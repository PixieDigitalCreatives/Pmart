'use strict';

const { Shop } = require('./shop.model');
const { distanceKm } = require('../../utils/geo');

/** Returns active shops whose delivery radius covers the point, nearest first. */
async function findServingShops({ lat, lng }) {
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
