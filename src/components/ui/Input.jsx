import React, { forwardRef } from 'react';

export const Input = forwardRef(({ className = '', error, icon: Icon, ...props }, ref) => {
  return (
    <div className="input-wrapper" style={{ position: 'relative', width: '100%' }}>
      {Icon && <Icon className="input-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', width: '18px', height: '18px', zIndex: 1 }} />}
      <input
        ref={ref}
        className={`form-control ${error ? 'is-invalid' : ''} ${className}`.trim()}
        style={{ paddingLeft: Icon ? '38px' : '14px', borderColor: error ? '#EF4444' : undefined }}
        {...props}
      />
    </div>
  );
});
Input.displayName = 'Input';
