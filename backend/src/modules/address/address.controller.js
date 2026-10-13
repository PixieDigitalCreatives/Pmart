'use strict';

const { Address, AddressLabel } = require('./address.model');
const { findServingShops } = require('../shop/shop.service');
const { env } = require('../../config/env');
const { z, phone, assertObjectId } = require('../../utils/validation');
const { parseLatLng } = require('../../utils/geo');
const { notFound, conflict, HttpError } = require('../../utils/http-error');

const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(''));

const addressSchema = z.object({
  label: z.enum(AddressLabel).default('OTHER'),
  recipientName: z.string().trim().min(1, 'Recipient name is required').max(100),
  recipientPhone: phone,
  houseNumber: optionalText(60),
  buildingName: optionalText(120),
  floor: optionalText(30),
  street: optionalText(200),
  area: optionalText(120),
  landmark: optionalText(120),
  city: z.string().trim().min(1, 'City is required').max(80),
  district: optionalText(80),
  state: z.string().trim().min(1, 'State is required').max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: optionalText(60),
  formattedAddress: optionalText(500),
  location: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
  deliveryInstructions: optionalText(300),
  isDefault: z.boolean().optional()
});

function toAddressFields(data) {
  const { lat, lng } = parseLatLng(data.location.coordinates[1], data.location.coordinates[0]);
  const { isDefault, ...rest } = data;
  return { ...rest, country: rest.country || 'India', location: { type: 'Point', coordinates: [lng, lat] } };
}

async function clearDefault(userId, exceptId) {
  const filter = { user: userId, isActive: true, isDefault: true };
  if (exceptId) filter._id = { $ne: exceptId };
  await Address.updateMany(filter, { $set: { isDefault: false } });
}

class AddressController {
  static async getAddresses(req, res) {
    const addresses = await Address.find({ user: req.user._id, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, data: addresses });
  }

  static async getAddressById(req, res) {
    assertObjectId(req.params.id, 'address id');
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id, isActive: true });
    if (!address) throw notFound('Address not found');
    res.json({ success: true, data: address });
  }

  static async createAddress(req, res) {
    const data = addressSchema.parse(req.body);
    const fields = toAddressFields(data);

    const duplicate = await Address.findOne({
      user: req.user._id,
      isActive: true,
      pincode: fields.pincode,
      houseNumber: fields.houseNumber || undefined,
      'location.coordinates': fields.location.coordinates
    });
    if (duplicate) throw conflict('This address is already saved', 'ADDRESS_EXISTS');

    const hasAny = await Address.exists({ user: req.user._id, isActive: true });
    const makeDefault = Boolean(data.isDefault) || !hasAny;
    if (makeDefault) await clearDefault(req.user._id);

    const address = await Address.create({ ...fields, user: req.user._id, isDefault: makeDefault, isActive: true });
    res.status(201).json({ success: true, data: address });
  }

  static async updateAddress(req, res) {
    assertObjectId(req.params.id, 'address id');
    const data = addressSchema.parse(req.body);
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id, isActive: true });
    if (!address) throw notFound('Address not found');

    if (data.isDefault && !address.isDefault) await clearDefault(req.user._id, address._id);
    address.set(toAddressFields(data));
    if (data.isDefault) address.isDefault = true;
    await address.save();
    res.json({ success: true, data: address });
  }

  static async deleteAddress(req, res) {
    assertObjectId(req.params.id, 'address id');
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id, isActive: true });
    if (!address) throw notFound('Address not found');

    const wasDefault = address.isDefault;
    address.isActive = false;
    address.isDefault = false;
    await address.save();

    if (wasDefault) {
      const next = await Address.findOne({ user: req.user._id, isActive: true }).sort({ createdAt: -1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }
    res.json({ success: true, message: 'Address deleted' });
  }

  static async setDefaultAddress(req, res) {
    assertObjectId(req.params.id, 'address id');
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id, isActive: true });
    if (!address) throw notFound('Address not found');
    if (!address.isDefault) {
      await clearDefault(req.user._id, address._id);
      address.isDefault = true;
      await address.save();
    }
    res.json({ success: true, data: address });
  }

  static async reverseGeocode(req, res) {
    const { lat, lng } = parseLatLng(req.body.lat, req.body.lng);
    if (!env.MAPTILER_API_KEY) {
      throw new HttpError(503, 'Address lookup is not configured on this server', 'GEOCODING_NOT_CONFIGURED');
    }

    const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${encodeURIComponent(env.MAPTILER_API_KEY)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let payload;
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`status ${response.status}`);
      payload = await response.json();
    } catch {
      throw new HttpError(502, 'Address lookup failed. Please enter the address manually.', 'GEOCODING_FAILED');
    } finally {
      clearTimeout(timeout);
    }

    const feature = payload && payload.features && payload.features[0];
    if (!feature) return res.json({ success: false, message: 'No address found for this location' });

    const context = feature.context || [];
    const fromContext = (prefix) => {
      const item = context.find((c) => c.id && c.id.startsWith(prefix));
      return item ? item.text || '' : '';
    };

    const rawPincode = fromContext('postal_code').replace(/\s+/g, '');
    const pincode = /^\d{6}$/.test(rawPincode) ? rawPincode : '';
    const locality = fromContext('place');
    const city = fromContext('municipality');
    const district = fromContext('subregion');
    const state = fromContext('region');
    const area = locality && locality !== city ? locality : '';
    const street = feature.text || '';
    const country = fromContext('country') || 'India';

    res.json({
      success: true,
      data: {
        street,
        area,
        city: city || locality || fromContext('county') || '',
        district,
        state,
        pincode,
        country,
        formattedAddress: [street, area, city, district, state && pincode ? `${state} - ${pincode}` : state, country].filter(Boolean).join(', '),
        addressFragment: feature.address || '',
        location: { lat, lng }
      }
    });
  }

  static async checkServiceability(req, res) {
    const point = parseLatLng(req.body.lat, req.body.lng);
    const shops = await findServingShops(point);
    const open = shops.filter(({ shop }) => shop.isAcceptingOrders);
    const serviceable = open.length > 0;
    res.json({
      success: true,
      data: {
        serviceable,
        nearestShop: serviceable ? { id: open[0].shop._id, name: open[0].shop.name, distanceKm: Number(open[0].distance.toFixed(1)) } : null,
        message: serviceable
          ? 'Delivery available'
          : shops.length > 0
            ? 'Our store serving this area is not accepting orders right now'
            : 'We do not deliver to this location yet'
      }
    });
  }
}

module.exports = { AddressController };
