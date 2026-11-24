import React from 'react';

export default function Input({
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  error,
  className = '',
  icon: Icon,
  step,
  min,
  max
}) {
  return (
    <div className="relative w-full">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#929071]">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        step={step}
        min={min}
        max={max}
        className={`w-full rounded-lg bg-[#FFF8F1] border ${
          error ? 'border-red-500 ring-1 ring-red-500' : 'border-[#EBD9CB] focus:border-[#C66B45] focus:ring-1 focus:ring-[#C66B45]'
        } text-[#553729] placeholder-[#929071]/60 text-sm py-2 ${
          Icon ? 'pl-9' : 'pl-3.5'
        } pr-3.5 transition-colors focus:outline-none disabled:bg-[#FCE6D8]/30 disabled:cursor-not-allowed ${className}`}
      />
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
