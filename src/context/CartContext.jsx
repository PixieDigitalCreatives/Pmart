import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cartService, toCartItem } from '../services/cartService';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const MAX_QTY = 99;

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';

  const [items, setItems] = useState(() => cartService.getLocalCart());
  const [settings, setSettings] = useState(() => cartService.getCachedSettings());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const hydrated = useRef(false);
  const syncTimer = useRef(null);

  useEffect(() => {
    cartService.fetchSettings().then(setSettings).catch(() => {});
  }, []);

  // When a customer signs in, merge the guest cart into their saved cart once.
  useEffect(() => {
    hydrated.current = false;
    if (!isCustomer) return;
    let cancelled = false;
    (async () => {
      try {
        const server = await cartService.fetchCart();
        const local = cartService.getLocalCart();
        const merged = new Map(server.map((i) => [i.id, i]));
        local.forEach((i) => {
          const existing = merged.get(i.id);
          merged.set(i.id, existing ? { ...existing, quantity: Math.min(MAX_QTY, Math.max(existing.quantity, i.quantity)) } : i);
        });
        const mergedItems = [...merged.values()];
        const synced = mergedItems.length ? await cartService.syncCart(mergedItems) : [];
        if (!cancelled) setItems(synced || []);
      } catch {
        // Keep the local cart if the server is unreachable.
      } finally {
        hydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCustomer, user?.id]);

  // Persist locally on every change and push to the server (debounced) for customers.
  useEffect(() => {
    cartService.saveLocalCart(items);
    if (!isCustomer || !hydrated.current) return undefined;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        const synced = await cartService.syncCart(items);
        if (!synced) return;
        if (synced.length !== items.length) {
          setSyncNotice('Some items were removed because they are no longer available.');
          setItems(synced);
          return;
        }
        // Keep local quantities but adopt the store's current prices and stock.
        const byId = new Map(synced.map((i) => [i.id, i]));
        const changed = items.some((i) => {
          const s = byId.get(i.id);
          return !s || s.price !== i.price || s.stockCount !== i.stockCount;
        });
        if (changed) setItems((prev) => prev.map((i) => (byId.get(i.id) ? { ...byId.get(i.id), quantity: i.quantity } : i)));
      } catch {
        // Next change will retry.
      }
    }, 600);
    return () => clearTimeout(syncTimer.current);
  }, [items, isCustomer]);

  const addItem = useCallback((product, quantity = 1) => {
    const id = product._id || product.id;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i));
      }
      return [...prev, toCartItem(product, Math.min(MAX_QTY, quantity))];
    });
  }, []);

  const removeItem = useCallback((productId) => setItems((prev) => prev.filter((i) => i.id !== productId)), []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== productId));
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === productId ? { ...i, quantity: Math.min(MAX_QTY, quantity) } : i)));
  }, []);

  const getItemQuantity = useCallback((productId) => items.find((i) => i.id === productId)?.quantity || 0, [items]);

  const clearCart = useCallback(() => setItems([]), []);

  /** Reloads the cart from the server (e.g. after checkout reports unavailable items). */
  const refreshCart = useCallback(async () => {
    if (!isCustomer) return;
    try {
      setItems(await cartService.syncCart(items));
    } catch {
      // ignore
    }
  }, [isCustomer, items]);

  const billSummary = useMemo(() => cartService.calculateBill(items, settings), [items, settings]);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        totalUniqueItems: items.length,
        billSummary,
        settings,
        addItem,
        removeItem,
        updateQuantity,
        getItemQuantity,
        clearCart,
        refreshCart,
        isCartOpen,
        setIsCartOpen,
        syncNotice,
        clearSyncNotice: () => setSyncNotice('')
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
