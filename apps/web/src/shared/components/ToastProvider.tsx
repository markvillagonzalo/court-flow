import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cx } from '../lib/classNames';
import sharedStyles from '../styles/components.module.css';

type ToastTone = 'success' | 'error';
type ToastItem = { id: number; tone: ToastTone; message: string };
type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const add = useCallback((tone: ToastTone, message: string) => {
    const id = ++nextId.current;
    setToasts((current) => [...current, { id, tone, message }]);
    const duration = tone === 'success' ? 4000 : 7000;
    timers.current.set(id, window.setTimeout(() => dismiss(id), duration));
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (message) => add('success', message),
    error: (message) => add('error', message),
  }), [add]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={cx('toast-region', sharedStyles)} aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(`toast toast-${toast.tone}`, sharedStyles)}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
            aria-atomic="true"
          >
            {toast.tone === 'success'
              ? <CheckCircle2 size={18} aria-hidden="true" />
              : <AlertCircle size={18} aria-hidden="true" />}
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used within a ToastProvider');
  return toast;
}
