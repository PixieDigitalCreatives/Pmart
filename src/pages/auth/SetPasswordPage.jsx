import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Loader2, AlertCircle, Lock, LogOut } from 'lucide-react';
import './LoginPage.scss'; // Reuse LoginPage styles

export const SetPasswordPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await apiClient.post('/auth/setup-password', { password });
      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-logo">
            <ShieldCheck className="icon" />
            <div className="logo-sparkle" />
          </div>
          <h1>Secure Your Account</h1>
          <p>Please set a password to continue using PMart.</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="success-message" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <ShieldCheck size={18} />
            <span>{success}</span>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type="password"
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" />
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={loading || password.length < 6 || password !== confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  <span>Saving...</span>
                </>
              ) : (
                'Set Password & Continue'
              )}
            </button>
            <button 
              type="button" 
              className="login-btn secondary-btn"
              onClick={handleLogout}
              disabled={loading}
              style={{ marginTop: '10px', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db' }}
            >
              <LogOut size={20} style={{ marginRight: '8px' }} />
              Log Out
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
