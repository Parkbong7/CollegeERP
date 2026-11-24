import React from 'react';

export default function FormField({
  label,
  required = false,
  error,
  helpText,
  children,
  className = ''
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#553729]/80">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {helpText && !error && (
        <p className="text-xs text-[#929071]">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}
