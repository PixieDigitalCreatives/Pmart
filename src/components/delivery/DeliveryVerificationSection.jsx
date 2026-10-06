import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, KeyRound, Loader2, RotateCcw } from 'lucide-react';
import { deliveryOtpService } from '@/services/deliveryOtpService';
import { deliveryService } from '@/services/deliveryService';
import './DeliveryVerificationSection.scss';
import { Input, Button } from '@/components/ui';

export const DeliveryVerificationSection = ({
  order,
  onVerificationSuccess = () => {},
  isProcessing = false
}) => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Check cooldown on mount
  useEffect(() => {
    const orderId = order?.id || order?._id;
    if (orderId) {
      deliveryOtpService.getResendCooldown(orderId).then(sec => {
        setCooldownRemaining(sec);
      });
    }
  }, [order?.id, order?._id]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const interval = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownRemaining]);

  const handleDigitChange = (index, value) => {
    const val = value.slice(-1); // only keep last character
    if (val && !/^[0-9]$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);
    setErrorMessage('');

    // Auto-advance to next input
    if (val && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const newDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    setErrorMessage('');
    const nextIdx = Math.min(3, pasted.length);
    inputRefs[nextIdx].current?.focus();
  };

  const fullOtp = digits.join('');
  const isComplete = fullOtp.length === 4;

  const handleVerifySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isComplete || verifying || isProcessing) return;

    setVerifying(true);
    setErrorMessage('');
    const orderId = order.id || order._id;

    try {
      // 1. Verify OTP with deliveryOtpService
      await deliveryOtpService.verifyDeliveryOtp(orderId, fullOtp);

      // 2. Finalize delivery completion via deliveryService
      const result = await deliveryService.completeDelivery(orderId);

      setSuccessNotice(true);

      // Trigger completion callback
      setTimeout(() => {
        onVerificationSuccess(result.order);
      }, 700);
    } catch (err) {
      console.error(err);
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
    const orderId = order.id || order._id;

    try {
      const res = await deliveryOtpService.resendDeliveryOtp(orderId);
      setCooldownRemaining(res.cooldownSeconds || 30);
      setResendNotice(res.message || 'New OTP sent to customer mobile.');
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend OTP.');
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
        {/* Payment Confirmation Banner */}
        <div className="payment-confirmed-banner">
          <div className="banner-left">
            <CheckCircle2 size={18} className="check-svg" />
            <span className="banner-text">Payment Received</span>
          </div>
          <span className="amount-pill">₹{order?.totalAmount || order?.billing?.grandTotal} Cash</span>
        </div>

        <p className="verification-instruction">
          For security, verify the customer's delivery OTP.
        </p>

        {/* 4-Digit Input Form */}
        <form onSubmit={handleVerifySubmit} className="otp-form-box">
          <label htmlFor="auto-id-needed" className="input-field-label">Enter Customer OTP</label>

          <div className="digit-inputs-row" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
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

          {/* Feedback & Error Alerts */}
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

          {/* Primary Action Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full verify-submit-btn"
            disabled={!isComplete || verifying || successNotice || isProcessing}
          >
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

        {/* Resend OTP Bar */}
        <div className="resend-otp-footer">
          <span className="resend-prompt">Customer didn't receive code?</span>
          <button
            type="button"
            className="btn-resend-link"
            onClick={handleResendOtp}
            disabled={cooldownRemaining > 0 || resending}
          >
            <RotateCcw size={13} className={resending ? 'spinner' : ''} />
            {cooldownRemaining > 0 ? (
              <span>Resend in {cooldownRemaining}s</span>
            ) : (
              <span>Resend OTP</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
