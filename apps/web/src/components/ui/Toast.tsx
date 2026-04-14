import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { addToast, removeToast } from '../../store/slices/uiSlice';
import type { ToastType } from '../../store/slices/uiSlice';
import { cn } from '../../lib/utils';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export { ToastType };

const icons = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
  warning: AlertTriangle,
} as const;

const styles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white shadow-[0_18px_44px_-24px_rgb(22_163_74/.75)]',
  error:   'bg-destructive text-destructive-foreground shadow-[0_18px_44px_-24px_rgb(220_38_38/.7)]',
  warning: 'bg-amber-500 text-white shadow-[0_18px_44px_-24px_rgb(245_158_11/.7)]',
  info:    'bg-card text-card-foreground border border-border shadow-[0_14px_35px_-26px_hsl(var(--foreground)/0.55)]',
};

// Isolated component — prevents setTimeout from re-firing on parent re-renders
function ToastItem({ id, message, type }: { id: string; message: string; type: ToastType }) {
  const dispatch = useAppDispatch();
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => dispatch(removeToast(id)), 4_000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [id, dispatch]);

  const Icon = icons[type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
        'pointer-events-auto animate-fade-in min-w-[260px] max-w-sm',
        styles[type]
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => dispatch(removeToast(id))}
        aria-label="Dismiss notification"
        className="opacity-70 hover:opacity-100 transition-opacity ml-1 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toasts = useAppSelector((s) => s.ui.toasts);

  return (
    <>
      {children}
      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => <ToastItem key={t.id} {...t} />)}
      </div>
    </>
  );
}

export function useToast() {
  const dispatch = useAppDispatch();
  return (message: string, type: ToastType = 'info') => {
    dispatch(addToast({ message, type }));
  };
}
