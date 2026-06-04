/** Visual layout variants — same event type, different card personality each time. */

export const OS_VARIANTS = ['stack', 'hero', 'glass', 'strip', 'pill', 'float'];

export function pickOsVariant(seed = '') {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return OS_VARIANTS[Math.abs(h) % OS_VARIANTS.length];
}

/** Subtle glow rotation so cards feel alive, not cloned. */
export function pickOsGlow(seed = '') {
  const glows = [
    'var(--rxn-glow-orange)',
    'var(--rxn-glow-blue)',
    'var(--rxn-glow-teal)',
    'var(--rxn-glow-purple)',
    'color-mix(in srgb, var(--brand-primary) 35%, transparent)',
  ];
  let h = 0;
  for (let i = 0; i < String(seed).length; i += 1) h = (h * 31 + String(seed).charCodeAt(i)) >>> 0;
  return glows[h % glows.length];
}

export function enrichOsPresentation(row, userId) {
  const id = String(row._id || row.id || '');
  const category = row?.metadata?.category || row?.category || row?.type || 'system';
  const variant = row?.metadata?.visualVariant || pickOsVariant(`${id}:${category}:${row?.createdAt || ''}`);
  const glow = pickOsGlow(`${id}-glow`);
  const readBy = row?.readBy || [];
  const unread = row?.unread ?? (userId ? !readBy.some((x) => String(x) === String(userId)) : true);
  const thumbs = row?.metadata?.productThumbnails || row?.thumbnails || row?.productImages || [];

  return {
    ...row,
    id,
    unread,
    category,
    osVariant: variant,
    osGlow: glow,
    thumbnails: Array.isArray(thumbs) ? thumbs.filter(Boolean).slice(0, 3) : [],
    actionLink: row.actionUrl || row.actionLink || row.href,
    actionLabel: row.actionText || row.actionLabel || 'Open',
    tone: row?.metadata?.tone || row?.tone,
  };
}
