/**
 * Framer Motion variants for admin logistics pages (distinct from support)
 */

export const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export const cardSlideUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: (i: number) => ({ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }),
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

export const tabHoverTap = {
  rest: { scale: 1 },
  hover: { scale: 1.03 },
  tap: { scale: 0.98 },
};

export const listRowStagger = (i: number) => ({
  initial: { opacity: 0, x: -12 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
});

export const metricCardHover = {
  rest: { y: 0, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)' },
  hover: { y: -2, boxShadow: '0 12px 28px -8px rgb(0 0 0 / 0.15)' },
  tap: { y: 0, scale: 0.99 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export const slideInFromRight = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
};
