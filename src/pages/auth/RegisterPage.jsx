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

export const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleLogin, completeProfile, isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields for Step 2
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  // When user becomes authenticated and profile is incomplete, prefill name
  useEffect(() => {
    if (isAuthenticated && user && !user.profileComplete) {
      if (!name && user.name) {
        setName(user.name);
      }
    }
  }, [isAuthenticated, user, name]);

  // Redirect fully authenticated & complete users to their respective home
  useEffect(() => {
    if (isAuthenticated && user && user.profileComplete) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/register' && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }
      const roleRoutes = { SHOP_OWNER: '/shop', RIDER: '/rider', ADMIN: '/admin' };
      navigate(roleRoutes[user.role] || '/', { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await googleLogin(idToken);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Please enter a valid mobile number (digits only, e.g. +91 98765 43210).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const stripped = phone.trim().replace(/[\s\-().]/g, '');
      const normalizedPhone = stripped.startsWith('+') ? stripped : `+91${stripped}`;
      
      const result = await completeProfile({ 
        name: name.trim(), 
        phone: normalizedPhone, 
        password, 
        confirmPassword 
      });
      
      if (result.success) {
        // AppRoutes/RoleGuard or the useEffect above will redirect them automatically
        // once user.profileComplete becomes true in context.
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const netMsg = err.message === 'Network Error'
          ? `Backend unreachable at ${import.meta.env.VITE_API_BASE_URL || '/api'}. Is the server running?`
          : null;
      setError(serverMsg || netMsg || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Determine state
  const isProfileCompletionRequired = isAuthenticated && user && !user.profileComplete;

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
            <h2>{isProfileCompletionRequired ? 'Complete Registration' : 'Create an Account'}</h2>
            <p>{isProfileCompletionRequired ? 'Please provide the remaining details to activate your account.' : 'Sign up to get started'}</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="auth-error-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!isProfileCompletionRequired ? (
            /* STEP 1: Google Registration */
            <>
              <button
                id="google-signup-btn"
                type="button"
                className="google-oauth-btn"
                onClick={handleGoogleSignUp}
                disabled={loading}
                aria-label="Continue with Google"
                style={{ marginTop: '20px' }}
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt=""
                  className="google-icon"
                />
                <span>Continue with Google</span>
              </button>

              <div className="auth-footer" style={{ marginTop: 'auto' }}>
                <p>
                  Already have an account?{' '}
                  <Link to="/login" className="auth-toggle-btn" style={{ textDecoration: 'none', display: 'inline' }}>
                    Sign In
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* STEP 2: Profile Completion */
            <form onSubmit={handleCompleteRegistration} className="auth-form" noValidate>
              <div className="form-group">
                <label htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Shyam Mohan"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>

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
                <span className="field-hint">
                  Enter digits only. This number will not be verified by OTP.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a password (min. 6 chars)"
                  autoComplete="new-password"
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-confirm-password">Confirm Password</label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  className="auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={18} className="spinner" />
                ) : (
                  <span>Sign Up</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
