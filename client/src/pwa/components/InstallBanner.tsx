import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Sparkles } from 'lucide-react';
import { useInstallPrompt } from '../useInstallPrompt';
import { haptic } from '../haptics';

export default function InstallBanner() {
  const { canInstall, dismissed, installed, promptInstall, dismiss } = useInstallPrompt();

  const show = canInstall && !installed && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-1/2 -translate-x-1/2 z-[60] bottom-20 sm:bottom-6 w-[calc(100%-24px)] sm:w-[440px] max-w-[92vw]"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-2xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.86) 100%)',
              border: '1px solid rgba(148,163,184,0.22)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                boxShadow: '0 8px 20px rgba(16,185,129,0.45)',
              }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Install Reaglex</p>
              <p className="text-xs text-white/60 leading-tight">
                Faster shopping, offline access & native notifications.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                haptic('selection');
                void promptInstall();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
            >
              <Download className="h-3.5 w-3.5" /> Install
            </button>
            <button
              type="button"
              aria-label="Dismiss install prompt"
              onClick={() => {
                haptic('tap');
                dismiss();
              }}
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:text-white"
              style={{ background: 'rgba(148,163,184,0.12)' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
