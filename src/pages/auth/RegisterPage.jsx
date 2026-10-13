import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, homeForRole } from '@/context/AuthContext';
import { apiErrorMessage } from '@/services/apiClient';
import { AuthShell } from '@/components/common/AuthShell';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';
import { Button, Input, FormField, ErrorMessage } from '@/components/ui';

const isPhoneLike = (raw) => /^\+?[0-9]{10,15}$/.test(raw.trim().replace(/[\s\-().]/g, ''));

/**
 * Two modes:
 * - new visitor: sign up with name, mobile and password (or Google);
 * - Google sign-up that still needs a mobile number and password: completes the profile.
 */
export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, googleLogin, completeProfile, isAuthenticated, user } = useAuth();

  const completing = isAuthenticated && user && user.role === 'CUSTOMER' && !user.profileComplete;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (completing && !name && user.name) setName(user.name);
  }, [completing, user, name]);

  useEffect(() => {
    if (isAuthenticated && user && !completing) navigate(homeForRole(user.role), { replace: true });
  }, [isAuthenticated, user, completing, navigate]);

  const validate = () => {
    if (!name.trim()) return 'Enter your full name.';
    if (!isPhoneLike(phone)) return 'Enter a valid 10-digit mobile number.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    setLoading(true);
    try {
      if (completing) {
        await completeProfile({ name: name.trim(), phone: phone.trim(), password, confirmPassword });
      } else {
        await register(name.trim(), phone.trim(), password);
      }
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed. Please try again.'));
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
      setError(apiErrorMessage(err, 'Google sign-up failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading="Groceries from your nearby PMart store."
      subheading="Create an account to order and track deliveries."
      title={completing ? 'Finish setting up your account' : 'Create your account'}
      subtitle={completing ? 'Add your mobile number and a password to continue.' : 'It takes less than a minute.'}
      footer={
        !completing && (
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-toggle-btn">
              Sign in
            </Link>
          </p>
        )
      }
    >
      {error && <ErrorMessage message={error} />}
      {!completing && <GoogleSignInButton label="Sign up with Google" onToken={handleGoogleToken} onError={setError} disabled={loading} />}

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <FormField label="Full name" htmlFor="auth-name">
          <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} disabled={loading} />
        </FormField>
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
        <FormField label="Password" htmlFor="auth-password" hint="At least 8 characters">
          <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={loading} />
        </FormField>
        <FormField label="Confirm password" htmlFor="auth-confirm-password">
          <Input
            id="auth-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
        </FormField>
        <Button id="signup-submit-btn" type="submit" size="full" isLoading={loading} style={{ marginTop: '16px' }}>
          {completing ? 'Save and continue' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
};
