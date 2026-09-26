import React from 'react';
import { Banknote, CheckCircle2, Clock } from 'lucide-react';
import { PAYMENT_STATUS } from '@/types/orderTypes';
import './PaymentStatusBadge.scss';

export const PaymentStatusBadge = ({
  paymentStatus = PAYMENT_STATUS.PENDING,
  paymentMethod = 'COD',
  amount = null,
  compact = false
}) => {
  const isCollected = paymentStatus === PAYMENT_STATUS.COLLECTED || paymentStatus === 'Paid';

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
          {isCollected ? 'Payment Collected' : 'Payment Pending'}
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
