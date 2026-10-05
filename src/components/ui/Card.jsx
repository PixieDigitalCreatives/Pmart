import React from 'react';

export const Card = ({ children, className = '', padding = '20px', ...props }) => {
  return (
    <div className={`pmart-card ${className}`.trim()} style={{ padding }} {...props}>
      {children}
    </div>
  );
};
