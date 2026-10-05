import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ text = 'Loading...', fullHeight = false }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '40px 20px',
      height: fullHeight ? '100%' : 'auto',
      minHeight: fullHeight ? '200px' : 'auto',
      color: '#6B7280'
    }}>
      <Loader2 size={32} className="spinner" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: '#F20D18' }} />
      <p>{text}</p>
    </div>
  );
};
