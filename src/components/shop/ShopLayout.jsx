import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { shopService } from '@/services/shopService';
import { apiErrorMessage } from '@/services/apiClient';
import { LayoutDashboard, ShoppingBag, Package, Bike, BarChart3, Settings, LogOut, User, Menu, X, ExternalLink, AlertTriangle } from 'lucide-react';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui';
import './ShopLayout.scss';

const ShopContext = createContext({ shop: null, setShop: () => {}, reloadShop: () => {} });
/** The signed-in owner's store, shared by every page in the shop portal. */
export const useMyShop = () => useContext(ShopContext);

const NAV = [
  { name: 'Dashboard', path: '/shop', icon: LayoutDashboard },
  { name: 'Orders', path: '/shop/orders', icon: ShoppingBag },
  { name: 'Products', path: '/shop/products', icon: Package },
  { name: 'Riders', path: '/shop/riders', icon: Bike },
  { name: 'Analytics', path: '/shop/analytics', icon: BarChart3 },
  { name: 'Store settings', path: '/shop/settings', icon: Settings }
];

export const ShopLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shop, setShop] = useState(null);
  const [shopError, setShopError] = useState('');
  const [toggling, setToggling] = useState(false);

  const reloadShop = useCallback(() => {
    shopService
      .getMyShop()
      .then((s) => {
        setShop(s);
        setShopError('');
      })
      .catch((err) => setShopError(apiErrorMessage(err, 'Could not load your store.')));
  }, []);

  useEffect(reloadShop, [reloadShop]);

  const toggleAccepting = async () => {
    if (!shop || toggling) return;
    setToggling(true);
    try {
      setShop(await shopService.updateMyShop({ isAcceptingOrders: !shop.isAcceptingOrders }));
    } catch (err) {
      setShopError(apiErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  return (
    <ShopContext.Provider value={{ shop, setShop, reloadShop }}>
      <div className="shop-dashboard-layout">
        <aside className={`shop-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-brand">
            <Link to="/shop" className="brand-link">
              <img src="/Pmart.png" alt="PMart" className="shop-logo" />
              <div className="portal-tag">
                <span className="hub-badge">STORE</span>
                <span className="store-name">{shop?.name || '—'}</span>
              </div>
            </Link>
            <Button className="mobile-close-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={20} />
            </Button>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(({ name, path, icon: Icon }) => (
              <NavLink key={path} to={path} end={path === '/shop'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                <Icon size={18} className="link-icon" />
                <span className="link-label">{name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <Link to="/" className="customer-store-link">
              <ExternalLink size={15} />
              <span>View storefront</span>
            </Link>
            <div className="shop-user-profile">
              <div className="user-avatar">
                <User size={18} />
              </div>
              <div className="user-meta">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">Store owner</div>
              </div>
              <Button
                className="logout-icon-btn"
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

        <div className="shop-main-wrapper">
          <header className="shop-topbar">
            <div className="topbar-left">
              <Button className="hamburger-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                <Menu size={20} />
              </Button>
            </div>
            <div className="topbar-right">
              {shop && (
                <button type="button" className={`store-status-indicator ${shop.isAcceptingOrders ? '' : 'paused'}`} onClick={toggleAccepting} disabled={toggling} title="Click to change">
                  <span className="dot" />
                  <span className="status-label">{shop.isAcceptingOrders ? 'Accepting orders' : 'Orders paused'}</span>
                </button>
              )}
            </div>
          </header>

          <main className="shop-content-area">
            {shopError && (
              <div className="alert alert-error mb-4">
                <AlertTriangle size={16} />
                <span>{shopError}</span>
              </div>
            )}
            <ErrorBoundary fallbackMessage="An error occurred in the store portal.">{children}</ErrorBoundary>
          </main>
        </div>
      </div>
    </ShopContext.Provider>
  );
};
