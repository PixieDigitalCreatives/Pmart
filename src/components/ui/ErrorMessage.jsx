import React from 'react';
import { TbAlertCircle as AlertCircle } from 'react-icons/tb';
import { Button } from '@/components/ui';

export const ErrorMessage = ({ title = 'Error', message, onRetry }) => {
  return (
    <div className="error-message">
      <AlertCircle size={20} className="error-message-icon" />
      <div className="error-message-content">
        <h4>{title}</h4>
        <p>{message}</p>
        {onRetry && (
          <Button onClick={onRetry} className="error-message-retry">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};
