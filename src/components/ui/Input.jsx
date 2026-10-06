import React, { forwardRef } from 'react';

export const Input = forwardRef(({ className = '', error, icon: Icon, ...props }, ref) => {
  return (
    <div className="input-wrapper">
      {Icon && <Icon className="input-icon" />}
      <input
        ref={ref}
        className={`form-control ${Icon ? 'has-icon' : ''} ${error ? 'is-invalid' : ''} ${className}`.trim()}
        {...props}
      />
    </div>
  );
});
Input.displayName = 'Input';
