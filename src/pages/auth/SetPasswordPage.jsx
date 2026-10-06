import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Sparkles, Lock, LogOut, CheckCircle2 } from 'lucide-react';
import { Button, Input, FormField, ErrorMessage } from '@/components/ui';
import './LoginPage.scss';

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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
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
    <div className="pmart-auth-page">
      <div className="auth-card-container">
        {/* ── Left: Brand Panel ── */}
        <div className="auth-brand-side">
          <div className="brand-header">
            <img src="/Pmart.png" alt="PMart" className="auth-logo" />
            <span className="brand-tagline">Account Security</span>
          </div>

          <div className="brand-hero-msg">
            <h2>Keep your account safe.</h2>
            <p>
              Please set a password to continue using your PMart account securely.
            </p>
          </div>

          <div className="brand-trust-points">
            <div className="trust-point">
              <ShieldCheck size={18} className="shield-icon" />
              <span>Secure authentication</span>
            </div>
            <div className="trust-point">
              <Sparkles size={18} className="shield-icon" />
              <span>Fast &amp; seamless experience</span>
            </div>
          </div>
        </div>

        {/* ── Right: Auth Form Panel ── */}
        <div className="auth-form-side">
          <div className="form-wrapper">
            <div className="form-heading-group">
              <h2 className="form-title">Secure Your Account</h2>
              <p className="form-subtitle">Please set a password to continue using PMart.</p>
            </div>

            {error && <ErrorMessage message={error} />}

            {success ? (
              <div className="auth-success-alert">
                <CheckCircle2 size={18} />
                <span>{success}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <FormField label="New Password">
                  <Input
                    icon={Lock}
                    type="password"
                    placeholder="Enter a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </FormField>

                <FormField label="Confirm Password">
                  <Input
                    icon={Lock}
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </FormField>

                <Button 
                  type="submit" 
                  size="full"
                  isLoading={loading}
                  disabled={password.length < 8 || password !== confirmPassword}
                  style={{ marginTop: '16px' }}
                >
                  Set Password &amp; Continue
                </Button>
                
                <Button 
                  type="button" 
                  variant="neutral"
                  size="full"
                  onClick={handleLogout}
                  disabled={loading}
                  style={{ marginTop: '12px' }}
                  className="badge-neutral"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LogOut size={18} /> Log Out
                  </span>
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

