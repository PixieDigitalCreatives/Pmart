import React from 'react';
import { CheckCircle2, Banknote, PackageCheck, ArrowRight } from 'lucide-react';
import './DeliveryCompletionScreen.scss';

export const DeliveryCompletionScreen = ({
  order,
  onViewOrder = () => {}
}) => {
  if (!order) return null;

  const grandTotal = order.billing?.grandTotal || 0;

  return (
    <div className="pmart-delivery-completion-screen">
      <div className="success-icon-badge">
        <CheckCircle2 size={48} className="check-svg" />
      </div>

      <h2 className="success-headline">Delivery Completed</h2>
      <p className="order-id-label">Order #{order.id}</p>

      <div className="summary-cards-container">
        {/* Payment Summary */}
        <div className="completion-card payment-card">
          <div className="card-icon-box">
            <Banknote size={20} />
          </div>
          <div className="card-info">
            <span className="card-title">Payment</span>
            <div className="amount-highlight">₹{grandTotal}</div>
            <span className="status-caption">Cash Collected</span>
          </div>
        </div>

        {/* Delivery Summary */}
        <div className="completion-card delivery-card">
          <div className="card-icon-box">
            <PackageCheck size={20} />
          </div>
          <div className="card-info">
            <span className="card-title">Delivery</span>
            <div className="delivery-status-highlight">Successfully Delivered</div>
            <span className="status-caption">Customer OTP Verified</span>
          </div>
        </div>
      </div>

      <div className="footer-actions-wrapper">
        <button
          type="button"
          className="btn btn-primary btn-lg btn-full view-order-btn"
          onClick={onViewOrder}
        >
          <span>View Order</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
