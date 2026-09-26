import React from 'react';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';
import { MobileLocationStrip } from '@/components/common/MobileLocationStrip';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { StickyMobileCart } from '@/components/common/StickyMobileCart';
import { CartDrawer } from '@/components/common/CartDrawer';
import { LocationModal } from '@/components/common/LocationModal';
export const CustomerLayout = ({ children }) => {
  return (
    <div className="pmart-customer-layout">
      <MobileLocationStrip />
      <Header />
      <CartDrawer />
      <LocationModal />
      <main className="customer-main-content">
        {children}
      </main>
      <StickyMobileCart />
      <MobileBottomNav />
      <Footer />
    </div>
  );
};
