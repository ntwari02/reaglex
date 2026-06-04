const OS_VARIANTS = ['stack', 'hero', 'glass', 'strip', 'pill', 'float'] as const;

export type OsVisualVariant = (typeof OS_VARIANTS)[number];

/** Stable per-notification layout — same row always renders the same variant. */
export function pickVisualVariant(seed = ''): OsVisualVariant {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return OS_VARIANTS[Math.abs(h) % OS_VARIANTS.length];
}
