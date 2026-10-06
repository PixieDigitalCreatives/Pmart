import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Search, Package, User } from 'lucide-react';
import './MobileBottomNav.scss';

export const MobileBottomNav = () => {
  return (
    <nav className="mobile-bottom-nav">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Home size={20} />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/category/fruits-vegetables"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <LayoutGrid size={20} />
        <span>Categories</span>
      </NavLink>

      <NavLink
        to="/search"
        onClick={() => {
          setTimeout(() => {
            document.getElementById('header-main-search-input')?.focus();
          }, 100);
        }}
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Search size={20} />
        <span>Search</span>
      </NavLink>

      <NavLink
        to="/orders"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <Package size={20} />
        <span>Orders</span>
      </NavLink>

      <NavLink
        to="/profile"
        className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
      >
        <User size={20} />
        <span>Account</span>
      </NavLink>
    </nav>
  );
};
