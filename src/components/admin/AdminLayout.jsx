import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Users, Store, Package, Layers, ShoppingBag, CreditCard, FileBarChart, Settings, LogOut, Shield, ExternalLink, Menu, X, Navigation } from 'lucide-react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui';
import './AdminLayout.scss';

// `permission: null` = visible to all staff; `anyOf` = visible with any listed permission.
const NAV = [
  { name: 'Overview', path: '/admin', icon: LayoutDashboard, permission: null },
  { name: 'Live deliveries', path: '/admin/live-deliveries', icon: Navigation, permission: 'orders.read' },
  { name: 'Orders', path: '/admin/orders', icon: ShoppingBag, permission: 'orders.read' },
  { name: 'Stores', path: '/admin/stores', icon: Store, permission: 'shops.manage' },
  { name: 'Products', path: '/admin/products', icon: Package, permission: 'catalog.manage' },
  { name: 'Categories', path: '/admin/categories', icon: Layers, permission: 'catalog.manage' },
  { name: 'People', path: '/admin/users', icon: Users, anyOf: ['customers.read', 'riders.read', 'employees.manage'] },
  { name: 'Payments', path: '/admin/payments', icon: CreditCard, permission: 'reports.read' },
  { name: 'Reports', path: '/admin/reports', icon: FileBarChart, permission: 'reports.read' },
  { name: 'Settings', path: '/admin/settings', icon: Settings, permission: 'settings.read' }
];

export const AdminLayout = ({ children }) => {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visible = NAV.filter((item) => (item.anyOf ? item.anyOf.some(can) : !item.permission || can(item.permission)));

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
          {visible.map(({ name, path, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === '/admin'} className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
              <Icon size={18} className="link-icon" />
              <span>{name}</span>
            </NavLink>
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
