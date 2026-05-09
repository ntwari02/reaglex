import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { ToastState } from './types';

type Props = {
  toast: ToastState | null;
  onDismiss: () => void;
};

export function ToastNotification({ toast, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-[120] w-[min(420px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#111521] p-4 shadow-[0_10px_32px_rgba(0,0,0,0.45)]"
          role="status"
        >
          <div className="flex items-start gap-3">
            {toast.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-400" />
            )}
            <p className="flex-1 text-sm text-[var(--text-primary)]">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={onDismiss}
              className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
