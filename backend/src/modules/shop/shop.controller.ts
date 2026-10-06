import { Request, Response, NextFunction } from 'express';
import { Shop } from './shop.model';

export class ShopController {
  static async getShops(req: Request, res: Response, next: NextFunction) {
    try {
      const shops = await Shop.find({ isActive: true });
      res.json({ success: true, data: shops });
    } catch (error) {
      next(error);
    }
  }

  static async getShopById(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
      res.json({ success: true, data: shop });
    } catch (error) {
      next(error);
    }
  }

  // Admin / Shop Owner routes
  static async createShop(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      const { name, address, openTime, closeTime } = req.body;
      const shop = await Shop.create({ name, address, openTime, closeTime, owner: (req.user as any)._id });
      res.status(201).json({ success: true, data: shop });
    } catch (error) {
      next(error);
    }
  }

  static async updateShop(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });

      let shop = await Shop.findById(req.params.id);
      if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

      // Role isolation
      if (req.user.role === 'SHOP_OWNER') {
        if (shop.owner.toString() !== (req.user as any)._id.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not own this shop' });
        }
      }

      const { name, address, openTime, closeTime } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (openTime !== undefined) updateData.openTime = openTime;
      if (closeTime !== undefined) updateData.closeTime = closeTime;

      // Admin can update isActive
      if (req.user.role === 'ADMIN' && req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive;
      }

      shop = await Shop.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
      res.json({ success: true, data: shop });
    } catch (error) {
      next(error);
    }
  }
}
