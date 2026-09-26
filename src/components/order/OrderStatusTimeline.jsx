import React from 'react';
import { Check, CircleDot, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { ORDER_PROGRESSION_STAGES, normalizeOrderStatus, ORDER_STATUS } from '@/types/orderTypes';
import './OrderStatusTimeline.scss';

export const OrderStatusTimeline = ({
  status = ORDER_STATUS.PLACED,
  timeline = null,
  compact = false
}) => {
  const normStatus = normalizeOrderStatus(status);

  // If order provides custom timeline timestamps, merge them
  const statusKeyList = ORDER_PROGRESSION_STAGES.map(s => s.key);
  const activeIndex = Math.max(0, statusKeyList.indexOf(normStatus));

  return (
    <div className={`pmart-order-status-timeline ${compact ? 'compact-mode' : ''}`}>
      <div className="timeline-header-bar">
        <h4 className="timeline-title">Order Status Progression</h4>
        <span className="current-stage-tag">{ORDER_PROGRESSION_STAGES[activeIndex]?.label || normStatus}</span>
      </div>

      <div className="stages-list">
        {ORDER_PROGRESSION_STAGES.map((stage, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isPending = idx > activeIndex;

          const matchedTimelineItem = timeline?.find(
            t => (t.stageKey && t.stageKey === stage.key) ||
                 (t.status && t.status.toUpperCase().includes(stage.label.split(' ')[0]))
          );

          const timeDisplay = matchedTimelineItem?.time || (isDone ? 'Completed' : isCurrent ? 'In progress' : 'Pending');

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
                  <div className={`connector-line ${idx < activeIndex ? 'filled' : ''}`} />
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
