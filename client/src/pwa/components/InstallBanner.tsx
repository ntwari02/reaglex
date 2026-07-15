import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { useInstallPrompt } from '../useInstallPrompt';
import { haptic } from '../haptics';
import '../../styles/pwa-install-banner.css';

export default function InstallBanner() {
  const { canInstall, dismissed, installed, promptInstall, dismiss } = useInstallPrompt();

  const show = canInstall && !installed && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="pwa-install-wrap"
          role="dialog"
          aria-labelledby="pwa-install-title"
          aria-describedby="pwa-install-desc"
        >
          <div className="pwa-install-card">
            <button
              type="button"
              className="pwa-install-card__close"
              aria-label="Not now — hide install prompt"
              title="Not now"
              onClick={() => {
                haptic('tap');
                dismiss();
              }}
            >
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>

            <div className="pwa-install-card__icon" aria-hidden>
              <Smartphone size={18} strokeWidth={2} />
            </div>

            <div className="pwa-install-card__text">
              <p id="pwa-install-title" className="pwa-install-card__title">
                Install Spacilly
              </p>
              <p id="pwa-install-desc" className="pwa-install-card__sub">
                Quick access from your home screen
              </p>
            </div>

            <button
              type="button"
              className="pwa-install-card__cta"
              onClick={() => {
                haptic('selection');
                void promptInstall();
              }}
            >
              <Download size={12} strokeWidth={2.5} aria-hidden />
              Install
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
