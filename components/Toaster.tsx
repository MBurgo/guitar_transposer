"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type Toast = { id: number; msg: string; duration: number };
type ToastContextValue = { toast: (msg: string, opts?: { duration?: number }) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const toast = useCallback((msg: string, opts?: { duration?: number }) => {
    const id = idRef.current++;
    const duration = Math.max(800, Math.min(60000, opts?.duration ?? 1600));
    setToasts((prev) => [...prev, { id, msg, duration }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* ARIA live region (non-blocking) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center"
      >
        <div className="flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto rounded-xl border border-border bg-card/95 px-3 py-2 text-sm shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/75"
            >
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue["toast"] {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToasterProvider");
  return ctx.toast;
}
