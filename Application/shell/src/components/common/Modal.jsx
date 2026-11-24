import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl'
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#553729]/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className={`relative transform overflow-hidden rounded-2xl bg-[#FFF8F1] border border-[#EBD9CB] text-left shadow-2xl transition-all sm:my-8 w-full ${maxWidth}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-[#EBD9CB] px-6 py-4 bg-[#FCE6D8]/50">
            <div>
              <h3 className="text-lg font-bold text-[#553729]">{title}</h3>
              {subtitle && <p className="text-xs text-[#929071] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-[#553729]/60 hover:text-[#553729] hover:bg-[#F5D2C2] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
