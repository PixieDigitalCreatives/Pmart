import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { PAYMENT_STATUS, paymentDisplay } from '@/types/orderTypes';
import './PaymentStatusBadge.scss';

export const PaymentStatusBadge = ({
  paymentStatus = PAYMENT_STATUS.PENDING,
  orderStatus,
  paymentMethod = 'COD',
  amount = null,
  compact = false
}) => {
  const isCollected = paymentStatus === PAYMENT_STATUS.COLLECTED;
  const { label } = paymentDisplay({ paymentStatus, status: orderStatus });

  return (
    <div className={`pmart-payment-status-badge ${isCollected ? 'status-collected' : 'status-pending'} ${compact ? 'compact' : ''}`}>
      <div className="badge-icon-wrap">
        {isCollected ? <CheckCircle2 size={14} /> : <Clock size={14} />}
      </div>
      <div className="badge-content">
        <span className="method-label">
          {paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : paymentMethod}
        </span>
        <span className="status-separator">•</span>
        <span className="status-tag">
          {`Payment ${label.toLowerCase()}`}
        </span>
        {amount !== null && (
          <>
            <span className="status-separator">•</span>
            <span className="amount-tag">₹{amount}</span>
          </>
        )}
      </div>
    </div>
  );
};
