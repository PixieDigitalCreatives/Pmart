'use strict';

const mongoose = require('mongoose');

const ServiceZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    boundaries: {
      type: {
        type: String,
        enum: ['Polygon', 'MultiPolygon'],
        required: true,
        default: 'Polygon'
      },
      coordinates: {
        type: Array,
        required: true,
        validate: {
          validator: function (coords) {
            return Array.isArray(coords) && coords.length > 0;
          },
          message: 'Service zone coordinates must be a non-empty array'
        }
      }
    },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    estimatedDeliveryMinutes: { type: Number, min: 5, max: 180, default: 20 },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

ServiceZoneSchema.index({ boundaries: '2dsphere' });
ServiceZoneSchema.index({ shop: 1, isActive: 1 });

const ServiceZone = mongoose.model('ServiceZone', ServiceZoneSchema);

module.exports = { ServiceZone };

