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
      const shop = await Shop.create({ ...req.body, owner: (req.user as any)._id });
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
        // Prevent mass assignment
        delete req.body.owner;
        delete req.body.isActive;
        delete req.body.rating;
      }

      shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({ success: true, data: shop });
    } catch (error) {
      next(error);
    }
  }
}
