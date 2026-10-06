import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Bike, ShieldCheck, LogOut, Loader2, AlertCircle } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { Card, StatusBadge, Button, Input } from '@/components/ui';

export const RiderProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwords.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      return;
    }
    
    setPasswordChanging(true);
    try {
      await apiClient.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword
      });
      setPasswordMessage({ type: 'success', text: 'Password updated successfully' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to update password' 
      });
    } finally {
      setPasswordChanging(false);
    }
  };

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
        <Card className="text-center mb-4">
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FFF1F1', color: '#F20D18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Bike size={32} />
          </div>
          <h2 className="text-lg font-bold text-dark">{user?.name || 'Rider'}</h2>
          <p className="text-muted text-sm mt-2">Your rider profile is not yet complete.</p>
          <Button variant="primary" className="w-full mt-4" onClick={() => navigate('/rider/onboarding')}>
            Complete Your Profile
          </Button>
        </Card>
        <Button variant="secondary" className="w-full text-error" onClick={handleLogout}>
          <LogOut size={16} className="mr-2" />
          <span>Logout</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="rider-profile-page">
      <Card className="text-center mb-4">
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FFF1F1', color: '#F20D18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Bike size={32} />
        </div>
        <h2 className="text-lg font-bold text-dark">{profile.fullName || user?.name}</h2>
        <div className="text-muted text-xs mb-2">Vehicle: {profile.vehicleNumber || 'Not available'}</div>
        <StatusBadge 
          status={profile.availabilityStatus === 'AVAILABLE' ? 'Active On Duty' : profile.availabilityStatus} 
          type={profile.availabilityStatus === 'AVAILABLE' ? 'success' : 'neutral'}
        />
      </Card>

      <Card className="space-y-3 text-sm mb-4">
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
      </Card>

      <Card className="space-y-3 mb-4">
        <h3 className="font-bold text-dark text-md border-b pb-2">Change Password</h3>
        {passwordMessage.text && (
          <div className={`p-2 text-sm rounded ${passwordMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
            {passwordMessage.text}
          </div>
        )}
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label htmlFor="auto-id-needed" className="block text-xs font-medium mb-1">Current Password</label>
            <Input 
              type="password" 
              value={passwords.currentPassword}
              onChange={e => setPasswords({...passwords, currentPassword: e.target.value})}
              required
            />
          </div>
          <div>
            <label htmlFor="auto-id-needed" className="block text-xs font-medium mb-1">New Password</label>
            <Input 
              type="password" 
              value={passwords.newPassword}
              onChange={e => setPasswords({...passwords, newPassword: e.target.value})}
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="auto-id-needed" className="block text-xs font-medium mb-1">Confirm New Password</label>
            <Input 
              type="password" 
              value={passwords.confirmPassword}
              onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})}
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={passwordChanging} loading={passwordChanging} loadingText="Updating...">
            {!passwordChanging && 'Update Password'}
          </Button>
        </form>
      </Card>

      <Button variant="secondary" className="w-full text-error" onClick={handleLogout}>
        <LogOut size={16} className="mr-2" />
        <span>End Shift & Logout</span>
      </Button>
    </div>
  );
};
