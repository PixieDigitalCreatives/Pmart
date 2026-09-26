import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { CustomerLayout } from '@/components/common/CustomerLayout';
import { ShopLayout } from '@/components/shop/ShopLayout';
import { RiderLayout } from '@/components/rider/RiderLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DemoRoleBar } from '@/components/common/DemoRoleBar';
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
import { VerifyOtpPage } from '@/pages/auth/VerifyOtpPage';

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

// Admin Pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminLiveDeliveriesPage } from '@/pages/admin/AdminLiveDeliveriesPage';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminShopsPage } from '@/pages/admin/AdminShopsPage';
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
          <CustomerLayout>
            <CheckoutPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/orders"
        element={
          <CustomerLayout>
            <OrdersPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <CustomerLayout>
            <OrderTrackingPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/profile"
        element={
          <CustomerLayout>
            <ProfilePage />
          </CustomerLayout>
        }
      />
      <Route
        path="/addresses"
        element={
          <CustomerLayout>
            <AddressesPage />
          </CustomerLayout>
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

      {/* Unified Authentication Routes */}
      <Route
        path="/login"
        element={
          <>
            <DemoRoleBar />
            <LoginPage />
          </>
        }
      />
      <Route
        path="/verify-otp"
        element={
          <>
            <DemoRoleBar />
            <VerifyOtpPage />
          </>
        }
      />

      {/* Shop Owner Portal Routes */}
      <Route
        path="/shop"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopDashboardPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/orders"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopOrdersPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/orders/:id"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopOrderDetailPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/products"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopProductsPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/products/new"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopProductNewPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/products/:id"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopProductNewPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/categories"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopCategoriesPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/riders"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopRidersPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/analytics"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopAnalyticsPage />
            </ShopLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/shop/settings"
        element={
          <RoleGuard allowedRoles={['shop_owner', 'admin']}>
            <DemoRoleBar />
            <ShopLayout>
              <ShopSettingsPage />
            </ShopLayout>
          </RoleGuard>
        }
      />

      {/* Delivery Rider Portal Routes */}
      <Route
        path="/rider"
        element={
          <RoleGuard allowedRoles={['rider', 'admin']}>
            <DemoRoleBar />
            <RiderLayout>
              <RiderDashboardPage />
            </RiderLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/rider/orders"
        element={
          <RoleGuard allowedRoles={['rider', 'admin']}>
            <DemoRoleBar />
            <RiderLayout>
              <RiderOrdersPage />
            </RiderLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/rider/orders/:id"
        element={
          <RoleGuard allowedRoles={['rider', 'admin']}>
            <DemoRoleBar />
            <RiderLayout>
              <RiderOrderDetailPage />
            </RiderLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/rider/history"
        element={
          <RoleGuard allowedRoles={['rider', 'admin']}>
            <DemoRoleBar />
            <RiderLayout>
              <RiderHistoryPage />
            </RiderLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/rider/profile"
        element={
          <RoleGuard allowedRoles={['rider', 'admin']}>
            <DemoRoleBar />
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
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminDashboardPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/live-deliveries"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminLiveDeliveriesPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminOrdersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/orders/:id"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminOrdersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminUsersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminUsersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/shops"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminShopsPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/riders"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminUsersPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/products"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <ShopProductsPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <ShopCategoriesPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
            <AdminLayout>
              <AdminPaymentsPage />
            </AdminLayout>
          </RoleGuard>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RoleGuard allowedRoles={['admin']}>
            <DemoRoleBar />
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
            <DemoRoleBar />
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
