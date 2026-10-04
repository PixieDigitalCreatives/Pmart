import apiClient from './apiClient';

const CART_STORAGE_KEY = 'pmart_cart_items';

export const cartService = {
  // Sync local cart to backend if logged in
  async syncCart(items) {
    const token = localStorage.getItem('pmart_auth_token');
    if (!token) return;
    try {
      const formattedItems = items.map(i => ({
        product: i.id,
        shop: i.shop,
        quantity: i.quantity,
        price: i.price
      }));
      await apiClient.post('/cart/sync', { items: formattedItems });
    } catch (e) {
      console.error('Failed to sync cart to backend', e);
      if (e.response?.data) {
        console.error('Backend sync error details:', JSON.stringify(e.response.data));
      }
    }
  },

  // Fetch cart from backend
  async fetchCart() {
    const token = localStorage.getItem('pmart_auth_token');
    if (!token) return this.getCart();
    try {
      const res = await apiClient.get('/cart');
      const cartData = res.data.data;
      if (cartData && Array.isArray(cartData.items)) {
        const items = cartData.items.map(i => {
          const p = i.product;
          return {
            id: p._id || p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            mrp: p.mrp || p.price,
            unit: p.unit,
            image: p.image,
            categorySlug: p.categorySlug,
            shop: p.shop || i.shop || null,
            quantity: i.quantity
          };
        });
        this.saveCartLocal(items);
        return items;
      }
      return this.getCart();
    } catch (e) {
      console.error('Failed to fetch cart', e);
      return this.getCart();
    }
  },

  // Synchronous for initial state
  getCart() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCartLocal(items) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  },

  // Called whenever cart changes
  saveCart(items) {
    this.saveCartLocal(items);
    this.syncCart(items);
  },

  async fetchSettings() {
    try {
      const res = await apiClient.get('/settings/public');
      if (res.data && res.data.data) {
        localStorage.setItem('pmart_settings', JSON.stringify(res.data.data));
        return res.data.data;
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
    return this.getSettings();
  },

  getSettings() {
    let settings = {
      freeDeliveryThreshold: 299,
      baseDeliveryFee: 15,
      platformHandlingFee: 5
    };
    
    try {
      const data = localStorage.getItem('pmart_settings');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          if (!isNaN(Number(parsed.freeDeliveryThreshold))) {
            settings.freeDeliveryThreshold = Number(parsed.freeDeliveryThreshold);
          }
          if (!isNaN(Number(parsed.baseDeliveryFee))) {
            settings.baseDeliveryFee = Number(parsed.baseDeliveryFee);
          }
          if (!isNaN(Number(parsed.platformHandlingFee))) {
            settings.platformHandlingFee = Number(parsed.platformHandlingFee);
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return settings;
  },

  calculateBill(items) {
    const settings = this.getSettings();
    
    const itemTotal = items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);
    
    const originalTotal = items.reduce((sum, item) => {
      const mrp = Number(item.mrp) || Number(item.price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (mrp * qty);
    }, 0);
    
    const savings = Math.max(0, originalTotal - itemTotal);

    let deliveryFee = settings.baseDeliveryFee;
    let platformFee = items.length > 0 ? settings.platformHandlingFee : 0;
    
    if (itemTotal >= settings.freeDeliveryThreshold || itemTotal === 0) {
      deliveryFee = 0;
    }
    
    const grandTotal = Math.max(0, itemTotal + deliveryFee + platformFee);

    return {
      itemTotal,
      originalTotal,
      savings,
      deliveryFee,
      platformFee,
      grandTotal
    };
  }
};
