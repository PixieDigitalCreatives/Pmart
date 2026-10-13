import apiClient, { getAccessToken } from './apiClient';

const CART_STORAGE_KEY = 'pmart_cart_items';
const SETTINGS_STORAGE_KEY = 'pmart_settings';

const DEFAULT_SETTINGS = { freeDeliveryThreshold: 0, baseDeliveryFee: 0, platformHandlingFee: 0, supportPhone: '', supportEmail: '', otpLength: 4, googleSignIn: false };

/** Shapes an API product into a cart line. */
export const toCartItem = (product, quantity) => ({
  id: product._id || product.id,
  name: product.name,
  slug: product.slug,
  price: Number(product.price) || 0,
  mrp: Number(product.mrp) || Number(product.price) || 0,
  unit: product.unit,
  imageUrl: product.imageUrl,
  categorySlug: product.categorySlug,
  shop: product.shop?._id || product.shop,
  stockCount: product.stockCount,
  quantity
});

export const cartService = {
  getLocalCart() {
    try {
      const data = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data.filter((i) => i && i.id && i.quantity > 0) : [];
    } catch {
      return [];
    }
  },

  saveLocalCart(items) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage may be full or disabled; the in-memory cart still works.
    }
  },

  /** Replaces the server cart with the local one. Only customers have a server cart. */
  async syncCart(items) {
    if (!getAccessToken()) return null;
    const res = await apiClient.post('/cart/sync', { items: items.map((i) => ({ product: i.id, quantity: i.quantity })) });
    return (res.data.data.items || []).map((i) => toCartItem(i.product, i.quantity));
  },

  async fetchCart() {
    const res = await apiClient.get('/cart');
    return (res.data.data.items || []).map((i) => toCartItem(i.product, i.quantity));
  },

  async fetchSettings() {
    const res = await apiClient.get('/settings/public');
    const settings = { ...DEFAULT_SETTINGS, ...res.data.data };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
    return settings;
  },

  getCachedSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}') };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  /** Mirrors the server's checkout pricing so the customer sees what they will be charged. */
  calculateBill(items, settings) {
    const itemTotal = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
    const mrpTotal = items.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0);
    const hasItems = items.length > 0;
    const deliveryFee = !hasItems || itemTotal >= settings.freeDeliveryThreshold ? 0 : settings.baseDeliveryFee;
    const platformFee = hasItems ? settings.platformHandlingFee : 0;
    return {
      itemTotal,
      savings: Math.max(0, Math.round((mrpTotal - itemTotal) * 100) / 100),
      deliveryFee,
      platformFee,
      grandTotal: Math.round((itemTotal + deliveryFee + platformFee) * 100) / 100,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      amountToFreeDelivery: hasItems && deliveryFee > 0 ? Math.max(0, settings.freeDeliveryThreshold - itemTotal) : 0
    };
  }
};
