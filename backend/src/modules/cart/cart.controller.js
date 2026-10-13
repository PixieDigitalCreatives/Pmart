'use strict';

const mongoose = require('mongoose');
const { Cart } = require('./cart.model');
const { Product } = require('../catalog/catalog.model');
const { Shop } = require('../shop/shop.model');
const { z } = require('../../utils/validation');

const CART_PRODUCT_FIELDS = 'name slug brand unit price mrp discount stockCount imageUrl categorySlug shop isActive';

const syncSchema = z.object({
  items: z
    .array(
      z.object({
        product: z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid product id'),
        quantity: z.number().int().min(1).max(99)
      })
    )
    .max(100)
});

/** Drops items whose product is gone, archived, or sold by an inactive store. */
async function liveItems(items) {
  const ids = items.map((i) => i.product);
  const [products, activeShops] = await Promise.all([
    Product.find({ _id: { $in: ids }, isActive: true }).select(CART_PRODUCT_FIELDS).lean(),
    Shop.distinct('_id', { isActive: true })
  ]);
  const activeShopSet = new Set(activeShops.map(String));
  const byId = new Map(products.filter((p) => activeShopSet.has(String(p.shop))).map((p) => [String(p._id), p]));
  return items
    .filter((i) => byId.has(String(i.product)))
    .map((i) => ({ product: byId.get(String(i.product)), quantity: i.quantity }));
}

class CartController {
  static async getCart(req, res) {
    const cart = await Cart.findOne({ user: req.user._id }).lean();
    if (!cart) return res.json({ success: true, data: { items: [] } });

    const items = await liveItems(cart.items);
    if (items.length !== cart.items.length) {
      await Cart.updateOne({ _id: cart._id }, { $set: { items: items.map((i) => ({ product: i.product._id, quantity: i.quantity })) } });
    }
    res.json({ success: true, data: { items } });
  }

  /** Replaces the server-side cart with the client's cart, merging duplicate lines. */
  static async syncCart(req, res) {
    const { items } = syncSchema.parse(req.body);

    const merged = new Map();
    for (const item of items) {
      merged.set(item.product, Math.min(99, (merged.get(item.product) || 0) + item.quantity));
    }
    const valid = await liveItems([...merged.entries()].map(([product, quantity]) => ({ product, quantity })));

    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: valid.map((i) => ({ product: i.product._id, quantity: i.quantity })) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: { items: valid, removed: merged.size - valid.length } });
  }

  static async clearCart(req, res) {
    await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
    res.json({ success: true, message: 'Cart cleared' });
  }
}

module.exports = { CartController };
