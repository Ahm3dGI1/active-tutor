import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((content, { type = 'info', duration = 3000 } = {}) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, content, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-1.5 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              className={`pointer-events-auto px-3 py-2 rounded-lg text-xs font-medium shadow-lg cursor-pointer transition
                ${t.type === 'error' ? 'bg-red-600 text-white'
                  : t.type === 'success' ? 'bg-emerald-600 text-white'
                  : 'bg-surface-800 text-white'}`}
            >
              {t.content}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
