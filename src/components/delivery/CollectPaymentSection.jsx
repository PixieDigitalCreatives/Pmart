import React, { useState } from 'react';
import { TbCash as Banknote, TbUser as User, TbAlertCircle as AlertCircle, TbCircleCheck as CheckCircle2, TbShieldCheck as ShieldCheck, TbLoader2 as Loader2 } from 'react-icons/tb';
import { deliveryService } from '@/services/deliveryService';
import './CollectPaymentSection.scss';
import { Button } from '@/components/ui';

export const CollectPaymentSection = ({
  order,
  onPaymentSuccess = () => {},
  isProcessing = false
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!order) return null;

  const hasValidAmount = order.totalAmount !== undefined && order.totalAmount !== null;
  const payableAmount = hasValidAmount ? order.totalAmount : 'Unavailable';
  const customerName = order.customer?.name || order.deliveryAddress?.recipientName || 'Customer';
  const paymentStatus = order.paymentStatus || 'PENDING';
  const isAlreadyCollected = paymentStatus === 'COLLECTED';

  const handleConfirmPayment = async () => {
    if (submitting || isProcessing || isAlreadyCollected || !hasValidAmount) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const result = await deliveryService.collectCash(order.id || order._id);
      onPaymentSuccess(result.order);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pmart-collect-payment-section">
      <div className="section-top-header">
        <div className="title-group">
          <div className="badge-chip">CASH COLLECTION</div>
          <h2 className="section-main-heading">Collect Payment</h2>
          <span className="order-ref-tag">Order #{order.orderNumber}</span>
        </div>
      </div>

      <div className="collect-card-body">
        {/* Dynamic Read-only Amount Hero */}
        <div className="amount-hero-banner">
          <div className="amount-left">
            <span className="amount-caption">Amount to Collect</span>
            <div className="amount-display">
              {hasValidAmount ? (
                <>
                  <span className="currency-symbol">₹</span>
                  <span className="amount-number">{payableAmount}</span>
                </>
              ) : (
                <span className="amount-unavailable-text">Amount unavailable</span>
              )}
            </div>
            <span className="non-editable-notice">Exact total calculated dynamically • Non-modifiable</span>
          </div>
          <div className="amount-icon-circle">
            <Banknote size={28} />
          </div>
        </div>

        {/* Customer & Payment Mode Grid */}
        <div className="details-metadata-grid">
          <div className="meta-box customer-box">
            <span className="meta-caption">Customer</span>
            <div className="meta-val customer-name">
              <User size={15} className="meta-icon" />
              <span>{customerName}</span>
            </div>
            <span className="phone-sub">{order.customer?.phone}</span>
          </div>

          <div className="meta-box method-box">
            <span className="meta-caption">Payment Method</span>
            <div className="meta-val font-semibold">
              <span>Cash on Delivery</span>
            </div>
            <span className="cod-badge">COD</span>
          </div>

          <div className="meta-box status-box">
            <span className="meta-caption">Payment Status</span>
            <div className={`status-pill ${isAlreadyCollected ? 'status-collected' : 'status-pending'}`}>
              <span className="status-dot" />
              <span>{isAlreadyCollected ? 'Payment Collected' : 'Payment Pending'}</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="payment-error-alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="payment-flow-reminder">
          <ShieldCheck size={16} className="reminder-shield" />
          <span>Confirm the cash is in hand before verifying the delivery code.</span>
        </div>

        {/* Primary Action Button */}
        <div className="action-button-wrapper">
          <Button
            type="button"
            className="payment-received-btn"
            onClick={handleConfirmPayment}
            disabled={submitting || isProcessing || isAlreadyCollected}
           size="full">
            {submitting ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Recording Payment...</span>
              </>
            ) : isAlreadyCollected ? (
              <>
                <CheckCircle2 size={18} />
                <span>Payment Already Collected</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Payment Received</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
