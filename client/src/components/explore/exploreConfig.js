export const EXPLORE_MAIN_TABS = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'All Trending Now' },
  { id: 'bestseller', label: 'All Best Seller' },
  { id: 'ai', label: 'All AI For You' },
  { id: 'upcoming', label: 'All upcoming drop' },
  { id: 'viewed', label: 'All Most Viewed' },
  { id: 'new', label: 'All New Arrivals' },
];

export const TRENDING_CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'phones', label: 'Phones' },
  { id: 'laptops', label: 'Laptops' },
  { id: 'audio', label: 'Audio' },
  { id: 'wearables', label: 'Wearables' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'cameras', label: 'Cameras' },
];

export const EXPLORE_SUB_TABS = {
  trending: [
    { id: 'today', label: 'Trending Today', icon: 'flame' },
    { id: 'week', label: 'Trending This Week', icon: 'flame' },
    { id: 'rising', label: 'Fast Rising', icon: 'zap' },
    { id: 'near', label: 'Near You', icon: 'map' },
  ],
  bestseller: [
    { id: 'selling', label: 'Top Selling' },
    { id: 'bought', label: 'Most Bought' },
    { id: 'rated', label: 'Top Rated' },
    { id: 'premium', label: 'Premium Picks' },
  ],
  ai: [
    { id: 'recommended', label: 'Recommended' },
    { id: 'activity', label: 'Based On Activity' },
    { id: 'smart', label: 'Smart Picks' },
    { id: 'similar', label: 'Similar Interests' },
  ],
  viewed: [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'near', label: 'Near You' },
    { id: 'growing', label: 'Fast Growing' },
  ],
  new: [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'fresh', label: 'Fresh Picks' },
  ],
};

export const CARD_VARIANTS = {
  all: { badge: null, icon: null },
  trending: { badge: 'Trending', emoji: '🔥', icon: 'flame' },
  bestseller: { badge: 'Best Seller', emoji: '🏆', icon: 'award' },
  ai: { badge: 'AI Pick', emoji: '✨', icon: 'sparkles' },
  viewed: { badge: 'Most Viewed', emoji: '👁', icon: 'eye' },
  new: { badge: 'New', emoji: '✨', icon: 'stars' },
  upcoming: { badge: 'Coming Soon', emoji: '🚀', icon: 'sparkles' },
};

export function explorePath(tab = 'all', sub) {
  const params = new URLSearchParams({ tab });
  if (sub) params.set('sub', sub);
  return `/explore?${params.toString()}`;
}

export function defaultSubForTab(tab) {
  const subs = EXPLORE_SUB_TABS[tab];
  return subs?.[0]?.id ?? null;
}

export const EXPLORE_SECTION_COPY = {
  all: { title: 'Smart discovery', sub: 'Mixed feed · intelligently curated' },
  trending: {
    today: { title: '🔥 Trending Today', sub: 'What shoppers love right now' },
    week: { title: '🔥 Trending This Week', sub: 'Momentum picks across Reaglex' },
    rising: { title: '⚡ Fast Rising', sub: 'Products climbing fast' },
    near: { title: '📍 Near You', sub: 'Popular in your area' },
  },
  bestseller: {
    selling: { title: '🏆 Top Selling', sub: 'Trusted best performers' },
    bought: { title: '🏆 Most Bought', sub: 'Highest purchase velocity' },
    rated: { title: '🏆 Top Rated', sub: 'Loved by verified buyers' },
    premium: { title: '🏆 Premium Picks', sub: 'Luxury & high-trust selects' },
  },
  ai: {
    recommended: { title: '✨ AI For You', sub: 'Recommended for your taste' },
    activity: { title: '✨ Based On Activity', sub: 'Powered by your browsing' },
    smart: { title: '✨ Smart Picks', sub: 'High-confidence matches' },
    similar: { title: '✨ Similar Interests', sub: 'Because you viewed related items' },
  },
  viewed: {
    today: { title: '👁 Most Viewed Today', sub: 'Hot right now' },
    week: { title: '👁 Most Viewed This Week', sub: 'Weekly attention leaders' },
    near: { title: '👁 Near You', sub: 'Local popularity signals' },
    growing: { title: '👁 Fast Growing', sub: 'Spiking view counts' },
  },
  new: {
    today: { title: '✨ New Today', sub: 'Fresh drops just landed' },
    week: { title: '✨ New This Week', sub: 'Latest arrivals' },
    month: { title: '✨ New This Month', sub: 'Recently added catalog' },
    fresh: { title: '✨ Fresh Picks', sub: 'Curated new essentials' },
  },
  upcoming: { title: '🚀 Upcoming Drops', sub: 'Launching soon on Reaglex' },
};

export function sectionCopyFor(tab, sub) {
  if (tab === 'all') return EXPLORE_SECTION_COPY.all;
  if (tab === 'upcoming') return EXPLORE_SECTION_COPY.upcoming;
  const map = EXPLORE_SECTION_COPY[tab];
  if (map && typeof map === 'object' && map.title) return map;
  return map?.[sub] || map?.[defaultSubForTab(tab)] || EXPLORE_SECTION_COPY.all;
}

const CATEGORY_MATCH = {
  phones: ['phone', 'iphone', 'mobile', 'samsung', 'pixel'],
  laptops: ['laptop', 'macbook', 'notebook', 'rog', 'asus'],
  audio: ['audio', 'headphone', 'earbud', 'airpod', 'speaker'],
  wearables: ['watch', 'wearable', 'band', 'fitness'],
  gaming: ['game', 'gaming', 'console', 'ally', 'rog'],
  cameras: ['camera', 'canon', 'sony', 'dji', 'drone'],
};

export function productMatchesCategory(product, categoryId) {
  if (!categoryId || categoryId === 'all') return true;
  const keys = CATEGORY_MATCH[categoryId];
  if (!keys) return true;
  const hay = [
    product?.category?.name,
    product?.category,
    product?.categoryName,
    product?.name,
    product?.title,
    product?.subcategory,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return keys.some((k) => hay.includes(k));
}
