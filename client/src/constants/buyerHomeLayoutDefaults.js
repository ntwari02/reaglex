/** Mirrors server buyerHomeLayoutDefaults — defaults = current production layouts. */

export const HOME_LAYOUT_SECTION_META = {
  trending: { label: 'Trending Now', description: 'Mobile: 4 cards horizontal, then 2-col grid. Desktop: 4-column grid.' },
  bestsellers: { label: 'Best sellers', description: 'Mobile: 2-col grid. Desktop: horizontal carousel with auto-scroll.' },
  fresh: { label: 'New arrivals', description: 'Mobile home fresh drops.' },
  foryou: { label: 'AI for you', description: 'Mobile: large hero + grid.' },
  recommended: { label: 'Recommended', description: 'Desktop “Picked for you” grid.' },
};

export const DEFAULT_HOME_LAYOUT = {
  trending: {
    mobile: { mode: 'trending_rail', railCount: 4, gridColumns: 2, cardDensity: 'standard' },
    desktop: { mode: 'grid', gridColumns: 4, cardDensity: 'standard' },
  },
  bestsellers: {
    mobile: { mode: 'grid', gridColumns: 2, cardDensity: 'standard' },
    desktop: { mode: 'horizontal_carousel', autoScroll: true, autoScrollStep: 0.65, duplicateLoop: true, cardDensity: 'standard' },
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

export const HOME_CARD_DENSITY_OPTIONS = [
  { value: 'standard', label: 'Standard (current)', hint: 'Full-size cards as on the live site today.' },
  { value: 'compact', label: 'Compact / casual small', hint: 'Smaller image and text — denser rows.' },
  {
    value: 'compact_expandable',
    label: 'Compact — tap to expand',
    hint: 'Starts small; buyer taps a card to expand details inline.',
  },
];

export const PUBLISH_LAYOUT_ACK =
  'I understand that publishing homepage layout changes will immediately affect what all buyers see on the live store.';

export function buildResolvedHomeLayout(overrides = {}) {
  const sections = {};
  for (const id of Object.keys(DEFAULT_HOME_LAYOUT)) {
    sections[id] = {
      mobile: resolveHomeSectionLayout(id, 'mobile', overrides),
      desktop: resolveHomeSectionLayout(id, 'desktop', overrides),
    };
  }
  return sections;
}

export const HOME_LAYOUT_MODE_OPTIONS = [
  { value: 'grid', label: 'Vertical grid', hint: 'Cards in a responsive grid (current desktop trending).' },
  {
    value: 'trending_rail',
    label: 'Horizontal rail + grid',
    hint: 'First N cards in a horizontal row, remaining cards vertical below (current mobile trending).',
  },
  {
    value: 'horizontal_carousel',
    label: 'Horizontal carousel',
    hint: 'Single row with optional auto-scroll (current desktop best sellers).',
  },
  { value: 'ai_hero', label: 'Hero + grid', hint: 'One large featured card, then a grid (current mobile AI).' },
];

export function resolveHomeSectionLayout(sectionId, viewport, resolvedSections) {
  const fromApi = resolvedSections?.[sectionId]?.[viewport];
  if (fromApi) return fromApi;
  const base = DEFAULT_HOME_LAYOUT[sectionId]?.[viewport];
  return base || { mode: 'grid', gridColumns: viewport === 'mobile' ? 2 : 4 };
}

/** Map API mode → legacy HomeExploreSection layout prop */
export function layoutModeToExploreLayout(mode) {
  if (mode === 'trending_rail') return 'trending';
  if (mode === 'ai_hero') return 'ai';
  if (mode === 'horizontal_carousel') return 'carousel';
  return 'grid';
}
