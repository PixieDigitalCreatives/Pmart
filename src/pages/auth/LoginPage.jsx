import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, ArrowRight, Smartphone, Mail, Sparkles, AlertCircle } from 'lucide-react';
import './LoginPage.scss';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithOtp } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your mobile number or email address');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendOtp(identifier.trim());
      setLoading(false);
      // Navigate to OTP verification screen passing identifier state
      navigate('/verify-otp', {
        state: {
          identifier: identifier.trim(),
          demoOtp: res.demoOtp
        }
      });
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <div className="pmart-auth-page">
      <div className="auth-card-container">
        {/* Left Side: Brand Narrative */}
        <div className="auth-brand-side">
          <div className="brand-header">
            <img src="/Pmart.png" alt="PMart" className="auth-logo" />
            <span className="brand-tagline">Grocery and More</span>
          </div>

          <div className="brand-hero-msg">
            <h2>Superfast groceries, delivered with precision.</h2>
            <p>
              One unified portal for customers, darkstore fulfillment operators, delivery fleet heroes, and operations administrators.
            </p>
          </div>

          <div className="brand-trust-points">
            <div className="trust-point">
              <ShieldCheck size={18} className="shield-icon" />
              <span>Instant OTP authentication — no passwords needed</span>
            </div>
            <div className="trust-point">
              <Sparkles size={18} className="shield-icon" />
              <span>Role-agnostic single sign-on system</span>
            </div>
          </div>

          <div className="demo-hint-box">
            <strong>Prototype Demo Credentials:</strong>
            <p>Enter any 10-digit number or email. You can test roles using:</p>
            <ul>
              <li><code>9876543210</code> → Customer Portal</li>
              <li><code>shop@pmart.in</code> → Shop Owner Dashboard</li>
              <li><code>rider@pmart.in</code> → Delivery Rider Fleet</li>
              <li><code>admin@pmart.in</code> → Central Admin Enterprise</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="auth-form-side">
          <div className="form-wrapper">
            <div className="form-heading-group">
              <h1 className="form-title">Welcome to PMart</h1>
              <p className="form-subtitle">Enter your mobile number or email to sign in or register</p>
            </div>

            {error && (
              <div className="auth-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleContinue} className="auth-form">
              <div className="form-group">
                <label>Mobile Number or Email Address</label>
                <div className="input-with-icon">
                  <Smartphone size={18} className="field-icon" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +91 98765 43210 or name@pmart.in"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="form-hint">A 4-digit verification OTP will be sent</div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading}
              >
                <span>{loading ? 'Sending Code...' : 'Continue to Verification'}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="auth-terms-disclaimer">
              By continuing, you agree to PMart’s <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
