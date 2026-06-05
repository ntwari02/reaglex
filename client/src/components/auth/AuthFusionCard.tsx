import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Glass card shell for auth routes that render outside AuthPage */
export default function AuthFusionCard({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const cardFade = reduceMotion
    ? { initial: false as const, animate: false as const }
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45 } };

  return (
    <motion.div className="auth-fusion__card" {...cardFade}>
      {children}
    </motion.div>
  );
}
