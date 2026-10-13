import React from 'react';
import { Button } from '@/components/ui';
import { auth, googleProvider, signInWithPopup, isGoogleSignInConfigured } from '@/config/firebase';
import { useCart } from '@/context/CartContext';

/**
 * Renders nothing unless Google sign-in is configured on both sides: Firebase web config in the
 * frontend and Firebase Admin credentials on the server (reported by /api/settings/public).
 */
export const GoogleSignInButton = ({ onToken, onError, disabled, label = 'Continue with Google' }) => {
  const { settings } = useCart();
  if (!isGoogleSignInConfigured || !settings?.googleSignIn) return null;

  const handleClick = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onToken(await result.user.getIdToken());
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        onError(err.message || 'Google sign-in failed. Please try again.');
      }
    }
  };

  return (
    <>
      <Button type="button" className="google-oauth-btn" onClick={handleClick} disabled={disabled} aria-label={label}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="google-icon" />
        <span>{label}</span>
      </Button>
      <div className="auth-divider">
        <div className="divider-line" />
        <span className="divider-label">or use your mobile number</span>
        <div className="divider-line" />
      </div>
    </>
  );
};
