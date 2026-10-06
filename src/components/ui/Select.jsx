import React, { forwardRef } from 'react';

export const Select = forwardRef(({ className = '', error, options = [], children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={`form-select ${error ? 'is-invalid' : ''} ${className}`.trim()}
      {...props}
    >
      {children || options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
});
Select.displayName = 'Select';
