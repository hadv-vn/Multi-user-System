'use client';

import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';

export type ToastVariant = 'success' | 'error';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

export interface ToastContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const SUCCESS_AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, variant, message }]);
      if (variant === 'success') {
        setTimeout(() => dismiss(id), SUCCESS_AUTO_DISMISS_MS);
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showSuccess: (message) => push('success', message),
      showError: (message) => push('error', message),
    }),
    [push],
  );

  function renderToast(toast: ToastItem) {
    return (
      <div
        key={toast.id}
        role={toast.variant === 'error' ? 'alert' : 'status'}
        className={`pointer-events-auto flex items-center gap-2 rounded-xl border bg-surface-glass px-4 py-3 text-sm shadow-lg backdrop-blur-xl transition-all duration-200 ${
          toast.variant === 'success' ? 'border-neon-success/40' : 'border-neon-danger/40'
        }`}
      >
        <span
          aria-hidden="true"
          className={toast.variant === 'success' ? 'text-neon-success' : 'text-neon-danger'}
        >
          {toast.variant === 'success' ? '✓' : '⚠'}
        </span>
        <span className="text-slate-200">{toast.message}</span>
        {toast.variant === 'error' ? (
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Đóng thông báo"
            className="ml-2 text-slate-400 hover:text-slate-100"
          >
            ✕
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
        {/* Lỗi nghiêm trọng dùng aria-live="assertive" để screen reader ngắt
            ngang đọc ngay; thành công dùng "polite" — theo mục Accessibility
            của ui-wireframes-multi-user-system.md. */}
        <div aria-live="assertive" className="flex flex-col gap-2">
          {toasts.filter((toast) => toast.variant === 'error').map(renderToast)}
        </div>
        <div aria-live="polite" className="flex flex-col gap-2">
          {toasts.filter((toast) => toast.variant === 'success').map(renderToast)}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
