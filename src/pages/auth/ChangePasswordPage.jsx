import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, homeForRole } from '@/context/AuthContext';
import { apiErrorMessage } from '@/services/apiClient';
import { AuthShell } from '@/components/common/AuthShell';
import { Button, Input, PasswordInput, FormField, ErrorMessage } from '@/components/ui';

/** Used for the mandatory first-login change (riders, store owners) and voluntary changes. */
export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, changePassword, logout } = useAuth();
  const forced = Boolean(user?.mustChangePassword);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    setLoading(true);
    setError('');
    try {
      const updated = await changePassword(currentPassword, newPassword, confirmPassword);
      navigate(homeForRole(updated.role), { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not change the password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading="Keep your account secure."
      subheading={forced ? 'Your account was created with a temporary password. Choose your own to continue.' : undefined}
      title={forced ? 'Set a new password' : 'Change password'}
      subtitle={user?.name ? `Signed in as ${user.name}` : undefined}
      footer={
        <p>
          <button type="button" className="auth-toggle-btn" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => logout().then(() => navigate('/login'))}>
            Sign out
          </button>
        </p>
      }
    >
      {error && <ErrorMessage message={error} />}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <FormField label={forced ? 'Temporary password' : 'Current password'} htmlFor="cp-current">
          <PasswordInput id="cp-current" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" disabled={loading} />
        </FormField>
        <FormField label="New password" htmlFor="cp-new" hint="At least 8 characters">
          <PasswordInput id="cp-new" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" disabled={loading} />
        </FormField>
        <FormField label="Confirm new password" htmlFor="cp-confirm">
          <PasswordInput id="cp-confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" disabled={loading} />
        </FormField>
        <Button type="submit" size="full" isLoading={loading} style={{ marginTop: '16px' }}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
};
