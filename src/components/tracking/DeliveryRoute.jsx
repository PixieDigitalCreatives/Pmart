import React from 'react';

export const DeliveryRoute = ({ points = [], trafficPoints = [] }) => {
  if (!points || points.length < 2) return null;

  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <g className="pmart-delivery-route-svg">
      {/* Route Outer Soft Border / Casing */}
      <polyline
        points={pointsString}
        fill="none"
        stroke="#1558d6"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />

      {/* Main Google Maps Navigation Blue Route Polyline */}
      <polyline
        points={pointsString}
        fill="none"
        stroke="#1a73e8"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Subtle Directional Chevrons */}
      <polyline
        points={pointsString}
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeDasharray="4 12"
        strokeLinecap="round"
        style={{ animation: 'routeFlow 1.5s linear infinite' }}
      />
    </g>
  );
};
