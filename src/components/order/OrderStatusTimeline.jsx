import React from 'react';
import { Check, CircleDot } from 'lucide-react';
import { ORDER_PROGRESSION_STAGES, ORDER_STATUS, getCustomerOrderStatus } from '@/types/orderTypes';
import './OrderStatusTimeline.scss';

export const OrderStatusTimeline = ({
  status = ORDER_STATUS.PENDING,
  timeline = null,
  compact = false
}) => {
  const normStatus = getCustomerOrderStatus(status);

  // Use raw history from backend if available, or fall back to timeline objects
  const history = Array.isArray(timeline) ? timeline : [];
  
  if (normStatus === ORDER_STATUS.CANCELLED) {
    const cancelTime = history.find(t => getCustomerOrderStatus(t.status) === ORDER_STATUS.CANCELLED)?.changedAt;
    const placedTime = history.find(t => getCustomerOrderStatus(t.status) === ORDER_STATUS.PENDING)?.changedAt;
    
    return (
      <div className={`pmart-order-status-timeline ${compact ? 'compact-mode' : ''}`}>
        <div className="timeline-header-bar" style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}>
          <h4 className="timeline-title" style={{ color: '#991b1b' }}>Order Cancelled</h4>
        </div>
        <div className="stages-list">
          <div className="timeline-step-row is-done">
            <div className="indicator-column">
              <div className="circle-node"><Check size={13} className="check-svg" /></div>
              <div className="connector-line filled" />
            </div>
            <div className="content-column">
              <div className="stage-label-row">
                <span className="stage-name">ORDER PLACED</span>
                <span className="stage-time">
                  {placedTime ? new Date(placedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completed'}
                </span>
              </div>
              {!compact && <p className="stage-description">Order placed by customer</p>}
            </div>
          </div>
          <div className="timeline-step-row is-current">
            <div className="indicator-column">
              <div className="circle-node" style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }}><CircleDot size={13} /></div>
            </div>
            <div className="content-column">
              <div className="stage-label-row">
                <span className="stage-name" style={{ color: '#ef4444' }}>ORDER CANCELLED</span>
                <span className="stage-time">
                  {cancelTime ? new Date(cancelTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress'}
                </span>
              </div>
              {!compact && <p className="stage-description">This order was cancelled</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Find current active stage based on current status
  const currentStageIndex = Math.max(0, ORDER_PROGRESSION_STAGES.findIndex(s => s.key === normStatus));

  return (
    <div className={`pmart-order-status-timeline ${compact ? 'compact-mode' : ''}`}>
      <div className="timeline-header-bar">
        <h4 className="timeline-title">Order Status Progression</h4>
        <span className="current-stage-tag">{ORDER_PROGRESSION_STAGES[currentStageIndex]?.label || normStatus}</span>
      </div>

      <div className="stages-list">
        {ORDER_PROGRESSION_STAGES.map((stage, idx) => {
          // Look for actual backend history entry for timestamp
          const matchedTimelineItem = history.find(
            t => t.status === stage.key || 
                 (t.stageKey && t.stageKey === stage.key)
          );

          const isDone = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const isPending = idx > currentStageIndex;

          let timeDisplay = isDone ? 'Completed' : isCurrent ? 'In progress' : 'Pending';
          const rawTime = matchedTimelineItem?.changedAt || matchedTimelineItem?.timestamp;
          
          if (rawTime && (isDone || isCurrent)) {
            const d = new Date(rawTime);
            if (!Number.isNaN(d.getTime())) {
              timeDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }

          return (
            <div
              key={stage.key}
              className={`timeline-step-row ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''} ${isPending ? 'is-pending' : ''}`}
            >
              <div className="indicator-column">
                <div className="circle-node">
                  {isDone ? (
                    <Check size={13} className="check-svg" />
                  ) : isCurrent ? (
                    <CircleDot size={13} className="current-svg" />
                  ) : (
                    <span className="step-idx">{idx + 1}</span>
                  )}
                </div>
                {idx < ORDER_PROGRESSION_STAGES.length - 1 && (
                  <div className={`connector-line ${isDone ? 'filled' : ''}`} />
                )}
              </div>

              <div className="content-column">
                <div className="stage-label-row">
                  <span className="stage-name">{stage.label}</span>
                  <span className="stage-time">{timeDisplay}</span>
                </div>
                {!compact && (
                  <p className="stage-description">{stage.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
