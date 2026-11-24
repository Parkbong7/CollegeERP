import React from 'react';
import Loader from '../common/Loader';
import EmptyState from '../common/EmptyState';
import Pagination from './Pagination';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No matching records found',
  pagination,
  onRowClick,
  className = ''
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-[#EBD9CB] bg-[#FFF8F1] shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#EBD9CB] text-left text-sm">
          <thead className="bg-[#FCE6D8]/60 text-xs uppercase tracking-wider text-[#553729] font-bold">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3.5 font-bold ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EBD9CB]/60 bg-[#FFF8F1]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12">
                  <Loader message="Loading data from database..." size="md" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8">
                  <EmptyState title={emptyMessage} description="Try refining your filter criteria." />
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors hover:bg-[#FCE6D8]/30 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-4 py-3 text-sm text-[#553729] ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
