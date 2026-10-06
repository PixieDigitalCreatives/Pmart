import React from 'react';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './StickyMobileCart.scss';
import { Button } from '@/components/ui';

export const StickyMobileCart = () => {
  const { totalQuantity, billSummary, setIsCartOpen } = useCart();

  if (totalQuantity === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="sticky-mobile-cart"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Button
          className="sticky-cart-btn"
          onClick={() => setIsCartOpen(true)}
          aria-label="View Cart"
        >
          <div className="cart-meta">
            <div className="cart-badge-icon">
              <ShoppingBag size={18} />
              <span className="count">{totalQuantity}</span>
            </div>
            <div className="cart-cost">
              <span className="qty-label">{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</span>
              <span className="dot">•</span>
              <span className="total-amt">₹{billSummary.grandTotal}</span>
            </div>
          </div>

          <div className="cart-action">
            <span>View Cart</span>
            <ChevronRight size={16} />
          </div>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};
