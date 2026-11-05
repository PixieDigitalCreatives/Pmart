import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { TbLayoutDashboard as LayoutDashboard, TbUsers as Users, TbBuildingStore as Store, TbPackage as Package, TbStack2 as Layers, TbShoppingBag as ShoppingBag, TbCreditCard as CreditCard, TbReportAnalytics as FileBarChart, TbSettings as Settings, TbLogout as LogOut, TbShield as Shield, TbExternalLink as ExternalLink, TbMenu2 as Menu, TbX as X, TbNavigation as Navigation, TbPackageImport as PackagePlus, TbHistory as History, TbPhoto as ImageIcon, TbFileInvoice as ReceiptText, TbReceipt as Receipt, TbWallet as Wallet, TbChartBar as BarChart3 } from 'react-icons/tb';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import './AdminLayout.scss';

// `permission: null` = visible to all staff; `anyOf` = visible with any listed permission.
// `section` starts a labelled group in the sidebar.
const NAV = [
  { name: 'Overview', path: '/admin', icon: LayoutDashboard, permission: null },
  { section: 'In-store billing', name: 'New invoice', path: '/admin/billing/new', icon: ReceiptText, permission: 'invoices.create' },
  { name: 'Invoices', path: '/admin/billing/invoices', icon: Receipt, permission: 'invoices.read' },
  { name: 'Payment history', path: '/admin/billing/payments', icon: Wallet, permission: 'payments.read' },
  { name: 'Billing overview', path: '/admin/billing', icon: BarChart3, anyOf: ['invoices.read', 'payments.read'] },
  { section: 'Inventory', name: 'Products', path: '/admin/products', icon: Package, anyOf: ['catalog.manage', 'inventory.read'] },
  { name: 'Restock', path: '/admin/inventory/restock', icon: PackagePlus, permission: 'inventory.restock' },
  { name: 'Stock ledger', path: '/admin/inventory/ledger', icon: History, permission: 'inventory.read' },
  { name: 'Product images', path: '/admin/inventory/images', icon: ImageIcon, anyOf: ['inventory.read', 'images.verify'] },
  { name: 'Categories', path: '/admin/categories', icon: Layers, permission: 'catalog.manage' },
  { name: 'Inventory reports', path: '/admin/inventory/reports', icon: FileBarChart, permission: 'reports.read' },
  { section: 'Online orders', name: 'Live deliveries', path: '/admin/live-deliveries', icon: Navigation, permission: 'orders.read' },
  { name: 'Orders', path: '/admin/orders', icon: ShoppingBag, permission: 'orders.read' },
  { name: 'COD payments', path: '/admin/payments', icon: CreditCard, permission: 'reports.read' },
  { name: 'Order reports', path: '/admin/reports', icon: FileBarChart, permission: 'reports.read' },
  { section: 'Administration', name: 'Stores', path: '/admin/stores', icon: Store, permission: 'shops.manage' },
  { name: 'People', path: '/admin/users', icon: Users, anyOf: ['customers.read', 'riders.read', 'employees.manage'] },
  { name: 'Settings', path: '/admin/settings', icon: Settings, permission: 'settings.read' }
];

const allowed = (can) => (item) => (item.anyOf ? item.anyOf.some(can) : !item.permission || can(item.permission));

/** Nav items the user may see, each tagged with its section so headings show above the first visible item. */
function visibleNav(can) {
  let group = null;
  return NAV.map((item) => {
    if (item.section) group = item.section;
    return { ...item, group };
  }).filter(allowed(can));
}

export const AdminLayout = ({ children }) => {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visible = visibleNav(can);

  // A scan on a screen without its own scanner opens the product from the Products list (not while a dialog is open).
  useBarcodeScanner(
    (code) => {
      if (document.querySelector('.modal-overlay')) return;
      navigate(`/admin/products?scan=${encodeURIComponent(code)}`);
    },
    { enabled: can('catalog.manage') || can('inventory.read'), fallback: true }
  );

  return (
    <div className="admin-portal-wrapper">
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-head">
          <Link to="/admin" className="admin-brand">
            <img src="/Pmart.png" alt="PMart" className="admin-logo" />
            <div className="brand-meta">
              <span className="badge-tag">OPERATIONS</span>
              <span className="platform-name">Admin console</span>
            </div>
          </Link>
          <Button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </Button>
        </div>

        <nav className="admin-nav-list">
          {visible.map(({ name, path, icon: Icon, group }, i) => (
            <React.Fragment key={path}>
              {group && group !== visible[i - 1]?.group && <div className="admin-nav-section">{group}</div>}
              <NavLink to={path} end={path === '/admin' || path === '/admin/billing'} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Icon size={18} className="link-icon" />
                <span>{name}</span>
              </NavLink>
            </React.Fragment>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <Link to="/" className="foot-link">
            <ExternalLink size={14} />
            <span>View storefront</span>
          </Link>
          <div className="admin-profile-strip">
            <div className="avatar-shield">
              <Shield size={16} />
            </div>
            <div className="admin-info">
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role === 'ADMIN' ? 'Administrator' : 'Staff'}</div>
            </div>
            <Button
              className="logout-btn"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </aside>

      <div className="admin-main-container">
        <header className="admin-topbar">
          <div className="topbar-left">
            <Button className="mobile-toggle-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </Button>
          </div>
          <div className="topbar-right">
            <Link to="/account/change-password" className="text-sm">
              Change password
            </Link>
          </div>
        </header>

        <main className="admin-content-view">
          <ErrorBoundary fallbackMessage="An error occurred in the admin console.">{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
