import React from 'react';
import { TbCash as Banknote, TbShieldCheck as ShieldCheck } from 'react-icons/tb';
import './CODPaymentCard.scss';

export const CODPaymentCard = ({
  amount = 0,
  selected = true,
  onSelect = () => {}
}) => {
  return (
    <div className="pmart-cod-payment-card">
      <div className="card-header-bar">
        <span className="section-label">Payment Method</span>
        <span className="online-disabled-note">Online payments currently unavailable</span>
      </div>

      <div
        className={`payment-method-row ${selected ? 'is-selected' : ''}`}
        onClick={onSelect}
        role="button"
        tabIndex={0}
      >
        <div className="radio-indicator">
          <div className="radio-dot" />
        </div>

        <div className="method-icon-box">
          <Banknote size={22} />
        </div>

        <div className="method-info">
          <div className="method-title-line">
            <span className="method-name">Cash on Delivery (COD)</span>
            <span className="recommended-pill">Available</span>
          </div>
          <p className="method-description">
            Pay with cash or exact change when our delivery partner arrives at your doorstep.
          </p>
          <div className="security-reassurance">
            <ShieldCheck size={14} className="shield" />
            <span>Zero online transaction fee • Pay only after receiving groceries</span>
          </div>
        </div>

        <div className="payable-amount-box">
          <span className="amount-caption">To Pay:</span>
          <span className="amount-value">₹{amount}</span>
        </div>
      </div>
    </div>
  );
};
