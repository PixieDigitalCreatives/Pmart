import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Bike, ShieldCheck, LogOut } from 'lucide-react';

export const RiderProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="rider-profile-page">
      <div className="pmart-card text-center mb-4">
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FFF1F1', color: '#F20D18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Bike size={32} />
        </div>
        <h2 className="text-lg font-bold text-dark">{user?.name || 'Vikram Singh'}</h2>
        <div className="text-muted text-xs">Fleet ID: PM-RIDER-201</div>
        <span className="badge badge-success mt-2">Active On Duty</span>
      </div>

      <div className="pmart-card space-y-3 text-sm mb-4">
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted">Registered Phone</span>
          <span className="font-semibold text-dark">{user?.phone || '+91 98112 34567'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted">Assigned Hub</span>
          <span className="font-semibold text-dark">Noida Sector 62</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted">Registered Vehicle</span>
          <span className="font-semibold text-dark">Hero Electric (UP 16 AX 4492)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Fleet Insurance</span>
          <span className="text-success font-semibold flex items-center gap-1">
            <ShieldCheck size={14} /> Active Policy
          </span>
        </div>
      </div>

      <button className="btn btn-secondary btn-full text-error" onClick={handleLogout}>
        <LogOut size={16} />
        <span>End Shift & Logout</span>
      </button>
    </div>
  );
};
