import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Bike, ShieldCheck, LogOut, Loader2, AlertCircle } from 'lucide-react';
import apiClient from '@/services/apiClient';

export const RiderProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/rider/profile');
        setProfile(response.data?.data || response.data);
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message;
        const status = err.response?.status || 'NETWORK';
        setError(`Failed to load profile details: HTTP ${status} - ${errMsg}`);
        console.error('RiderProfile API Error:', { status, message: errMsg });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="animate-spin text-pmart-red mb-2" size={32} />
        <p className="text-muted">Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12 text-error">
        <AlertCircle className="mx-auto mb-2" size={32} />
        <p>{error || 'Profile not found'}</p>
      </div>
    );
  }

  // If profile is incomplete, redirect to onboarding
  if (profile.profileComplete === false) {
    return (
      <div className="rider-profile-page">
        <div className="pmart-card text-center mb-4">
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FFF1F1', color: '#F20D18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Bike size={32} />
          </div>
          <h2 className="text-lg font-bold text-dark">{user?.name || 'Rider'}</h2>
          <p className="text-muted text-sm mt-2">Your rider profile is not yet complete.</p>
          <button className="btn btn-primary btn-full mt-4" onClick={() => navigate('/rider/onboarding')}>
            Complete Your Profile
          </button>
        </div>
        <button className="btn btn-secondary btn-full text-error" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rider-profile-page">
      <div className="pmart-card text-center mb-4">
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FFF1F1', color: '#F20D18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Bike size={32} />
        </div>
        <h2 className="text-lg font-bold text-dark">{profile.fullName || user?.name}</h2>
        <div className="text-muted text-xs">Vehicle: {profile.vehicleNumber || 'Not available'}</div>
        <span className="badge badge-success mt-2">{profile.availabilityStatus === 'AVAILABLE' ? 'Active On Duty' : profile.availabilityStatus}</span>
      </div>

      <div className="pmart-card space-y-3 text-sm mb-4">
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted">Registered Phone</span>
          <span className="font-semibold text-dark">{profile.phone || user?.phone || 'Not available'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted">Vehicle Type</span>
          <span className="font-semibold text-dark">{profile.vehicleType || 'Not available'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted">Registered Vehicle</span>
          <span className="font-semibold text-dark">{profile.vehicleType || 'N/A'} ({profile.vehicleNumber || 'N/A'})</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted">License Number</span>
          <span className="font-semibold text-dark">{profile.licenseNumber || 'Not available'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-muted">Total Deliveries</span>
          <span className="font-semibold text-dark">{profile.totalDeliveries ?? 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Rating</span>
          <span className="text-success font-semibold flex items-center gap-1">
            ⭐ {profile.rating != null ? profile.rating.toFixed(1) : 'N/A'}
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
