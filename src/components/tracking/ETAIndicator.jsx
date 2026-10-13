import React from 'react';
import { Clock, Navigation } from 'lucide-react';
import './ETAIndicator.scss';

export const ETAIndicator = ({
  etaMinutes,
  distanceKm
}) => {
  const getEtaHeadline = () => {
    if (etaMinutes === undefined || etaMinutes === null) return 'Calculating ETA...';
    if (etaMinutes <= 2) return 'Arriving any moment!';
    if (etaMinutes <= 5) return `Arriving in ${etaMinutes} mins`;
    return `${etaMinutes} mins away`;
  };

  const getSubtext = () => {
    if (etaMinutes === undefined || etaMinutes === null) return 'Waiting for rider location...';
    if (etaMinutes <= 2) return 'Your delivery partner is almost there';
    if (etaMinutes <= 5) return 'Approaching your location via fastest route';
    return 'Your delivery partner is on the way';
  };

  return (
    <div className="pmart-eta-indicator">
      <div className="eta-main-group">
        <div className="eta-clock-icon-wrap">
          <Clock size={20} className="clock-icon" />
        </div>
        <div>
          <div className="eta-headline">{getEtaHeadline()}</div>
          <div className="eta-subtext">{getSubtext()}</div>
        </div>
      </div>

      <div className="eta-distance-pill">
        <Navigation size={13} className="dist-icon" />
        <span>{distanceKm !== undefined && distanceKm !== null ? `${distanceKm} km away` : 'Distance unavailable'}</span>
      </div>
    </div>
  );
};
