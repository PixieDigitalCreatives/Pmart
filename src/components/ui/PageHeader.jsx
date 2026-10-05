import React from 'react';

export const PageHeader = ({ title, subtitle, action, breadcrumbs }) => {
  return (
    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        {breadcrumbs && <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '8px' }}>{breadcrumbs}</div>}
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#17191F' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', color: '#6B7280' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
