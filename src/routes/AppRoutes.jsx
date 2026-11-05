import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { CustomerLayout } from '@/components/common/CustomerLayout';
import { ShopLayout } from '@/components/shop/ShopLayout';
import { RiderLayout } from '@/components/rider/RiderLayout';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RoleGuard } from './RoleGuard';

// Customer
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

// Auth
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ActivateAccountPage } from '@/pages/auth/ActivateAccountPage';
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage';

// Shared management pages (store owners and admin staff)
import { OrderManagePage } from '@/pages/shop/ShopOrderDetailPage';
import { ShopProductsPage } from '@/pages/shop/ShopProductsPage';
import { ShopProductNewPage } from '@/pages/shop/ShopProductNewPage';
import { ShopCategoriesPage } from '@/pages/shop/ShopCategoriesPage';

// Store owner
import { ShopDashboardPage } from '@/pages/shop/ShopDashboardPage';
import { ShopOrdersPage } from '@/pages/shop/ShopOrdersPage';
import { ShopRidersPage } from '@/pages/shop/ShopRidersPage';
import { ShopAnalyticsPage } from '@/pages/shop/ShopAnalyticsPage';
import { ShopSettingsPage } from '@/pages/shop/ShopSettingsPage';

// Rider
import { RiderDashboardPage } from '@/pages/rider/RiderDashboardPage';
import { RiderOrdersPage } from '@/pages/rider/RiderOrdersPage';
import { RiderOrderDetailPage } from '@/pages/rider/RiderOrderDetailPage';
import { RiderHistoryPage } from '@/pages/rider/RiderHistoryPage';
import { RiderProfilePage } from '@/pages/rider/RiderProfilePage';

// Admin
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminLiveDeliveriesPage } from '@/pages/admin/AdminLiveDeliveriesPage';
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminStoresPage } from '@/pages/admin/AdminStoresPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';

// Inventory and in-store billing (staff)
import { InventoryImportPage } from '@/pages/inventory/InventoryImportPage';
import { RestockPage } from '@/pages/inventory/RestockPage';
import { StockLedgerPage } from '@/pages/inventory/StockLedgerPage';
import { ImageReviewPage } from '@/pages/inventory/ImageReviewPage';
import { InventoryReportsPage } from '@/pages/inventory/InventoryReportsPage';
import { BillingDashboardPage } from '@/pages/billing/BillingDashboardPage';
import { CreateInvoicePage } from '@/pages/billing/CreateInvoicePage';
import { InvoicesPage } from '@/pages/billing/InvoicesPage';
import { InvoiceDetailPage } from '@/pages/billing/InvoiceDetailPage';
import { BillingPaymentsPage } from '@/pages/billing/BillingPaymentsPage';

const STAFF = ['ADMIN', 'EMPLOYEE'];

const customer = (page) => <CustomerLayout>{page}</CustomerLayout>;
const customerOnly = (page) => (
  <RoleGuard allowedRoles={['CUSTOMER']}>
    <CustomerLayout>{page}</CustomerLayout>
  </RoleGuard>
);
const shop = (page) => (
  <RoleGuard allowedRoles={['SHOP_OWNER']}>
    <ShopLayout>{page}</ShopLayout>
  </RoleGuard>
);
const rider = (page) => (
  <RoleGuard allowedRoles={['RIDER']}>
    <RiderLayout>{page}</RiderLayout>
  </RoleGuard>
);
const staff = (page, permission) => (
  <RoleGuard allowedRoles={STAFF} permission={permission}>
    <AdminLayout>{page}</AdminLayout>
  </RoleGuard>
);

export const AppRoutes = () => (
  <Routes>
    {/* Storefront */}
    <Route path="/" element={customer(<HomePage />)} />
    <Route path="/search" element={customer(<SearchPage />)} />
    <Route path="/category/:slug" element={customer(<CategoryPage />)} />
    <Route path="/product/:slug" element={customer(<ProductDetailPage />)} />
    <Route path="/cart" element={customer(<CartPage />)} />
    <Route path="/offers" element={customer(<OffersPage />)} />
    <Route path="/help" element={customer(<HelpPage />)} />
    <Route path="/checkout" element={customerOnly(<CheckoutPage />)} />
    <Route path="/orders" element={customerOnly(<OrdersPage />)} />
    <Route path="/orders/:id" element={customerOnly(<OrderTrackingPage />)} />
    <Route path="/profile" element={customerOnly(<ProfilePage />)} />
    <Route path="/addresses" element={customerOnly(<AddressesPage />)} />

    {/* Authentication */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/activate" element={<ActivateAccountPage />} />
    <Route
      path="/account/change-password"
      element={
        <RoleGuard>
          <ChangePasswordPage />
        </RoleGuard>
      }
    />

    {/* Store owner portal */}
    <Route path="/shop" element={shop(<ShopDashboardPage />)} />
    <Route path="/shop/orders" element={shop(<ShopOrdersPage />)} />
    <Route path="/shop/orders/:id" element={shop(<OrderManagePage backTo="/shop/orders" />)} />
    <Route path="/shop/products" element={shop(<ShopProductsPage basePath="/shop/products" />)} />
    <Route path="/shop/products/new" element={shop(<ShopProductNewPage basePath="/shop/products" />)} />
    <Route path="/shop/products/:id" element={shop(<ShopProductNewPage basePath="/shop/products" />)} />
    <Route path="/shop/riders" element={shop(<ShopRidersPage />)} />
    <Route path="/shop/analytics" element={shop(<ShopAnalyticsPage />)} />
    <Route path="/shop/settings" element={shop(<ShopSettingsPage />)} />

    {/* Rider portal */}
    <Route path="/rider" element={rider(<RiderDashboardPage />)} />
    <Route path="/rider/orders" element={rider(<RiderOrdersPage />)} />
    <Route path="/rider/orders/:id" element={rider(<RiderOrderDetailPage />)} />
    <Route path="/rider/history" element={rider(<RiderHistoryPage />)} />
    <Route path="/rider/profile" element={rider(<RiderProfilePage />)} />

    {/* Admin & staff portal (each page also checks its permission) */}
    <Route path="/admin" element={staff(<AdminDashboardPage />)} />
    <Route path="/admin/live-deliveries" element={staff(<AdminLiveDeliveriesPage />, 'orders.read')} />
    <Route path="/admin/orders" element={staff(<AdminOrdersPage />, 'orders.read')} />
    <Route path="/admin/orders/:id" element={staff(<OrderManagePage backTo="/admin/orders" />, 'orders.read')} />
    <Route path="/admin/users" element={staff(<AdminUsersPage />)} />
    <Route path="/admin/stores" element={staff(<AdminStoresPage />, 'shops.manage')} />
    <Route path="/admin/products" element={staff(<ShopProductsPage basePath="/admin/products" />, ['catalog.manage', 'inventory.read'])} />
    <Route path="/admin/products/new" element={staff(<ShopProductNewPage basePath="/admin/products" />, 'catalog.manage')} />
    <Route path="/admin/products/:id" element={staff(<ShopProductNewPage basePath="/admin/products" />, ['catalog.manage', 'inventory.read'])} />
    <Route path="/admin/inventory/import" element={staff(<InventoryImportPage />, 'catalog.import')} />
    <Route path="/admin/inventory/restock" element={staff(<RestockPage />, 'inventory.restock')} />
    <Route path="/admin/inventory/ledger" element={staff(<StockLedgerPage />, 'inventory.read')} />
    <Route path="/admin/inventory/images" element={staff(<ImageReviewPage />, ['inventory.read', 'images.verify'])} />
    <Route path="/admin/inventory/reports" element={staff(<InventoryReportsPage />, 'reports.read')} />
    <Route path="/admin/billing" element={staff(<BillingDashboardPage />, ['invoices.read', 'payments.read'])} />
    <Route path="/admin/billing/new" element={staff(<CreateInvoicePage />, 'invoices.create')} />
    <Route path="/admin/billing/invoices" element={staff(<InvoicesPage />, 'invoices.read')} />
    <Route path="/admin/billing/invoices/:id" element={staff(<InvoiceDetailPage />, 'invoices.read')} />
    <Route path="/admin/billing/payments" element={staff(<BillingPaymentsPage />, 'payments.read')} />
    <Route path="/admin/categories" element={staff(<ShopCategoriesPage />, 'catalog.manage')} />
    <Route path="/admin/payments" element={staff(<AdminPaymentsPage />, 'reports.read')} />
    <Route path="/admin/reports" element={staff(<AdminReportsPage />, 'reports.read')} />
    <Route path="/admin/settings" element={staff(<AdminSettingsPage />, 'settings.read')} />

    {/* Old links */}
    <Route path="/rider/enroll" element={<Navigate to="/activate" replace />} />
    <Route path="/set-password" element={<Navigate to="/account/change-password" replace />} />
    <Route path="/admin/customers" element={<Navigate to="/admin/users" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
