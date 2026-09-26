import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation as useRouteLocation, useSearchParams } from 'react-router-dom';
import { Search, MapPin, ShoppingBag, User, Tag, Package, ChevronDown, Menu, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import './Header.scss';

export const Header = () => {
  const { totalQuantity, billSummary, setIsCartOpen } = useCart();
  const { selectedLocation, setLocationModalOpen } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const routeLocation = useRouteLocation();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchInputRef = useRef(null);

  // Sync searchQuery with URL query parameter when on /search
  useEffect(() => {
    if (routeLocation.pathname === '/search') {
      const q = searchParams.get('q') || '';
      setSearchQuery(q);
      // Auto-focus top main search bar when on search page
      searchInputRef.current?.focus();
    }
  }, [routeLocation.pathname, searchParams]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (routeLocation.pathname === '/search') {
      navigate(val.trim() ? `/search?q=${encodeURIComponent(val.trim())}` : '/search', { replace: true });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  const handleSearchFocus = () => {
    if (routeLocation.pathname !== '/search') {
      navigate(searchQuery.trim() ? `/search?q=${encodeURIComponent(searchQuery.trim())}` : '/search');
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    if (routeLocation.pathname === '/search') {
      navigate('/search', { replace: true });
    }
    searchInputRef.current?.focus();
  };

  const isAccountOrOrders =
    routeLocation.pathname.startsWith('/profile') ||
    routeLocation.pathname.startsWith('/addresses') ||
    routeLocation.pathname.startsWith('/orders') ||
    routeLocation.pathname.startsWith('/account');

  return (
    <header className="pmart-header">
      <div className={`header-container ${isAccountOrOrders ? 'no-search' : ''}`}>
        {/* Left: Brand Logo & Delivery Location */}
        <div className="header-left">
          <Link to="/" className="brand-logo-link">
            <img src="/Pmart.png" alt="PMart — Grocery and More" className="pmart-logo-img" />
          </Link>

          <button
            className="location-selector-btn"
            onClick={() => setLocationModalOpen(true)}
            aria-label="Select delivery location"
          >
            <div className="location-pin-wrapper">
              <MapPin size={18} className="pin-icon" />
            </div>
            <div className="location-text">
              <div className="delivery-time-tag">
                <span className="bold-time">Express Delivery</span>
              </div>
              <div className="location-address">
                <span className="address-line">
                  {selectedLocation ? `${selectedLocation.tag}: ${selectedLocation.address.slice(0, 24)}...` : 'Select Location'}
                </span>
                <ChevronDown size={14} className="chevron-icon" />
              </div>
            </div>
          </button>
        </div>

        {/* Center: Search Bar (Hidden on Account and Orders pages) */}
        {!isAccountOrOrders && (
          <div className="header-search">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <Search size={18} className="search-icon" />
              <input
                ref={searchInputRef}
                id="header-main-search-input"
                type="text"
                className="search-input"
                placeholder="Search for groceries, milk, fruits, veggies and more..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={handleClear}
                >
                  <X size={15} />
                </button>
              )}
            </form>
          </div>
        )}

        {/* Right: Navigation Actions */}
        <div className="header-actions">
          <Link to="/offers" className="nav-action-link">
            <Tag size={18} />
            <span>Offers</span>
          </Link>

          <Link to="/orders" className="nav-action-link">
            <Package size={18} />
            <span>Orders</span>
          </Link>

          {/* User Profile */}
          <div className="profile-dropdown-wrapper">
            {isAuthenticated ? (
              <button
                className="profile-btn"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <div className="avatar-img-wrapper">
                  <User size={18} />
                </div>
                <span className="user-name">{user ? user.name.split(' ')[0] : 'Account'}</span>
                <ChevronDown size={13} />
              </button>
            ) : (
              <Link to="/login" className="login-link-btn">
                <User size={16} />
                <span>Login</span>
              </Link>
            )}

            {isProfileMenuOpen && (
              <div className="profile-menu">
                <div className="user-profile-header">
                  <div className="user-full-name">{user?.name}</div>
                  <div className="user-phone">{user?.phone}</div>
                </div>
                <div className="menu-divider" />
                <Link to="/profile" className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                  My Profile
                </Link>
                <Link to="/orders" className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                  Order History
                </Link>
                <Link to="/addresses" className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                  Saved Addresses
                </Link>
                <Link to="/help" className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                  Help & FAQs
                </Link>
                <div className="menu-divider" />
                <button
                  className="menu-item logout-btn"
                  onClick={() => {
                    logout();
                    setIsProfileMenuOpen(false);
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Cart CTA Button */}
          <button
            className={`cart-header-btn ${totalQuantity > 0 ? 'has-items' : ''}`}
            onClick={() => setIsCartOpen(true)}
            aria-label="View shopping cart"
          >
            <div className="cart-icon-container">
              <ShoppingBag size={20} />
              {totalQuantity > 0 && <span className="cart-badge">{totalQuantity}</span>}
            </div>
            <div className="cart-label-container">
              {totalQuantity > 0 ? (
                <>
                  <span className="cart-items-count">{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</span>
                  <span className="cart-total-amt">₹{billSummary.grandTotal}</span>
                </>
              ) : (
                <span className="my-cart-text">My Cart</span>
              )}
            </div>
          </button>
        </div>

        {/* Mobile menu toggle */}
        <div className="mobile-header-actions">
          <button
            className="cart-mobile-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open Cart"
          >
            <ShoppingBag size={22} />
            {totalQuantity > 0 && <span className="cart-badge">{totalQuantity}</span>}
          </button>
        </div>
      </div>
    </header>
  );
};
