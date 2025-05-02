import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  message: string;
  type: ToastType;
  id: number;
  isLeaving?: boolean;
  isVisible?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const getAlertColor = (type: ToastType): string => {
  switch (type) {
    case 'success': return '#E9F7F3';
    case 'error': return '#FEF2F3';
    case 'warning': return '#FEF7E8';
    case 'info': return '#EBF5FF';
    default: return '#EBF5FF';
  }
};

const getBorderColor = (type: ToastType): string => {
  switch (type) {
    case 'success': return '#EAEFEE';
    case 'error': return '#FFF8F7';
    case 'warning': return '#F9F2E9';
    case 'info': return '#E6EBF1';
    default: return '#E6EBF1';
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    const newToast: Toast = { message, type, id, isVisible: false };
    setToasts(prev => [...prev, newToast]);

    // Trigger enter animation on next tick
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isVisible: true } : t));
    }, 10);

    // After 3 seconds → start exit animation
    setTimeout(() => {
      setToasts(prev =>
        prev.map(t => (t.id === id ? { ...t, isLeaving: true } : t))
      );
    }, 3000);

    // After exit animation → remove toast
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            data-theme="light"
            style={{
              '--alert-color': getAlertColor(toast.type),
              border: `1px solid ${getBorderColor(toast.type)}`,
            } as React.CSSProperties}
            className={`alert shadow-lg w-auto max-w-md transition-all duration-700 ease-in-out transform
              ${toast.isLeaving ? 'opacity-0 translate-y-4' : toast.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
          >
            <span className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}