'use strict';

const mongoose = require('mongoose');

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const ShopSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    phone: { type: String, trim: true },
    address: {
      street: { type: String, required: true, trim: true },
      area: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true, match: [/^\d{6}$/, 'Pincode must be 6 digits'] }
    },
    location: {
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 }
    },
    deliveryRadiusKm: { type: Number, min: 0.5, max: 50, default: 5 },
    openTime: { type: String, required: true, match: [TIME_REGEX, 'Use HH:MM (24h)'] },
    closeTime: { type: String, required: true, match: [TIME_REGEX, 'Use HH:MM (24h)'] },
    isActive: { type: Boolean, default: true },
    isAcceptingOrders: { type: Boolean, default: true },
    imageUrl: { type: String, trim: true }
  },
  { timestamps: true }
);

ShopSchema.index({ owner: 1 });
ShopSchema.index({ isActive: 1, name: 1 });

const Shop = mongoose.model('Shop', ShopSchema);

module.exports = { Shop, TIME_REGEX };
