import React from 'react';

export default function Loader({ message = 'Loading institutional records...', size = 'md' }) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className={`animate-spin rounded-full border-[#EBD9CB] border-t-[#C66B45] ${sizeClasses[size]}`}></div>
      {message && <p className="mt-3 text-sm text-[#553729] font-medium opacity-80">{message}</p>}
    </div>
  );
}
