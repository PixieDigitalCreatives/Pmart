import { Request, Response, NextFunction } from 'express';
import { Address } from './address.model';
import { Order } from '../order/order.model';
import axios from 'axios';

// A mock serviceability check logic based on distance to a point (or just always return true for now if configured)
const isLocationServiceable = (lat: number, lng: number): boolean => {
  // In a real app, check against polygon/zones in DB
  return true; 
};

export class AddressController {
  
  static async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await Address.find({ user: (req.user as any)._id, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
      res.json({ success: true, data: addresses });
    } catch (error) {
      next(error);
    }
  }

  static async getAddressById(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await Address.findOne({ _id: req.params.id, user: (req.user as any)._id, isActive: true });
      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }
      res.json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  }

  static async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      
      // Duplicate protection logic
      const { location, houseNumber, pincode, isDefault } = req.body;
      
      if (!location || !location.coordinates || location.coordinates.length !== 2) {
        return res.status(400).json({ success: false, message: 'Valid location coordinates are required' });
      }
      
      const lng = location.coordinates[0];
      const lat = location.coordinates[1];
      
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0)) {
        return res.status(400).json({ success: false, message: 'Invalid coordinates' });
      }

      // Enforce serviceability
      if (!isLocationServiceable(lat, lng)) {
        return res.status(400).json({ success: false, message: 'We do not currently deliver to this location' });
      }

      // Check for exact duplicate
      const duplicate = await Address.findOne({
        user: userId,
        isActive: true,
        pincode: pincode,
        houseNumber: houseNumber,
        'location.coordinates': { $all: [lng, lat] }
      });
      
      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Address already exists', data: duplicate });
      }

      if (isDefault) {
        await Address.updateMany({ user: userId, isActive: true }, { $set: { isDefault: false } });
      }

      const newAddress = new Address({
        ...req.body,
        user: userId,
        isActive: true
      });
      
      await newAddress.save();

      // If it's the first address, make it default automatically
      if (!isDefault) {
        const addressCount = await Address.countDocuments({ user: userId, isActive: true });
        if (addressCount === 1) {
          newAddress.isDefault = true;
          await newAddress.save();
        }
      }

      res.status(201).json({ success: true, data: newAddress });
    } catch (error) {
      next(error);
    }
  }

  static async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      
      if (req.body.isDefault) {
        await Address.updateMany({ user: userId, isActive: true, _id: { $ne: req.params.id } }, { $set: { isDefault: false } });
      }

      if (req.body.location && req.body.location.coordinates) {
        const lng = req.body.location.coordinates[0];
        const lat = req.body.location.coordinates[1];
        if (!isLocationServiceable(lat, lng)) {
          return res.status(400).json({ success: false, message: 'We do not currently deliver to this location' });
        }
      }

      delete req.body.user;
      const address = await Address.findOneAndUpdate(
        { _id: req.params.id, user: userId, isActive: true },
        { $set: req.body },
        { new: true, runValidators: true }
      );

      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      res.json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const address = await Address.findOne({ _id: req.params.id, user: userId, isActive: true });
      
      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      // Check if it's default
      const wasDefault = address.isDefault;
      
      address.isActive = false;
      address.isDefault = false;
      await address.save();

      // If it was default, assign default to another active address
      if (wasDefault) {
        const anotherAddress = await Address.findOne({ user: userId, isActive: true });
        if (anotherAddress) {
          anotherAddress.isDefault = true;
          await anotherAddress.save();
        }
      }

      res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async setDefaultAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)._id;
      const address = await Address.findOne({ _id: req.params.id, user: userId, isActive: true });
      
      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }

      // Atomic update logic
      // First, remove default from all
      await Address.updateMany({ user: userId, isActive: true }, { $set: { isDefault: false } });
      
      // Set the new default
      address.isDefault = true;
      await address.save();

      res.json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  }

  static async reverseGeocode(req: Request, res: Response, next: NextFunction) {
    try {
      const { lat, lng } = req.body;
      if (lat == null || lng == null) {
        return res.status(400).json({ success: false, message: 'lat and lng are required' });
      }

      const MAPTILER_KEY = process.env.MAPTILER_API_KEY || process.env.VITE_MAPTILER_API_KEY;
      if (!MAPTILER_KEY) {
        return res.status(500).json({ success: false, message: 'Geocoding service unavailable (Missing API Key)' });
      }
      
      const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}`;
      
      const response = await axios.get(url);
      
      if (!response.data || !response.data.features || response.data.features.length === 0) {
        return res.json({ success: false, message: 'Unable to reverse geocode' });
      }

      // The first feature is the most specific match (street/address level).
      const feature = response.data.features[0];
      const context: any[] = feature.context || [];

      // Helper to extract a value from the context array by id prefix.
      const getCtx = (prefix: string): string => {
        const item = context.find((c: any) => c.id && c.id.startsWith(prefix));
        return item ? (item.text || '') : '';
      };

      // Normalise pincode: strip spaces, validate 6-digit Indian format.
      const rawPincode = getCtx('postal_code');
      const cleanedPincode = rawPincode.replace(/\s+/g, '');
      const pincode = /^\d{6}$/.test(cleanedPincode) ? cleanedPincode : '';

      const street = feature.text || '';
      const addressFragment = feature.address || '';
      const locality = getCtx('place');            // e.g. "Greater Noida"
      const city = getCtx('municipality');          // e.g. "Noida" (has place_designation:"city")
      const county = getCtx('county');              // e.g. "Dadri"
      const district = getCtx('subregion');         // e.g. "Gautam Buddha Nagar"
      const state = getCtx('region');               // e.g. "Uttar Pradesh"
      const country = getCtx('country') || 'India';

      // Area = locality if different from city, to avoid duplication.
      const area = (locality && locality !== city) ? locality : '';

      // Build a meaningful formatted address from actual extracted fields.
      const fmtParts = [
        street,
        area,
        city,
        district,
        state ? (pincode ? `${state} - ${pincode}` : state) : '',
        country
      ].filter(Boolean);
      const formattedAddress = fmtParts.join(', ');

      const result = {
        street,
        area,
        city: city || locality || county || '',
        district,
        state,
        pincode,
        country,
        formattedAddress,
        addressFragment,
        location: {
          lat: Number(lat),
          lng: Number(lng)
        }
      };

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ success: false, message: 'Geocoding service error' });
    }
  }

  static async checkServiceability(req: Request, res: Response, next: NextFunction) {
    try {
      const { lat, lng } = req.body;
      if (lat == null || lng == null) {
        return res.status(400).json({ success: false, message: 'lat and lng are required' });
      }

      const serviceable = isLocationServiceable(lat, lng);
      
      res.json({ 
        success: true, 
        data: { 
          serviceable, 
          message: serviceable ? 'Delivery available' : 'Currently not delivering to this location' 
        } 
      });
    } catch (error) {
      next(error);
    }
  }
}
