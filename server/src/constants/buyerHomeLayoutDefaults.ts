/**
 * Canonical homepage product-section layouts.
 * Defaults match production behavior — do not change without admin intent.
 */

export type HomeLayoutMode =
  | 'grid'
  | 'trending_rail'
  | 'horizontal_carousel'
  | 'ai_hero';

export type HomeLayoutViewport = 'mobile' | 'desktop';

/** standard = current production card size (default) */
export type HomeCardDensity = 'standard' | 'compact' | 'compact_expandable';

export interface HomeSectionLayoutSettings {
  mode: HomeLayoutMode;
  /** First row horizontal count when mode is trending_rail */
  railCount?: number;
  /** Responsive grid columns (mobile 2, desktop 4) */
  gridColumns?: 2 | 3 | 4;
  autoScroll?: boolean;
  /** Carousel auto-scroll px per tick (Best sellers desktop ≈ 0.65) */
  autoScrollStep?: number;
  duplicateLoop?: boolean;
  /** Card UI density — default standard preserves current look */
  cardDensity?: HomeCardDensity;
}

export const HOME_CARD_DENSITY_LABELS: Record<HomeCardDensity, string> = {
  standard: 'Standard (current)',
  compact: 'Compact / casual small',
  compact_expandable: 'Compact — tap to expand',
};

export interface HomeSectionLayoutEntry {
  mobile: HomeSectionLayoutSettings;
  desktop: HomeSectionLayoutSettings;
}

export type HomeLayoutSectionId =
  | 'trending'
  | 'bestsellers'
  | 'fresh'
  | 'foryou'
  | 'recommended';

export const HOME_LAYOUT_SECTION_META: Record<
  HomeLayoutSectionId,
  { label: string; description: string }
> = {
  trending: {
    label: 'Trending Now',
    description: 'Hot picks on home and explore.',
  },
  bestsellers: {
    label: 'Best sellers',
    description: 'Top-rated products section.',
  },
  fresh: {
    label: 'New arrivals',
    description: 'Fresh drops (mobile home).',
  },
  foryou: {
    label: 'AI for you',
    description: 'Personalized block on mobile home.',
  },
  recommended: {
    label: 'Recommended',
    description: 'Picked for you on desktop home.',
  },
};

/** Production defaults — source of truth. */
export const DEFAULT_HOME_LAYOUT: Record<HomeLayoutSectionId, HomeSectionLayoutEntry> = {
  trending: {
    mobile: { mode: 'trending_rail', railCount: 4, gridColumns: 2, cardDensity: 'standard' },
    desktop: { mode: 'grid', gridColumns: 4, cardDensity: 'standard' },
  },
  bestsellers: {
    mobile: { mode: 'grid', gridColumns: 2, cardDensity: 'standard' },
    desktop: {
      mode: 'horizontal_carousel',
      autoScroll: true,
      autoScrollStep: 0.65,
      duplicateLoop: true,
      cardDensity: 'standard',
    },
  },
  fresh: {
    mobile: { mode: 'grid', gridColumns: 2, cardDensity: 'standard' },
    desktop: { mode: 'grid', gridColumns: 4, cardDensity: 'standard' },
  },
  foryou: {
    mobile: { mode: 'ai_hero', gridColumns: 2, cardDensity: 'standard' },
    desktop: { mode: 'grid', gridColumns: 4, cardDensity: 'standard' },
  },
  recommended: {
    mobile: { mode: 'grid', gridColumns: 2, cardDensity: 'standard' },
    desktop: { mode: 'grid', gridColumns: 4, cardDensity: 'standard' },
  },
};

export const HOME_LAYOUT_MODE_LABELS: Record<HomeLayoutMode, string> = {
  grid: 'Vertical grid',
  trending_rail: 'Horizontal rail + vertical grid',
  horizontal_carousel: 'Horizontal carousel (auto-scroll)',
  ai_hero: 'Hero card + grid',
};

export function resolveHomeSectionLayout(
  sectionId: HomeLayoutSectionId,
  viewport: HomeLayoutViewport,
  overrides?: Partial<Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>> | null,
): HomeSectionLayoutSettings {
  const base = DEFAULT_HOME_LAYOUT[sectionId]?.[viewport];
  if (!base) {
    return { mode: 'grid', gridColumns: viewport === 'mobile' ? 2 : 4 };
  }
  const patch = overrides?.[sectionId]?.[viewport];
  if (!patch) return { ...base };
  return { ...base, ...patch };
}

export function mergeLayoutOverrides(
  current: Partial<Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>> | undefined,
  next: Partial<Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>>,
): Partial<Record<HomeLayoutSectionId, Partial<HomeSectionLayoutEntry>>> {
  const out = { ...(current || {}) };
  for (const key of Object.keys(next) as HomeLayoutSectionId[]) {
    const entry = next[key];
    if (!entry) continue;
    out[key] = {
      mobile: { ...out[key]?.mobile, ...entry.mobile },
      desktop: { ...out[key]?.desktop, ...entry.desktop },
    };
  }
  return out;
}
