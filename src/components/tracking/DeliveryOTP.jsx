import React, { useState } from 'react';
import { Copy, Check, ShieldCheck } from 'lucide-react';
import './DeliveryOTP.scss';
import { Button } from '@/components/ui';

export const DeliveryOTP = ({ otp, isNearby = false, status = 'OUT_FOR_DELIVERY' }) => {
  const [copied, setCopied] = useState(false);

  if (!otp) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const digits = otp.toString().split('');
  
  const instructionText = status === 'ARRIVED' 
    ? 'Share this code with the partner to confirm receipt' 
    : 'Share this code with the partner upon arrival';

  return (
    <div className={`pmart-delivery-otp-card ${isNearby ? 'highlight-pulse' : ''}`}>
      <div className="otp-top-row">
        <div className="otp-shield-icon">
          <ShieldCheck size={18} />
        </div>
        <div className="otp-text-meta">
          <h4 className="otp-title">Delivery Verification OTP</h4>
          <p className="otp-desc">{instructionText}</p>
        </div>
      </div>

      <div className="otp-digits-display">
        <div className="digits-group otp-number">
          {digits.map((digit, idx) => (
            <div key={idx} className="otp-digit-box">
              {digit}
            </div>
          ))}
        </div>

        <Button
          type="button"
          className="btn-copy-otp"
          onClick={handleCopy}
          title="Copy OTP to clipboard"
        >
          {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>
    </div>
  );
};
