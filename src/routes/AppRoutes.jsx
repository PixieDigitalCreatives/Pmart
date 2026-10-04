import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { CustomerLayout } from '@/components/common/CustomerLayout';
import { ShopLayout } from '@/components/shop/ShopLayout';
import { RiderLayout } from '@/components/rider/RiderLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RoleGuard } from './RoleGuard';

// Customer Pages
import { HomePage } from '@/pages/customer/HomePage';
import { SearchPage } from '@/pages/customer/SearchPage';
import { CategoryPage } from '@/pages/customer/CategoryPage';
import { ProductDetailPage } from '@/pages/customer/ProductDetailPage';
import { CartPage } from '@/pages/customer/CartPage';
import { CheckoutPage } from '@/pages/customer/CheckoutPage';
import { OrdersPage } from '@/pages/customer/OrdersPage';
import { OrderTrackingPage } from '@/pages/customer/OrderTrackingPage';
import { ProfilePage } from '@/pages/customer/ProfilePage';
import { AddressesPage } from '@/pages/customer/AddressesPage';
import { OffersPage } from '@/pages/customer/OffersPage';
import { HelpPage } from '@/pages/customer/HelpPage';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { SetPasswordPage } from '@/pages/auth/SetPasswordPage';
import { RiderEnrollPage } from '@/pages/auth/RiderEnrollPage';

// Shop Pages
import { ShopDashboardPage } from '@/pages/shop/ShopDashboardPage';
import { ShopOrdersPage } from '@/pages/shop/ShopOrdersPage';
import { ShopOrderDetailPage } from '@/pages/shop/ShopOrderDetailPage';
import { ShopProductsPage } from '@/pages/shop/ShopProductsPage';
import { ShopProductNewPage } from '@/pages/shop/ShopProductNewPage';
import { ShopCategoriesPage } from '@/pages/shop/ShopCategoriesPage';
import { ShopRidersPage } from '@/pages/shop/ShopRidersPage';
import { ShopAnalyticsPage } from '@/pages/shop/ShopAnalyticsPage';
import { ShopSettingsPage } from '@/pages/shop/ShopSettingsPage';

// Rider Pages
import { RiderDashboardPage } from '@/pages/rider/RiderDashboardPage';
import { RiderOrdersPage } from '@/pages/rider/RiderOrdersPage';
import { RiderOrderDetailPage } from '@/pages/rider/RiderOrderDetailPage';
import { RiderHistoryPage } from '@/pages/rider/RiderHistoryPage';
import { RiderProfilePage } from '@/pages/rider/RiderProfilePage';
import { RiderOnboardingPage } from '@/pages/rider/RiderOnboardingPage';

// Admin Pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminLiveDeliveriesPage } from '@/pages/admin/AdminLiveDeliveriesPage';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';

import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Customer Routes with CustomerLayout */}
      <Route
        path="/"
        element={
          <CustomerLayout>
            <HomePage />
          </CustomerLayout>
        }
      />
      <Route
        path="/search"
        element={
          <CustomerLayout>
            <SearchPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/category/:slug"
        element={
          <CustomerLayout>
            <CategoryPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/product/:slug"
        element={
          <CustomerLayout>
            <ProductDetailPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/cart"
        element={
          <CustomerLayout>
            <CartPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/checkout"
        element={
          <RoleGuard allowedRoles={['CUSTOMER']}>
            <CustomerLayout>
              <CheckoutPage />
            </CustomerLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/orders"
        element={
          <RoleGuard allowedRoles={['CUSTOMER']}>
            <CustomerLayout>
              <OrdersPage />
            </CustomerLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <RoleGuard allowedRoles={['CUSTOMER']}>
            <CustomerLayout>
              <OrderTrackingPage />
            </CustomerLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/profile"
        element={
          <RoleGuard allowedRoles={['CUSTOMER']}>
            <CustomerLayout>
              <ProfilePage />
            </CustomerLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/addresses"
        element={
          <RoleGuard allowedRoles={['CUSTOMER']}>
            <CustomerLayout>
              <AddressesPage />
            </CustomerLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/offers"
        element={
          <CustomerLayout>
            <OffersPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/help"
        element={
          <CustomerLayout>
            <HelpPage />
          </CustomerLayout>
        }
      />

      {/* Authentication Routes */}
      <Route
        path="/login"
        element={<LoginPage />}
      />
      <Route
        path="/register"
        element={<RegisterPage />}
      />
      <Route
        path="/set-password"
        element={<SetPasswordPage />}
      />
      <Route
        path="/rider/enroll"
        element={<RiderEnrollPage />}
      />

      {/* Shop Owner Portal Routes */}
      <Route
        path="/shop"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopDashboardPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/orders"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopOrdersPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/orders/:id"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopOrderDetailPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/products"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopProductsPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/products/new"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopProductNewPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/products/:id"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopProductNewPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/categories"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopCategoriesPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/riders"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopRidersPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/analytics"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopAnalyticsPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/settings"
        element={
          <RoleGuard allowedRoles={['SHOP_OWNER', 'ADMIN']}>
            
            <ShopLayout>
              <ShopSettingsPage />
            </ShopLayout>
          </RoleGuard>
        }
      />

      {/* Delivery Rider Portal Routes */}
      <Route
        path="/rider/onboarding"
        element={
          <RoleGuard allowedRoles={['RIDER', 'ADMIN']}>
            
            <RiderOnboardingPage />
          </RoleGuard>
        }
      />
      <Route
        path="/rider"
        element={
          <RoleGuard allowedRoles={['RIDER', 'ADMIN']}>
            
            <RiderLayout>
              <RiderDashboardPage />
            </RiderLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/rider/orders"
        element={
          <RoleGuard allowedRoles={['RIDER', 'ADMIN']}>
            
            <RiderLayout>
              <RiderOrdersPage />
            </RiderLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/rider/orders/:id"
        element={
          <RoleGuard allowedRoles={['RIDER', 'ADMIN']}>
            
            <RiderLayout>
              <RiderOrderDetailPage />
            </RiderLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/rider/history"
        element={
          <RoleGuard allowedRoles={['RIDER', 'ADMIN']}>
            
            <RiderLayout>
              <RiderHistoryPage />
            </RiderLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/rider/profile"
        element={
          <RoleGuard allowedRoles={['RIDER', 'ADMIN']}>
            
            <RiderLayout>
              <RiderProfilePage />
            </RiderLayout>
          </RoleGuard>
        }
      />

      {/* Admin Portal Routes */}
      <Route
        path="/admin"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <AdminDashboardPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/live-deliveries"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <AdminLiveDeliveriesPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <AdminOrdersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/orders/:id"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <AdminOrdersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <AdminUsersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <AdminUsersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />

      <Route
        path="/admin/products"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <ShopProductsPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <ShopCategoriesPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <AdminPaymentsPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RoleGuard allowedRoles={['ADMIN']}>
            
            <AdminLayout>
              <AdminReportsPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RoleGuard allowedRoles={['admin']}>
            
            <AdminLayout>
              <AdminSettingsPage />
            </AdminLayout>
          </RoleGuard>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
