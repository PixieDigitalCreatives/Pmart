import React from 'react';

export const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 20px',
      textAlign: 'center',
      background: '#F9FAFB',
      borderRadius: '12px',
      border: '1px dashed #D1D5DB'
    }}>
      {Icon && <div style={{ color: '#9CA3AF', marginBottom: '16px' }}><Icon size={48} /></div>}
      <h3 style={{ margin: '0 0 8px', fontSize: '1.125rem', color: '#17191F' }}>{title}</h3>
      {description && <p style={{ margin: '0 0 20px', color: '#6B7280', maxWidth: '400px' }}>{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
};
