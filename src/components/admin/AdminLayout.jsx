import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import {
  TbLayoutDashboard as LayoutDashboard,
  TbUsers as Users,
  TbBuildingStore as Store,
  TbPackage as Package,
  TbStack2 as Layers,
  TbShoppingBag as ShoppingBag,
  TbCreditCard as CreditCard,
  TbReportAnalytics as FileBarChart,
  TbSettings as Settings,
  TbLogout as LogOut,
  TbExternalLink as ExternalLink,
  TbMenu2 as Menu,
  TbX as X,
  TbNavigation as Navigation,
  TbPackageImport as PackagePlus,
  TbHistory as History,
  TbPhoto as ImageIcon,
  TbFileInvoice as ReceiptText,
  TbReceipt as Receipt,
  TbWallet as Wallet,
  TbChartBar as BarChart3,
  TbShield as Shield,
  TbKeyboard as Keyboard
} from 'react-icons/tb';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useAdminShortcuts } from '@/hooks/useAdminShortcuts';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import './AdminLayout.scss';
import './ShortcutHelpModal.scss';

// `permission: null` = visible to all staff; `anyOf` = visible with any listed permission.
// `section` starts a labelled group in the sidebar.
const NAV = [
  { key: 'nav.overview', name: 'Overview', path: '/admin', icon: LayoutDashboard, permission: null },
  { sectionKey: 'section.billing', section: 'In-store billing', key: 'nav.billing', name: 'Billing overview', path: '/admin/billing', icon: BarChart3, anyOf: ['invoices.read', 'payments.read'], shortcut: 'Alt+H' },
  { key: 'nav.new_invoice', name: 'New invoice', path: '/admin/billing/new', icon: ReceiptText, permission: 'invoices.create', shortcut: 'F2' },
  { key: 'nav.invoice_history', name: 'Invoices', path: '/admin/billing/invoices', icon: Receipt, permission: 'invoices.read', shortcut: 'F7' },
  { key: 'nav.outstanding', name: 'Outstanding', path: '/admin/billing/outstandings', icon: CreditCard, anyOf: ['invoices.read', 'payments.read'], shortcut: 'F8' },
  { key: 'nav.customers', name: 'Customers', path: '/admin/customers', icon: Users, anyOf: ['invoices.create', 'invoices.read', 'customers.read'], shortcut: 'F6' },
  { key: 'nav.payments', name: 'Payment history', path: '/admin/billing/payments', icon: Wallet, permission: 'payments.read', shortcut: 'F9' },
  { sectionKey: 'section.inventory', section: 'Inventory', key: 'nav.products', name: 'Products', path: '/admin/products', icon: Package, anyOf: ['catalog.manage', 'inventory.read'], shortcut: 'F4' },
  { key: 'nav.add_stock', name: 'Restock', path: '/admin/inventory/restock', icon: PackagePlus, permission: 'inventory.restock', shortcut: 'F3' },
  { key: 'nav.stock', name: 'Stock ledger', path: '/admin/inventory/ledger', icon: History, permission: 'inventory.read' },
  { key: 'nav.product_images', name: 'Product images', path: '/admin/inventory/images', icon: ImageIcon, anyOf: ['inventory.read', 'images.verify'] },
  { key: 'nav.categories', name: 'Categories', path: '/admin/categories', icon: Layers, permission: 'catalog.manage' },
  { key: 'nav.inventory_reports', name: 'Inventory reports', path: '/admin/inventory/reports', icon: FileBarChart, permission: 'reports.read' },
  { sectionKey: 'section.online', section: 'Online orders', key: 'nav.live_deliveries', name: 'Live deliveries', path: '/admin/live-deliveries', icon: Navigation, permission: 'orders.read' },
  { key: 'nav.orders', name: 'Orders', path: '/admin/orders', icon: ShoppingBag, permission: 'orders.read' },
  { key: 'nav.cod_payments', name: 'COD payments', path: '/admin/payments', icon: CreditCard, permission: 'reports.read' },
  { key: 'nav.order_reports', name: 'Order reports', path: '/admin/reports', icon: FileBarChart, permission: 'reports.read', shortcut: 'F10' },
  { sectionKey: 'section.admin', section: 'Administration', key: 'nav.stores', name: 'Stores', path: '/admin/stores', icon: Store, permission: 'shops.manage' },
  { key: 'nav.people', name: 'People', path: '/admin/users', icon: Users, anyOf: ['customers.read', 'riders.read', 'employees.manage'] },
  { key: 'nav.settings', name: 'Settings', path: '/admin/settings', icon: Settings, permission: 'settings.read' }
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
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Global Marg ERP Keyboard Navigation Hook
  useAdminShortcuts({ onOpenHelp: () => setShowShortcuts(true) });

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
              <span className="badge-tag">PMART ERP</span>
              <span className="platform-name">{lang === 'hi' ? 'दुकान ईआरपी' : 'Admin console'}</span>
            </div>
          </Link>
          <Button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
            <X size={18} />
          </Button>
        </div>

        <div style={{ padding: '0 12px 10px 12px' }}>
          <LanguageSwitcher compact />
        </div>

        <nav className="admin-nav-list">
          {visible.map(({ key, name, path, icon: Icon, group, shortcut }, i) => (
            <React.Fragment key={path}>
              {group && group !== visible[i - 1]?.group && (
                <div className="admin-nav-section">
                  {group === 'In-store billing' ? (lang === 'hi' ? 'दुकान बिलिंग' : group) :
                   group === 'Inventory' ? (lang === 'hi' ? 'सामान एवं स्टॉक' : group) :
                   group === 'Online orders' ? (lang === 'hi' ? 'ऑनलाइन आर्डर' : group) :
                   group === 'Administration' ? (lang === 'hi' ? 'व्यवस्था' : group) : group}
                </div>
              )}
              <NavLink to={path} end={path === '/admin' || path === '/admin/billing'} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Icon size={18} className="link-icon" />
                <span>{key ? t(key, name) : name}</span>
                {shortcut && <kbd className="shortcut-kbd-badge">{shortcut}</kbd>}
              </NavLink>
            </React.Fragment>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <Link to="/" className="foot-link">
            <ExternalLink size={14} />
            <span>{lang === 'hi' ? 'दुकान देखें' : 'View storefront'}</span>
          </Link>
          <div className="admin-profile-strip">
            <div className="avatar-shield">
              <Shield size={16} />
            </div>
            <div className="admin-info">
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role === 'ADMIN' ? (lang === 'hi' ? 'मालिक / एडमिन' : 'Administrator') : (lang === 'hi' ? 'कर्मचारी' : 'Staff')}</div>
            </div>
            <Button
              className="logout-btn"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              title={lang === 'hi' ? 'लॉगआउट' : 'Sign out'}
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
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-shortcut-hint"
              onClick={() => setShowShortcuts(true)}
              title={lang === 'hi' ? 'कीबोर्ड शॉर्टकट (F1 या ? दबाएं)' : 'Keyboard Shortcuts (Press F1 or ?)'}
            >
              <Keyboard size={16} />
              <span>{lang === 'hi' ? 'शॉर्टकट [F1]' : 'Shortcuts [F1]'}</span>
            </button>
            <LanguageSwitcher />
            <Link to="/account/change-password" className="text-sm">
              {lang === 'hi' ? 'पासवर्ड बदलें' : 'Change password'}
            </Link>
          </div>
        </header>

        <main className="admin-content-view">
          <ErrorBoundary fallbackMessage="An error occurred in the admin console.">{children}</ErrorBoundary>
        </main>
      </div>

      {/* Marg ERP Style Keyboard Shortcuts Help Sheet */}
      <ShortcutHelpModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};
