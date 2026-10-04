import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartService } from '../services/cartService';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => cartService.getCart());
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    cartService.fetchSettings(); // fetch settings first
    cartService.fetchCart().then(backendItems => {
      if (backendItems && backendItems.length > 0) {
        setItems(backendItems);
      }
    });
  }, []);

  useEffect(() => {
    cartService.saveCart(items);
  }, [items]);

  const addItem = (product, quantity = 1) => {
    setItems((prevItems) => {
      const existing = prevItems.find((i) => i.id === product.id);
      if (existing) {
        return prevItems.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prevItems,
        {
          id: product._id || product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          mrp: product.mrp || product.price,
          unit: product.unit,
          image: product.imageUrl || product.image,
          categorySlug: product.categorySlug,
          shop: product.shop?._id || product.shop?.id || product.shop,
          quantity: quantity
        }
      ];
    });
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === productId ? { ...i, quantity: newQty } : i))
    );
  };

  const getItemQuantity = (productId) => {
    const found = items.find((i) => i.id === productId);
    return found ? found.quantity : 0;
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const billSummary = cartService.calculateBill(items);

  const refreshCart = async () => {
    const backendItems = await cartService.fetchCart();
    if (backendItems) {
      setItems(backendItems);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        totalUniqueItems: items.length,
        billSummary,
        addItem,
        removeItem,
        updateQuantity,
        getItemQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        refreshCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
