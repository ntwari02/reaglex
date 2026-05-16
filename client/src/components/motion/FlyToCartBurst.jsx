import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotionUi } from '../../stores/motionUiStore';
import { EASE_OUT_EXPO } from '../../motion/presets';

export default function FlyToCartBurst() {
  const flyBurst = useMotionUi((s) => s.flyBurst);
  const clearFlyBurst = useMotionUi((s) => s.clearFlyBurst);

  useEffect(() => {
    if (!flyBurst) return undefined;
    const t = window.setTimeout(clearFlyBurst, 720);
    return () => window.clearTimeout(t);
  }, [flyBurst, clearFlyBurst]);

  if (!flyBurst) return null;

  const cartEl = document.querySelector('[data-cart-target="badge"]');
  const cartRect = cartEl?.getBoundingClientRect();
  const toX = cartRect ? cartRect.left + cartRect.width / 2 : window.innerWidth - 48;
  const toY = cartRect ? cartRect.top + cartRect.height / 2 : 28;
  const fromX = flyBurst.from?.x ?? window.innerWidth / 2;
  const fromY = flyBurst.from?.y ?? window.innerHeight / 2;

  return (
    <AnimatePresence>
      <motion.div
        key={flyBurst.at}
        className="fixed z-[250] pointer-events-none"
        initial={{ left: fromX, top: fromY, x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
        animate={{
          left: toX,
          top: toY,
          scale: 0.2,
          opacity: 0.15,
        }}
        exit={{ opacity: 0, scale: 0 }}
        transition={{ duration: 0.62, ease: EASE_OUT_EXPO }}
      >
        <motion.div
          className="h-14 w-14 overflow-hidden rounded-2xl"
          style={{
            boxShadow: '0 12px 40px color-mix(in srgb, var(--brand-primary) 45%, transparent)',
            border: '2px solid color-mix(in srgb, var(--brand-primary) 60%, white)',
          }}
        >
          {flyBurst.src && (
            <img src={flyBurst.src} alt="" className="h-full w-full object-cover" />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
