import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '@/config/firebase';
import './LoginPage.scss';

// Validates a mobile number — must be digits only (with optional leading +/country code).
function validatePhone(raw) {
  const stripped = raw.trim().replace(/[\s\-().]/g, '');
  return /^\+?[0-9]{7,15}$/.test(stripped);
}

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Redirect authenticated users to their respective home
  useEffect(() => {
    if (isAuthenticated && user) {
      if (!user.profileComplete) {
        navigate(user.role === 'RIDER' ? '/rider/onboarding' : '/register', { replace: true });
        return;
      }
      const from = location.state?.from?.pathname;
      if (from && from !== '/login' && from !== '/register') {
        navigate(from, { replace: true });
        return;
      }
      const roleRoutes = { SHOP_OWNER: '/shop', RIDER: '/rider', ADMIN: '/admin' };
      navigate(roleRoutes[user.role] || '/', { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePhone(phone)) {
      setError('Please enter a valid mobile number (digits only, e.g. +91 98765 43210).');
      return;
    }

    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const netMsg =
        err.message === 'Network Error'
          ? `Backend unreachable at ${import.meta.env.VITE_API_BASE_URL || '/api'}. Is the server running?`
          : null;
      setError(serverMsg || netMsg || err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await googleLogin(idToken);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign in failed. Please try again.');
      }
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
            <span className="brand-tagline">Grocery and More</span>
          </div>

          <div className="brand-hero-msg">
            <h2>Superfast groceries, delivered with precision.</h2>
            <p>
              One unified portal for customers, darkstore fulfillment operators,
              delivery fleet heroes, and operations administrators.
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
        <div className="auth-action-side">
          {/* Heading */}
          <div className="action-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your account</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="auth-error-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* ① Google button */}
          <button
            id="google-sign-in-btn"
            type="button"
            className="google-oauth-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-label="Continue with Google"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
              className="google-icon"
            />
            <span>Continue with Google</span>
          </button>

          {/* ② Divider */}
          <div className="auth-divider">
            <div className="divider-line" />
            <span className="divider-label">or continue with phone</span>
            <div className="divider-line" />
          </div>

          {/* ③ Manual Login Form */}
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Mobile Number */}
            <div className="form-group">
              <label htmlFor="auth-phone">Mobile Number</label>
              <input
                id="auth-phone"
                type="tel"
                className="auth-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+91 98765 43210"
                autoComplete="tel"
                inputMode="tel"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Your password"
                autoComplete="current-password"
                minLength={6}
                disabled={loading}
              />
            </div>

            {/* Submit */}
            <button
              id="signin-submit-btn"
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={18} className="spinner" />
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* ④ Toggle link */}
          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="auth-toggle-btn" style={{ textDecoration: 'none', display: 'inline' }}>
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};