import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/services/apiClient';
import { ShieldCheck, Sparkles, Lock, CheckCircle2 } from 'lucide-react';
import { Button, Input, FormField, ErrorMessage } from '@/components/ui';
import './LoginPage.scss';

export const RiderEnrollPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid enrollment link. Missing setup token.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid enrollment link. Missing setup token.');
      return;
    }
    
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
      await api.post('/auth/enroll-rider', { token, password });
      setSuccess('Account provisioned successfully! You can now log in.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll rider. The link may have expired or already been used.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pmart-auth-page">
      <div className="auth-card-container">
        {/* ── Left: Brand Panel ── */}
        <div className="auth-brand-side">
          <div className="brand-header">
            <img src="/Pmart.png" alt="PMart" className="auth-logo" />
            <span className="brand-tagline">Fleet Operations</span>
          </div>

          <div className="brand-hero-msg">
            <h2>Join the PMart Fleet</h2>
            <p>
              Deliver groceries to thousands of happy customers. Fast, reliable, and precise.
            </p>
          </div>

          <div className="brand-trust-points">
            <div className="trust-point">
              <ShieldCheck size={18} className="shield-icon" />
              <span>Secure rider portal</span>
            </div>
            <div className="trust-point">
              <Sparkles size={18} className="shield-icon" />
              <span>Optimized routing &amp; earnings</span>
            </div>
          </div>
        </div>

        {/* ── Right: Auth Form Panel ── */}
        <div className="auth-form-side">
          <div className="form-wrapper">
            <div className="form-heading-group">
              <h2 className="form-title">Rider Account Setup</h2>
              <p className="form-subtitle">Please set your secure password to activate your PMart Fleet account.</p>
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
                    disabled={loading || !token}
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
                    disabled={loading || !token}
                    required
                  />
                </FormField>

                <Button 
                  type="submit" 
                  size="full"
                  isLoading={loading}
                  disabled={!token || password.length < 6 || password !== confirmPassword}
                  style={{ marginTop: '16px' }}
                >
                  Set Password &amp; Activate
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

