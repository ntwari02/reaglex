import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore, type ToastType } from '../stores/toastStore';

export function ToastNotification() {
  const { toasts, removeToast } = useToastStore();

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bg: 'bg-green-500',
          iconColor: 'text-white',
        };
      case 'error':
        return {
          icon: AlertCircle,
          bg: 'bg-red-500',
          iconColor: 'text-white',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bg: 'bg-amber-500',
          iconColor: 'text-white',
        };
      case 'info':
        return {
          icon: Info,
          bg: 'bg-blue-500',
          iconColor: 'text-white',
        };
      default:
        return {
          icon: CheckCircle,
          bg: 'bg-green-500',
          iconColor: 'text-white',
        };
    }
  };

  return (
    <div className="fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex flex-col gap-2 items-center">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const styles = getToastStyles(toast.type);
            const Icon = styles.icon;

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={`${styles.bg} text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-[90vw] sm:max-w-md pointer-events-auto`}
              >
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.iconColor} flex-shrink-0`} />
                <span className="font-medium text-sm sm:text-base truncate flex-1">
                  {toast.message}
                </span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:bg-white/20 rounded transition-colors flex-shrink-0"
                  aria-label="Close notification"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

