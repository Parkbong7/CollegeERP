import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function Select({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  error,
  className = ''
}) {
  return (
    <div className="relative w-full">
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`w-full appearance-none rounded-lg bg-[#FFF8F1] border ${
          error ? 'border-red-500 ring-1 ring-red-500' : 'border-[#EBD9CB] focus:border-[#C66B45] focus:ring-1 focus:ring-[#C66B45]'
        } text-[#553729] text-sm py-2 pl-3.5 pr-9 transition-colors focus:outline-none disabled:bg-[#FCE6D8]/30 disabled:cursor-not-allowed ${className}`}
      >
        <option value="" disabled className="text-gray-400">
          {placeholder}
        </option>
        {options.map((opt, idx) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const label = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={idx} value={val} className="text-[#553729]">
              {label}
            </option>
          );
        })}
      </select>
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#929071]">
        <ChevronDown className="w-4 h-4" />
      </div>
      {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
