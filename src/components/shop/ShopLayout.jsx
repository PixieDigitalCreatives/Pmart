import React, { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Archive,
  Bike,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  User,
  ChevronDown,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import './ShopLayout.scss';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export const ShopLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/shop', icon: LayoutDashboard },
    { name: 'Orders', path: '/shop/orders', icon: ShoppingBag, badge: '12' },
    { name: 'Products', path: '/shop/products', icon: Package },
    { name: 'Categories', path: '/shop/categories', icon: Layers },
    { name: 'Riders Fleet', path: '/shop/riders', icon: Bike },
    { name: 'Analytics', path: '/shop/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/shop/settings', icon: Settings }
  ];

  return (
    <div className="shop-dashboard-layout">
      {/* Sidebar */}
      <aside className={`shop-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <Link to="/shop" className="brand-link">
            <img src="/Pmart.png" alt="PMart" className="shop-logo" />
            <div className="portal-tag">
              <span className="hub-badge">DARKSTORE HUB</span>
              <span className="store-name">Noida Sector 62</span>
            </div>
          </Link>
          <button className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/shop'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <Icon size={18} className="link-icon" />
                <span className="link-label">{item.name}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <Link to="/" className="customer-store-link">
            <ExternalLink size={15} />
            <span>View Customer Store</span>
          </Link>

          <div className="shop-user-profile">
            <div className="user-avatar">
              <User size={18} />
            </div>
            <div className="user-meta">
              <div className="user-name">{user?.name || 'Manish Tyagi'}</div>
              <div className="user-role">Hub Manager</div>
            </div>
            <button
              className="logout-icon-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="shop-main-wrapper">
        {/* Top Navbar */}
        <header className="shop-topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="topbar-search">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search orders, SKU codes, customer mobile..."
              />
            </div>
          </div>

          <div className="topbar-right">
            <div className="store-status-indicator">
              <span className="dot online" />
              <span className="status-label">Store Online (Accepting Orders)</span>
            </div>

            <button className="notification-btn" aria-label="Notifications">
              <Bell size={18} />
              <span className="alert-dot" />
            </button>

            <div className="topbar-user-badge">
              <div className="avatar-circle">M</div>
              <span className="name">Sector 62 Hub</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="shop-content-area">
          <ErrorBoundary fallbackMessage="An error occurred in the Shop Dashboard.">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
