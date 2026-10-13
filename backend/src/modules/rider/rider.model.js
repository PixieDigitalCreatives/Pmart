'use strict';

const mongoose = require('mongoose');

const RiderAvailability = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  BUSY: 'BUSY',
  OFFLINE: 'OFFLINE'
});

const VehicleType = Object.freeze(['Bike', 'Scooter', 'Electric Bike', 'Bicycle']);

const RiderProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleType: { type: String, enum: VehicleType, required: true },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    licenseNumber: { type: String, trim: true, uppercase: true, maxlength: 30 },
    // AVAILABLE/OFFLINE are set by the rider; BUSY is managed by the system while an order is assigned.
    availabilityStatus: { type: String, enum: Object.values(RiderAvailability), default: RiderAvailability.OFFLINE },
    currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    completedDeliveries: { type: Number, default: 0, min: 0 },
    lastLocation: {
      lat: { type: Number },
      lng: { type: Number },
      at: { type: Date }
    }
  },
  { timestamps: true }
);

RiderProfileSchema.index({ user: 1 }, { unique: true });
RiderProfileSchema.index({ availabilityStatus: 1 });

const RiderProfile = mongoose.model('RiderProfile', RiderProfileSchema);

const LOCATION_RETENTION_SECONDS = 7 * 24 * 60 * 60;

const RiderLocationSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
  accuracy: { type: Number },
  speed: { type: Number },
  heading: { type: Number },
  recordedAt: { type: Date, required: true }
});

RiderLocationSchema.index({ recordedAt: 1 }, { expireAfterSeconds: LOCATION_RETENTION_SECONDS });
RiderLocationSchema.index({ order: 1, recordedAt: -1 });
RiderLocationSchema.index({ rider: 1, recordedAt: -1 });

const RiderLocation = mongoose.model('RiderLocation', RiderLocationSchema);

module.exports = { RiderProfile, RiderLocation, RiderAvailability, VehicleType };
