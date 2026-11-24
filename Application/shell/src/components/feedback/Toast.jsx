import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showSuccess: (msg) => addToast(msg, 'success'), showError: (msg) => addToast(msg, 'error') }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start p-3.5 rounded-xl border shadow-lg text-sm transition-all duration-200 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-[#dcfce7] border-[#86efac] text-[#15803d]'
                : 'bg-[#fee2e2] border-[#fca5a5] text-[#b91c1c]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 mr-2.5 flex-shrink-0 text-[#16a34a]" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2.5 flex-shrink-0 text-[#dc2626]" />
            )}
            <p className="flex-1 font-medium leading-snug">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-current opacity-60 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showSuccess: (msg) => console.log('Toast Success:', msg),
      showError: (msg) => console.error('Toast Error:', msg)
    };
  }
  return context;
}
