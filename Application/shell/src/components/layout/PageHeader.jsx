import React from 'react';
import Breadcrumb from '../common/Breadcrumb';

export default function PageHeader({
  title,
  subtitle,
  breadcrumbItems,
  actions,
  className = ''
}) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbItems && <Breadcrumb items={breadcrumbItems} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#553729] tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[#929071] mt-1 font-medium">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center space-x-3">{actions}</div>}
      </div>
    </div>
  );
}
