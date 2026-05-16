/** Cinematic motion tokens — 2026 storefront UX */

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT = [0.45, 0, 0.55, 1];

export const springSnappy = { type: 'spring', stiffness: 520, damping: 38, mass: 0.85 };
export const springSoft = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 };
export const springSheet = { type: 'spring', stiffness: 420, damping: 36, mass: 0.95 };

export const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.38, ease: EASE_OUT_EXPO },
};

export const scalePress = {
  whileTap: { scale: 0.97 },
  transition: springSnappy,
};

export const cardReveal = (index = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay: index * 0.05, ease: EASE_OUT_EXPO },
});

export function productImageLayoutId(product) {
  const id = product?._id || product?.id;
  return id ? `product-image-${id}` : undefined;
}
