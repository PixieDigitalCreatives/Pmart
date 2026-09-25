const CART_STORAGE_KEY = 'pmart_cart_items';

export const cartService = {
  getCart() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCart(items) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  },

  calculateBill(items) {
    const itemTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const originalTotal = items.reduce((sum, item) => sum + ((item.mrp || item.price) * item.quantity), 0);
    const savings = originalTotal - itemTotal;

    // Delivery fee rule: Free above ₹299, else ₹15
    const deliveryFee = itemTotal >= 299 || itemTotal === 0 ? 0 : 15;
    const platformFee = items.length > 0 ? 5 : 0;
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
