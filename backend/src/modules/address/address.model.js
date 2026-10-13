'use strict';

const mongoose = require('mongoose');

const AddressLabel = Object.freeze(['HOME', 'WORK', 'OTHER']);

const AddressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, enum: AddressLabel, default: 'OTHER' },
    recipientName: { type: String, required: true, trim: true, maxlength: 100 },
    recipientPhone: { type: String, required: true, trim: true },
    houseNumber: { type: String, trim: true, maxlength: 60 },
    buildingName: { type: String, trim: true, maxlength: 120 },
    floor: { type: String, trim: true, maxlength: 30 },
    street: { type: String, trim: true, maxlength: 200 },
    area: { type: String, trim: true, maxlength: 120 },
    landmark: { type: String, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    pincode: { type: String, required: true, trim: true, match: [/^\d{6}$/, 'Pincode must be 6 digits'] },
    country: { type: String, trim: true, default: 'India' },
    formattedAddress: { type: String, trim: true, maxlength: 500 },
    // GeoJSON point, coordinates are [lng, lat].
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (c) => Array.isArray(c) && c.length === 2 && c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90 && !(c[0] === 0 && c[1] === 0),
          message: 'location.coordinates must be [lng, lat] within range'
        }
      }
    },
    deliveryInstructions: { type: String, trim: true, maxlength: 300 },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

/** One-line address built from the fields the customer confirmed (geocoder text is only a suggestion). */
const formatAddress = (a) =>
  [a.houseNumber, a.buildingName, a.floor && `Floor ${a.floor}`, a.street, a.area, a.city, a.state && a.pincode ? `${a.state} - ${a.pincode}` : a.state || a.pincode]
    .map((p) => (typeof p === 'string' ? p.trim() : p))
    .filter(Boolean)
    .join(', ');

AddressSchema.pre('validate', function setFormattedAddress() {
  this.formattedAddress = formatAddress(this).slice(0, 500);
});

AddressSchema.index({ user: 1, isActive: 1, isDefault: -1, createdAt: -1 });
// At most one default among a user's active addresses.
AddressSchema.index(
  { user: 1 },
  { unique: true, name: 'one_default_address_per_user', partialFilterExpression: { isDefault: true, isActive: true } }
);

const Address = mongoose.model('Address', AddressSchema);

module.exports = { Address, AddressLabel, formatAddress };
