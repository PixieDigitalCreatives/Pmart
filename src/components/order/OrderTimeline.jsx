import React from 'react';
import { CheckCircle2, Clock, CircleDot, Bike, PackageCheck, ChefHat, Check } from 'lucide-react';
import './OrderTimeline.scss';

export const OrderTimeline = ({ timeline = [], status, deliveryOtp }) => {
  return (
    <div className="order-timeline-card">
      <div className="timeline-header">
        <div className="status-label-group">
          <span className="live-pulse-dot" />
          <h4 className="timeline-heading">Live Order Status</h4>
        </div>

        {deliveryOtp && (
          <div className="delivery-otp-pill">
            <span className="otp-label">Delivery OTP:</span>
            <span className="otp-code">{deliveryOtp}</span>
          </div>
        )}
      </div>

      <div className="timeline-steps-container">
        {timeline.map((step, index) => {
          const isDone = step.completed;
          const isCurrent = step.current;

          return (
            <div
              key={index}
              className={`timeline-step-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="step-indicator-wrapper">
                <div className="step-circle">
                  {isDone ? (
                    <Check size={14} className="check-icon" />
                  ) : isCurrent ? (
                    <CircleDot size={14} className="current-icon" />
                  ) : (
                    <span className="step-number">{index + 1}</span>
                  )}
                </div>
                {index < timeline.length - 1 && (
                  <div className={`step-connector-line ${isDone ? 'filled' : ''}`} />
                )}
              </div>

              <div className="step-content">
                <div className="step-name">{step.status}</div>
                <div className="step-time">{step.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
