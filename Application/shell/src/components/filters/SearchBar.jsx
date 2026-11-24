import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search records by name, ID or code...',
  onClear,
  className = ''
}) {
  return (
    <div className={`relative flex-1 ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#929071]">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#FFF8F1] border border-[#EBD9CB] rounded-lg pl-9 pr-9 py-2 text-sm text-[#553729] placeholder-[#929071]/60 focus:outline-none focus:border-[#C66B45] focus:ring-1 focus:ring-[#C66B45] transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#929071] hover:text-[#553729]"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
