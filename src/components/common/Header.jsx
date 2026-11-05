import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation as useRouteLocation, useSearchParams } from 'react-router-dom';
import { TbSearch as Search, TbMapPin as MapPin, TbShoppingCart as ShoppingCart, TbUser as User, TbTag as Tag, TbPackage as Package, TbChevronDown as ChevronDown, TbX as X } from 'react-icons/tb';
import { useCart } from '@/context/CartContext';
import { useLocation } from '@/context/LocationContext';
import { useAuth, homeForRole } from '@/context/AuthContext';
import { getFullAddressString } from '@/utils/addressUtils';
import './Header.scss';
import { Input, Button } from '@/components/ui';

const shortAddress = (loc) => {
  const full = getFullAddressString(loc);
  return full.length > 30 ? full.slice(0, 30) + '…' : full;
};

export const Header = () => {
  const { totalQuantity, billSummary, setIsCartOpen } = useCart();
  const { selectedLocation, setLocationModalOpen } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const routeLocation = useRouteLocation();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);
  const portalPath = user && user.role !== 'CUSTOMER' ? homeForRole(user.role) : null;

  // Close the profile menu on outside click or route change.
  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;
    const onDown = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [isProfileMenuOpen]);
  useEffect(() => setIsProfileMenuOpen(false), [routeLocation.pathname]);

  // Sync searchQuery with URL query parameter when on /search
  useEffect(() => {
    if (routeLocation.pathname === '/search') {
      const q = searchParams.get('q') || '';
      setSearchQuery(q);
      // Auto-focus top main search bar when on search page
      searchInputRef.current?.focus();
    }
  }, [routeLocation.pathname, searchParams]);

  const searchDebounceRef = useRef(null);
  useEffect(() => {
    return () => clearTimeout(searchDebounceRef.current);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (routeLocation.pathname === '/search') {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        navigate(val.trim() ? `/search?q=${encodeURIComponent(val.trim())}` : '/search', { replace: true });
      }, 250);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    clearTimeout(searchDebounceRef.current);
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

          <Button
            className="location-selector-btn"
            onClick={() => setLocationModalOpen(true)}
            aria-label="Select delivery location"
          >
            <div className="location-pin-wrapper">
              <MapPin size={18} className="pin-icon" />
            </div>
            <div className="location-text">
              <div className="delivery-time-tag">
                <span className="bold-time">Deliver to</span>
              </div>
              <div className="location-address">
                <span className="address-line">
                  {selectedLocation ? (
                    <span className="address-formatted">
                      <strong>{selectedLocation.tag}</strong> {shortAddress(selectedLocation) ? `- ${shortAddress(selectedLocation)}` : ''}
                    </span>
                  ) : 'Select Location'}
                </span>
                <ChevronDown size={14} className="chevron-icon" />
              </div>
            </div>
          </Button>
        </div>

        {/* Center: Search Bar (Hidden on Account and Orders pages) */}
        {!isAccountOrOrders && (
          <div className="header-search">
            <form onSubmit={handleSearchSubmit} className="search-form">
              <Search size={18} className="search-icon" />
              <Input
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
                <Button
                  type="button"
                  className="clear-search-btn"
                  onClick={handleClear}
                >
                  <X size={15} />
                </Button>
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
          <div className="profile-dropdown-wrapper" ref={profileMenuRef}>
            {isAuthenticated ? (
              <Button
                className="profile-btn"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <div className="avatar-img-wrapper">
                  <User size={18} />
                </div>
                <span className="user-name">{user?.name ? user.name.split(' ')[0] : 'Account'}</span>
                <ChevronDown size={13} />
              </Button>
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
                {portalPath && (
                  <Link to={portalPath} className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                    Open {user.role === 'RIDER' ? 'rider app' : user.role === 'SHOP_OWNER' ? 'store portal' : 'admin console'}
                  </Link>
                )}
                {!portalPath && (
                  <>
                  <Link to="/profile" className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                    My Profile
                  </Link>
                  <Link to="/orders" className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                    Order History
                  </Link>
                  <Link to="/addresses" className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                    Saved Addresses
                  </Link>
                  </>
                )}
                <Link to="/help" className="menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                  Help & FAQs
                </Link>
                <div className="menu-divider" />
                <Button
                  className="menu-item logout-btn"
                  onClick={() => {
                    logout();
                    setIsProfileMenuOpen(false);
                  }}
                >
                  Logout
                </Button>
              </div>
            )}
          </div>

          {/* Cart CTA Button */}
          <Button
            className={`cart-header-btn ${totalQuantity > 0 ? 'has-items' : ''}`}
            onClick={() => setIsCartOpen(true)}
            aria-label="View shopping cart"
          >
            <div className="cart-icon-container">
              <ShoppingCart size={20} />
            </div>
            <span className="cart-badge">{totalQuantity}</span>
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
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <div className="mobile-header-actions">
          <Button
            className="cart-mobile-btn"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open Cart"
          >
            <ShoppingCart size={22} />
            {totalQuantity > 0 && <span className="cart-badge">{totalQuantity}</span>}
          </Button>
        </div>
      </div>
    </header>
  );
};
