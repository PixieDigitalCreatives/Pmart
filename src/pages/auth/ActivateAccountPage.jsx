import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '@/services/authService';
import { apiErrorMessage } from '@/services/apiClient';
import { AuthShell } from '@/components/common/AuthShell';
import { Button, Input, FormField, ErrorMessage } from '@/components/ui';

/** Staff accounts are activated through a one-time link created by an admin. */
export const ActivateAccountPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(token ? '' : 'This activation link is incomplete. Ask your admin for a new link.');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setLoading(true);
    setError('');
    try {
      await authService.activateAccount(token, password, confirmPassword);
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(apiErrorMessage(err, 'Activation failed. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      tagline="Team account"
      heading="Welcome to the PMart team."
      subheading="Choose a password to activate your account."
      title="Activate your account"
      subtitle="Set the password you will use to sign in."
      footer={
        <p>
          Already active? <Link to="/login" className="auth-toggle-btn">Sign in</Link>
        </p>
      }
    >
      {error && <ErrorMessage message={error} />}
      {done ? (
        <div className="alert alert-success">Account activated. Redirecting to sign in…</div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <FormField label="New password" htmlFor="activate-password" hint="At least 8 characters">
            <Input id="activate-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" disabled={loading || !token} />
          </FormField>
          <FormField label="Confirm password" htmlFor="activate-confirm">
            <Input id="activate-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" disabled={loading || !token} />
          </FormField>
          <Button type="submit" size="full" isLoading={loading} disabled={!token} style={{ marginTop: '16px' }}>
            Activate account
          </Button>
        </form>
      )}
    </AuthShell>
  );
};
