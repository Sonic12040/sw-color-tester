import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TIMING } from "../../utils/config.js";
import styles from "./Toast.module.css";

export interface ToastMessage {
  id: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastProps) {
  const [hiding, setHiding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setHiding(true);
    timerRef.current = setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, TIMING.TOAST_DURATION_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  return (
    <div
      className={`${styles.toast} ${hiding ? styles.hiding : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.content}>
        <p className={styles.message}>{toast.message}</p>
        {toast.actionText && toast.onAction && (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              toast.onAction?.();
              dismiss();
            }}
          >
            {toast.actionText}
          </button>
        )}
        <button
          type="button"
          className={styles.close}
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Global toast emitter
type ToastListener = (toast: ToastMessage) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  show(message: string, options?: Omit<ToastMessage, "id" | "message">) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    listeners.forEach((fn) => fn({ id, message, ...options }));
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: ToastListener = (t) => setToasts((prev) => [...prev, t]);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className={styles.container} aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>,
    document.body,
  );
}
