import React from 'react';

export const FormField = ({ label, hint, error, children, className = '' }) => {
  return (
    <div className={`form-group ${className}`.trim()}>
      {label && <label>{label}</label>}
      {children}
      {error && <div className="form-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
};
