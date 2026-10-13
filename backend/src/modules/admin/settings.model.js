'use strict';

const mongoose = require('mongoose');

const SETTINGS_KEY = 'global';

const money = { type: Number, min: 0, max: 100000 };

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: SETTINGS_KEY, immutable: true },
    freeDeliveryThreshold: { ...money, default: 299 },
    baseDeliveryFee: { ...money, default: 15 },
    platformHandlingFee: { ...money, default: 5 },
    deliverySlaMinutes: { type: Number, min: 1, max: 600, default: 30 },
    lowStockThreshold: { type: Number, min: 0, max: 100000, default: 10 },
    supportPhone: { type: String, trim: true, default: '' },
    supportEmail: { type: String, trim: true, lowercase: true, default: '' }
  },
  { timestamps: true }
);

SettingsSchema.index({ key: 1 }, { unique: true });

/** Returns the single platform settings document, creating it with defaults on first use. */
SettingsSchema.statics.getSingleton = function getSingleton(session) {
  return this.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { upsert: true, new: true, setDefaultsOnInsert: true, session }
  );
};

const Settings = mongoose.model('Settings', SettingsSchema);

module.exports = { Settings };
