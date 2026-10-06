import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Store,
  Bike,
  Package,
  ShoppingBag,
  CreditCard,
  FileBarChart,
  Settings,
  LogOut,
  Search,
  Bell,
  Shield,
  ExternalLink,
  Menu,
  X,
  Navigation
} from 'lucide-react';
import './AdminLayout.scss';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { Input, Button } from '@/components/ui';

export const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminNav = [
    { name: 'Platform Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Live Deliveries', path: '/admin/live-deliveries', icon: Navigation },
    { name: 'All Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Catalog Governance', path: '/admin/products', icon: Package },
    { name: 'Payments & Settlement', path: '/admin/payments', icon: CreditCard },
    { name: 'Analytics & Reports', path: '/admin/reports', icon: FileBarChart },
    { name: 'System Settings', path: '/admin/settings', icon: Settings }
  ];

  return (
    <div className="admin-portal-wrapper">
      {/* Enterprise Sidebar */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-head">
          <Link to="/admin" className="admin-brand">
            <img src="/Pmart.png" alt="PMart Enterprise" className="admin-logo" />
            <div className="brand-meta">
              <span className="badge-tag">ENTERPRISE HQ</span>
              <span className="platform-name">Admin Console</span>
            </div>
          </Link>
          <Button className="mobile-close" onClick={() => setMobileMenuOpen(false)}>
            <X size={18} />
          </Button>
        </div>

        <nav className="admin-nav-list">
          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} className="link-icon" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-foot">
          <Link to="/" className="foot-link">
            <ExternalLink size={14} />
            <span>Storefront Front</span>
          </Link>

          <div className="admin-profile-strip">
            <div className="avatar-shield">
              <Shield size={16} />
            </div>
            <div className="admin-info">
              <div className="name">{user?.name || 'Ananya Saxena'}</div>
              <div className="role">Central Operations</div>
            </div>
            <Button
              className="logout-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="admin-main-container">
        {/* Top Header */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <Button className="mobile-toggle-btn" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </Button>
            <div className="admin-search-bar">
              <Search size={16} className="search-icon" />
              <Input
                type="text"
                placeholder="Global search orders, shops, users, transactions..."
              />
            </div>
          </div>

          <div className="topbar-right">
            <div className="system-health-badge">
              <span className="pulse-dot" />
              <span>Platform Operational</span>
            </div>

            <Button className="icon-notice-btn" aria-label="Alerts">
              <Bell size={18} />
              <span className="dot" />
            </Button>

            <div className="admin-user-pill">
              <span className="role-tag">Super Admin</span>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="admin-content-view">
          <ErrorBoundary fallbackMessage="An error occurred in the Admin Portal.">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
