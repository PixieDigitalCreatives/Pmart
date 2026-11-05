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
    supportEmail: { type: String, trim: true, lowercase: true, default: '' },
    // In-store billing. Tax is off until the business configures it; no GST rate is assumed.
    billing: {
      businessName: { type: String, trim: true, maxlength: 120, default: '' },
      businessAddress: { type: String, trim: true, maxlength: 300, default: '' },
      businessPhone: { type: String, trim: true, maxlength: 20, default: '' },
      gstin: { type: String, trim: true, uppercase: true, maxlength: 15, default: '' },
      invoicePrefix: { type: String, trim: true, uppercase: true, maxlength: 10, match: /^[A-Z0-9-]*$/, default: 'INV' },
      // NONE = non-GST invoice; EXCLUSIVE adds tax on top of prices; INCLUSIVE treats prices as tax-inclusive.
      taxMode: { type: String, enum: ['NONE', 'EXCLUSIVE', 'INCLUSIVE'], default: 'NONE' },
      // Used for products without their own tax rate; 0 until set.
      defaultTaxRate: { type: Number, min: 0, max: 100, default: 0 },
      taxLabel: { type: String, trim: true, maxlength: 20, default: 'GST' },
      gstSplit: { type: String, enum: ['NONE', 'CGST_SGST', 'IGST'], default: 'NONE' },
      roundTotal: { type: Boolean, default: false },
      // Days until an unpaid invoice is overdue (0 = due on the invoice date).
      paymentTermsDays: { type: Number, min: 0, max: 365, default: 0 },
      // When false, only users with inventory.negative_stock can bill below zero stock (per invoice).
      allowNegativeStock: { type: Boolean, default: false },
      invoiceFooter: { type: String, trim: true, maxlength: 300, default: '' }
    }
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
