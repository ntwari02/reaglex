/**
 * Framer Motion variants for admin reviews center (distinct styling)
 */

export const pageTransition = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.06 },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const cardFadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: (i: number) => ({ delay: i * 0.05, duration: 0.36, ease: [0.25, 0.46, 0.45, 0.94] }),
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const tabHoverTap = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const listRowStagger = (i: number) => ({
  initial: { opacity: 0, x: 8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] },
  },
});

export const statCardHover = {
  rest: { y: 0, boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)' },
  hover: { y: -3, boxShadow: '0 10px 24px -6px rgb(0 0 0 / 0.12)' },
  tap: { y: 0, scale: 0.99 },
};
