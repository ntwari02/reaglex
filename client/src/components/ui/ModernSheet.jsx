import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Bottom sheet / modal for mobile settings and forms.
 */
export default function ModernSheet({ open, onClose, title, subtitle, children, tall = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="rx-sheet-portal" role="presentation">
          <motion.button
            type="button"
            className="rx-sheet-backdrop"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rx-sheet-title"
            className={`rx-sheet-panel${tall ? ' rx-sheet-panel--tall' : ''}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="rx-sheet-handle" aria-hidden />
            <header className="rx-sheet-header">
              <div className="min-w-0 flex-1">
                <h2 id="rx-sheet-title" className="rx-sheet-title">
                  {title}
                </h2>
                {subtitle && <p className="rx-sheet-subtitle">{subtitle}</p>}
              </div>
              <button type="button" className="rx-sheet-close" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <div className="rx-sheet-body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
