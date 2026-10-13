import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Package, Clock, User } from 'lucide-react';
import { riderService } from '@/services/riderService';
import { apiErrorMessage } from '@/services/apiClient';
import { openSocket } from '@/services/socket';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui';
import './RiderLayout.scss';

const RiderContext = createContext({ profile: null, reloadProfile: () => {} });
/** The signed-in rider's profile (availability, vehicle, today's stats), shared across rider pages. */
export const useRider = () => useContext(RiderContext);

const LABELS = { AVAILABLE: 'ONLINE', BUSY: 'ON DELIVERY', OFFLINE: 'OFFLINE' };

export const RiderLayout = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState('');

  const reloadProfile = useCallback(
    () =>
      riderService
        .getProfile()
        .then((p) => {
          setProfile(p);
          setError('');
        })
        .catch((err) => setError(apiErrorMessage(err, 'Could not load your rider profile.'))),
    []
  );

  useEffect(() => {
    reloadProfile();
    // Assignments and status changes arrive on the rider's personal room.
    const socket = openSocket();
    socket.on('order_status_update', reloadProfile);
    return () => socket.close();
  }, [reloadProfile]);

  const status = profile?.availabilityStatus || 'OFFLINE';

  const toggle = async () => {
    if (!profile || status === 'BUSY' || toggling) return;
    setToggling(true);
    try {
      const updated = await riderService.setAvailability(status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE');
      setProfile((p) => ({ ...p, availabilityStatus: updated.availabilityStatus }));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setToggling(false);
    }
  };

  return (
    <RiderContext.Provider value={{ profile, reloadProfile }}>
      <div className="rider-portal-container">
        <header className="rider-topbar">
          <div className="rider-topbar-inner">
            <div className="rider-brand-group">
              <img src="/Pmart.png" alt="PMart" className="rider-logo" />
              <div className="fleet-badge">RIDER</div>
            </div>
            <Button
              className={`rider-status-toggle ${status === 'AVAILABLE' ? 'online' : 'offline'}`}
              onClick={toggle}
              disabled={!profile || status === 'BUSY' || toggling}
              title={status === 'BUSY' ? 'Finish the current delivery to go offline' : 'Go online to receive deliveries'}
            >
              <span className="indicator-dot" />
              <span className="status-text">{LABELS[status]}</span>
            </Button>
          </div>
        </header>

        <main className="rider-main-body">
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <ErrorBoundary fallbackMessage="An error occurred in the rider app.">{children}</ErrorBoundary>
        </main>

        <nav className="rider-bottom-nav">
          <NavLink to="/rider" end className={({ isActive }) => `rider-nav-item ${isActive ? 'active' : ''}`}>
            <Home size={20} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/rider/orders" className={({ isActive }) => `rider-nav-item ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span>Active</span>
          </NavLink>
          <NavLink to="/rider/history" className={({ isActive }) => `rider-nav-item ${isActive ? 'active' : ''}`}>
            <Clock size={20} />
            <span>History</span>
          </NavLink>
          <NavLink to="/rider/profile" className={({ isActive }) => `rider-nav-item ${isActive ? 'active' : ''}`}>
            <User size={20} />
            <span>Profile</span>
          </NavLink>
        </nav>
      </div>
    </RiderContext.Provider>
  );
};
