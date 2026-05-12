import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Wraps the routed view in a subtle native-app transition. Keeps key on
 * `location.pathname` so each new route gets a fresh enter animation,
 * without changing scroll behavior (ScrollToTop continues to work).
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: EASE }}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
