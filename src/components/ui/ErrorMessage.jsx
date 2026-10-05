import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ErrorMessage = ({ title = 'Error', message, onRetry }) => {
  return (
    <div style={{
      backgroundColor: '#FEF2F2',
      border: '1px solid #FECACA',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      color: '#991B1B'
    }}>
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '0.875rem' }}>{title}</h4>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#B91C1C' }}>{message}</p>
        {onRetry && (
          <button 
            onClick={onRetry}
            style={{ 
              marginTop: '12px', 
              background: 'none', 
              border: '1px solid #FECACA', 
              borderRadius: '4px', 
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#991B1B',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
