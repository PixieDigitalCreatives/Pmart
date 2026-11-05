import React, { useState, useEffect, useRef } from 'react';
import { TbShieldCheck as ShieldCheck, TbCircleCheck as CheckCircle2, TbAlertCircle as AlertCircle, TbKey as KeyRound, TbLoader2 as Loader2, TbRotate2 as RotateCcw } from 'react-icons/tb';
import { deliveryService } from '@/services/deliveryService';
import { useCart } from '@/context/CartContext';
import './DeliveryVerificationSection.scss';

const RESEND_COOLDOWN_SECONDS = 30;

/** Rider-side entry of the customer's delivery code; the code length follows the server's OTP_LENGTH. */
export const DeliveryVerificationSection = ({ order, onVerificationSuccess = () => {}, isProcessing = false }) => {
  const { settings } = useCart();
  const length = settings?.otpLength === 6 ? 6 : 4;
  const blank = () => Array(length).fill('');

  const [digits, setDigits] = useState(blank);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const inputRefs = useRef([]);

  // Re-size the inputs if the server reports a different code length after the first render.
  useEffect(() => {
    setDigits((d) => (d.length === length ? d : Array(length).fill('')));
  }, [length]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return undefined;
    const interval = setInterval(() => setCooldownRemaining((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const focusAt = (i) => inputRefs.current[i]?.focus();

  const handleDigitChange = (index, value) => {
    const val = value.slice(-1);
    if (val && !/^[0-9]$/.test(val)) return;
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    setErrorMessage('');
    if (val && index < length - 1) focusAt(index + 1);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) focusAt(index - 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = blank();
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setErrorMessage('');
    focusAt(Math.min(length - 1, pasted.length));
  };

  const fullOtp = digits.join('');
  const isComplete = fullOtp.length === length;

  const handleVerifySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isComplete || verifying || isProcessing) return;
    setVerifying(true);
    setErrorMessage('');
    const orderId = order.id || order._id;
    try {
      // Verifying an already-verified code is a no-op, so a retry after a failed completion is safe.
      await deliveryService.verifyOtp(orderId, fullOtp);
      const result = await deliveryService.complete(orderId);
      setSuccessNotice(true);
      setTimeout(() => onVerificationSuccess(result.order), 700);
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldownRemaining > 0 || resending) return;
    setResending(true);
    setErrorMessage('');
    setResendNotice('');
    try {
      const res = await deliveryService.regenerateOtp(order.id || order._id);
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      setResendNotice(res.message || 'A new code is now showing in the customer app.');
      setDigits(blank());
      focusAt(0);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to generate a new code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="pmart-delivery-verification-section">
      <div className="section-head-bar">
        <div className="badge-chip">SECURITY CHECK</div>
        <h2 className="section-title">Delivery Verification</h2>
      </div>

      <div className="verification-card-body">
        {order?.paymentStatus === 'COLLECTED' && (
          <div className="payment-confirmed-banner">
            <div className="banner-left">
              <CheckCircle2 size={18} className="check-svg" />
              <span className="banner-text">Payment Received</span>
            </div>
            <span className="amount-pill">₹{order?.totalAmount} Cash</span>
          </div>
        )}

        <p className="verification-instruction">Ask the customer for the {length}-digit delivery code shown in their PMart app.</p>

        <form onSubmit={handleVerifySubmit} className="otp-form-box">
          <p className="input-field-label" id="delivery-otp-label">
            Enter Customer OTP
          </p>

          <div className="digit-inputs-row" role="group" aria-labelledby="delivery-otp-label" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`otp-digit-cell ${digit ? 'filled' : ''} ${errorMessage ? 'has-error' : ''}`}
                autoFocus={idx === 0}
                disabled={verifying || successNotice}
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>

          {errorMessage && (
            <div className="verification-alert alert-error">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="verification-alert alert-success">
              <CheckCircle2 size={16} />
              <span>✓ Delivery Verified</span>
            </div>
          )}

          {resendNotice && (
            <div className="verification-alert alert-info">
              <ShieldCheck size={16} />
              <span>{resendNotice}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-full verify-submit-btn" disabled={!isComplete || verifying || successNotice || isProcessing}>
            {verifying ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Verifying OTP...</span>
              </>
            ) : successNotice ? (
              <>
                <CheckCircle2 size={18} />
                <span>✓ Delivery Verified</span>
              </>
            ) : (
              <>
                <KeyRound size={18} />
                <span>Verify & Complete Delivery</span>
              </>
            )}
          </button>
        </form>

        <div className="resend-otp-footer">
          <span className="resend-prompt">Code expired or locked?</span>
          <button type="button" className="btn-resend-link" onClick={handleResendOtp} disabled={cooldownRemaining > 0 || resending}>
            <RotateCcw size={13} className={resending ? 'spinner' : ''} />
            {cooldownRemaining > 0 ? <span>Resend in {cooldownRemaining}s</span> : <span>Generate new code</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
