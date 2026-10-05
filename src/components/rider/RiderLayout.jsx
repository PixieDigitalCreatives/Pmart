import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Bike,
  Home,
  Package,
  Clock,
  User,
  Power,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import './RiderLayout.scss';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export const RiderLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(true);

  return (
    <div className="rider-portal-container">
      {/* Rider Topbar */}
      <header className="rider-topbar">
        <div className="rider-topbar-inner">
          <div className="rider-brand-group">
            <img src="/Pmart.png" alt="PMart" className="rider-logo" />
            <div className="fleet-badge">FLEET RIDER</div>
          </div>

          {/* Online/Offline Toggle */}
          <button
            className={`rider-status-toggle ${isOnline ? 'online' : 'offline'}`}
            onClick={() => setIsOnline(!isOnline)}
            title="Toggle Fleet Availability"
          >
            <span className="indicator-dot" />
            <span className="status-text">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="rider-main-body">
        <ErrorBoundary fallbackMessage="An error occurred in the Rider App.">
          {children}
        </ErrorBoundary>
      </main>

      {/* Mobile-First Bottom Nav */}
      <nav className="rider-bottom-nav">
        <NavLink
          to="/rider"
          end
          className={({ isActive }) => `rider-nav-item ${isActive ? 'active' : ''}`}
        >
          <Home size={20} />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/rider/orders"
          className={({ isActive }) => `rider-nav-item ${isActive ? 'active' : ''}`}
        >
          <Package size={20} />
          <span>Active Order</span>
        </NavLink>

        <NavLink
          to="/rider/history"
          className={({ isActive }) => `rider-nav-item ${isActive ? 'active' : ''}`}
        >
          <Clock size={20} />
          <span>History</span>
        </NavLink>

        <NavLink
          to="/rider/profile"
          className={({ isActive }) => `rider-nav-item ${isActive ? 'active' : ''}`}
        >
          <User size={20} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
};
