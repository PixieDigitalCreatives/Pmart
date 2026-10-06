import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ErrorMessage = ({ title = 'Error', message, onRetry }) => {
  return (
    <div className="error-message">
      <AlertCircle size={20} className="error-message-icon" />
      <div className="error-message-content">
        <h4>{title}</h4>
        <p>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="error-message-retry">
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
