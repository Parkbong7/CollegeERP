import React from 'react';

export default function StatusBadge({ status = 'active', text }) {
  const normalized = (status || '').toLowerCase();

  const styles = {
    active: 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]',
    inactive: 'bg-[#f1f5f9] text-[#64748b] border-[#e2e8f0]',
    archived: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]',
    graduated: 'bg-[#e0e7ff] text-[#4338ca] border-[#c7d2fe]',
    suspended: 'bg-[#fee2e2] text-[#b91c1c] border-[#fecaca]'
  };

  const currentStyle = styles[normalized] || styles.active;
  const label = text || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-70"></span>
      {label}
    </span>
  );
}
