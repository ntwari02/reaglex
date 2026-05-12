import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useSwUpdate } from '../useSwUpdate';
import { haptic } from '../haptics';

export default function UpdateBanner() {
  const { hasUpdate, applyUpdate } = useSwUpdate();

  return (
    <AnimatePresence>
      {hasUpdate && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-24px)] sm:w-[440px] max-w-[92vw]"
          role="status"
          aria-live="polite"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-2xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(16,185,129,0.94) 0%, rgba(6,182,212,0.94) 100%)',
              boxShadow: '0 20px 50px rgba(16,185,129,0.45)',
            }}
          >
            <Sparkles className="h-5 w-5 text-white flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">New version available</p>
              <p className="text-xs text-white/85 leading-tight">
                Reload to get the latest features and fixes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                haptic('selection');
                applyUpdate();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reload
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
