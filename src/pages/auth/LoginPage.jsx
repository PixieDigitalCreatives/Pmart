import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, homeForRole } from '@/context/AuthContext';
import { apiErrorMessage } from '@/services/apiClient';
import { AuthShell } from '@/components/common/AuthShell';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';
import { Button, Input, PasswordInput, FormField, ErrorMessage } from '@/components/ui';

const isPhoneLike = (raw) => /^\+?[0-9]{10,15}$/.test(raw.trim().replace(/[\s\-().]/g, ''));

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, isAuthenticated, user } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.mustChangePassword) return navigate('/account/change-password', { replace: true });
    if (user.role === 'CUSTOMER' && !user.profileComplete) return navigate('/register', { replace: true });
    const from = location.state?.from?.pathname;
    navigate(from && !['/login', '/register'].includes(from) ? from : homeForRole(user.role), { replace: true });
  }, [isAuthenticated, user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isPhoneLike(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err) {
      setError(apiErrorMessage(err, 'Sign-in failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken) => {
    setLoading(true);
    setError('');
    try {
      await googleLogin(idToken);
    } catch (err) {
      setError(apiErrorMessage(err, 'Google sign-in failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading="Groceries from your nearby PMart store."
      subheading="One sign-in for customers, store teams, delivery partners and operations."
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <p>
          New to PMart?{' '}
          <Link to="/register" className="auth-toggle-btn">
            Create an account
          </Link>
        </p>
      }
    >
      {error && <ErrorMessage message={error} />}
      <GoogleSignInButton onToken={handleGoogleToken} onError={setError} disabled={loading} />

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <FormField label="Mobile number" htmlFor="auth-phone">
          <Input
            id="auth-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile number"
            autoComplete="tel"
            inputMode="tel"
            disabled={loading}
          />
        </FormField>
        <FormField label="Password" htmlFor="auth-password">
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            disabled={loading}
          />
        </FormField>
        <Button id="signin-submit-btn" type="submit" size="full" isLoading={loading} style={{ marginTop: '16px' }}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
};
