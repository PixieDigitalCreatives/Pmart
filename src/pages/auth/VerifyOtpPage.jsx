import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import './LoginPage.scss';

export const VerifyOtpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithOtp } = useAuth();

  const identifier = location.state?.identifier || '';
  const demoOtp = location.state?.demoOtp || '';

  const [otp, setOtp] = useState(
    demoOtp && demoOtp.length === 4 ? demoOtp.split('') : ['', '', '', '']
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(30);

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleResend = async () => {
    setTimer(30);
    setError('');
    await authService.sendOtp(identifier);
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const enteredOtp = otp.join('');

    if (enteredOtp.length !== 4) {
      setError('Please enter the complete 4-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginWithOtp(identifier, enteredOtp);
      setSuccess(true);
      setLoading(false);

      // Route based on authenticated role determined by backend/service
      setTimeout(() => {
        const userRole = res.user.role;
        switch (userRole) {
          case 'SHOP_OWNER':
            navigate('/shop');
            break;
          case 'RIDER':
            navigate('/rider');
            break;
          case 'ADMIN':
            navigate('/admin');
            break;
          case 'CUSTOMER':
          default:
            navigate('/');
            break;
        }
      }, 700);
    } catch (err) {
      setLoading(false);
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || err.message || 'Invalid or expired OTP. Please try again.');
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
            <h2>Two-factor secured identity verification.</h2>
            <p>
              Your security and privacy is our top priority. We verify each session with zero-friction one-time passwords.
            </p>
          </div>

        </div>

        {/* Right Side: OTP Card */}
        <div className="auth-form-side">
          <div className="form-wrapper">
            <button className="back-to-login-link" onClick={() => navigate('/login')}>
              <ArrowLeft size={16} />
              <span>Change phone / email</span>
            </button>

            <div className="form-heading-group">
              <h1 className="form-title">Enter Verification Code</h1>
              <p className="form-subtitle">
                We sent a 4-digit code to <strong>{identifier}</strong>
              </p>
            </div>

            {error && (
              <div className="auth-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="auth-success-alert">
                <CheckCircle2 size={16} />
                <span>Verification successful! Loading your dashboard...</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="otp-form">
              <div className="otp-digits-row">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-box-input"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <div className="resend-otp-row">
                {timer > 0 ? (
                  <span className="timer-text">Resend code in {timer}s</span>
                ) : (
                  <button type="button" className="resend-btn" onClick={handleResend}>
                    <RotateCcw size={14} />
                    <span>Resend OTP</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading || otp.join('').length < 4}
              >
                <span>{loading ? 'Verifying OTP...' : 'Verify & Sign In'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
