import React, { useState } from 'react';
import { KeyRound, Copy, Check, ShieldCheck } from 'lucide-react';
import './DeliveryOTP.scss';

export const DeliveryOTP = ({ otp = '4829', isNearby = false }) => {
  const [copied, setCopied] = useState(false);

  if (!otp) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const digits = otp.toString().split('');

  return (
    <div className={`pmart-delivery-otp-card ${isNearby ? 'highlight-pulse' : ''}`}>
      <div className="otp-top-row">
        <div className="otp-shield-icon">
          <ShieldCheck size={18} />
        </div>
        <div className="otp-text-meta">
          <h4 className="otp-title">Delivery Verification OTP</h4>
          <p className="otp-desc">Share this code with the partner upon arrival to confirm receipt</p>
        </div>
      </div>

      <div className="otp-digits-display">
        <div className="digits-group">
          {digits.map((digit, idx) => (
            <div key={idx} className="otp-digit-box">
              {digit}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn-copy-otp"
          onClick={handleCopy}
          title="Copy OTP to clipboard"
        >
          {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
};
