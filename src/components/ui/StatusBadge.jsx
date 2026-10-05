import React from 'react';

export const StatusBadge = ({ status, text, type = 'neutral', className = '' }) => {
  let finalType = type;
  if (finalType === 'neutral' && status) {
    const s = status.toLowerCase();
    if (s.includes('success') || s.includes('delivered') || s.includes('active') || s.includes('completed') || s.includes('accepted')) finalType = 'success';
    else if (s.includes('warn') || s.includes('pending') || s.includes('preparing') || s.includes('out_for_delivery') || s.includes('assigned')) finalType = 'warning';
    else if (s.includes('error') || s.includes('fail') || s.includes('cancel') || s.includes('reject') || s.includes('inactive')) finalType = 'error';
    else if (s.includes('info') || s.includes('new')) finalType = 'info';
  }

  return (
    <span className={`badge badge-${finalType} ${className}`.trim()}>
      {text || status}
    </span>
  );
};
