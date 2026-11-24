import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange
}) {
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#FFF8F1] border-t border-[#EBD9CB] text-xs text-[#553729]">
      <div>
        Showing <span className="font-semibold text-[#553729]">{totalItems > 0 ? startItem : 0}</span> to{' '}
        <span className="font-semibold text-[#553729]">{endItem}</span> of{' '}
        <span className="font-semibold text-[#553729]">{totalItems}</span> records
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-[#EBD9CB] bg-[#FFF8F1] text-[#553729] hover:bg-[#FCE6D8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2 font-medium">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-[#EBD9CB] bg-[#FFF8F1] text-[#553729] hover:bg-[#FCE6D8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
