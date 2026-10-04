import { Request, Response, NextFunction } from 'express';
import { Cart } from './cart.model';

export class CartController {
  static async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      let cart = await Cart.findOne({ user: (req.user as any)._id }).populate('items.product').populate('items.shop');
      
      if (cart) {
        const originalLength = cart.items.length;
        // Reconcile: remove items where product was not found (populated as null)
        cart.items = cart.items.filter(item => item.product != null);
        if (cart.items.length !== originalLength) {
          await cart.save();
        }
      }
      
      res.json({ success: true, data: cart || { items: [] } });
    } catch (error) {
      next(error);
    }
  }

  static async syncCart(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, message: 'Invalid items format' });
      }

      const { Product } = require('../catalog/catalog.model');
      const { Shop } = require('../shop/shop.model');
      const enrichedItems = [];
      
      for (const item of items) {
        if (!item.product || !item.quantity) continue;
        
        // 1. Validate Product exists and is active
        const product = await Product.findById(item.product).select('shop isActive');
        if (!product || !product.isActive) {
          return res.status(400).json({ success: false, message: 'Invalid or inactive product' });
        }

        // 2. Derive Shop purely from DB (do not trust frontend shop id)
        const shopId = product.shop;
        if (!shopId) {
          return res.status(400).json({ success: false, message: 'Product has no valid shop' });
        }

        // 3. Validate Shop exists and is active
        const shop = await Shop.findById(shopId).select('isActive');
        if (!shop || !shop.isActive) {
          return res.status(400).json({ success: false, message: 'Shop is invalid or inactive' });
        }

        enrichedItems.push({ ...item, shop: shopId });
      }

      const cart = await Cart.findOneAndUpdate(
        { user: (req.user as any)._id },
        { items: enrichedItems },
        { new: true, upsert: true }
      );
      
      const populated = await cart.populate('items.product');
      
      // Reconcile
      const originalLength = populated.items.length;
      populated.items = populated.items.filter(item => item.product != null);
      if (populated.items.length !== originalLength) {
        await Cart.updateOne({ _id: populated._id }, { items: populated.items });
      }
      
      res.json({ success: true, data: populated });
    } catch (error: any) {
      console.error('[SYNC_CART_ERROR]', error);
      res.status(500).json({ success: false, message: error.message, stack: error.stack });
    }
  }

  static async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
      await Cart.findOneAndDelete({ user: (req.user as any)._id });
      res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
      next(error);
    }
  }
}
