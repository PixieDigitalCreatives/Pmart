import React from 'react';

export const PageHeader = ({ title, subtitle, action, breadcrumbs }) => {
  return (
    <div className="page-header">
      <div>
        {breadcrumbs && <div className="page-header-breadcrumbs">{breadcrumbs}</div>}
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
