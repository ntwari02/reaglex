export const EXPLORE_MAIN_TABS = [
  { id: 'all', label: 'All' },
  { id: 'trending', label: 'All Trending Now' },
  { id: 'bestseller', label: 'All Best Seller' },
  { id: 'ai', label: 'All AI For You' },
  { id: 'upcoming', label: 'All Upcoming Drops' },
  { id: 'viewed', label: 'All Most Viewed' },
  { id: 'new', label: 'All New Arrivals' },
];

export const EXPLORE_SUB_TABS = {
  trending: [
    { id: 'today', label: 'Trending Today' },
    { id: 'week', label: 'Trending This Week' },
    { id: 'rising', label: 'Fast Rising' },
    { id: 'near', label: 'Near You' },
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
  upcoming: [
    { id: 'soon', label: 'Launching Soon' },
    { id: 'week', label: 'This Week' },
    { id: 'preorder', label: 'Preorders' },
    { id: 'limited', label: 'Limited Edition' },
  ],
};

export const EXPLORE_SECTION_COPY = {
  all: { title: 'Smart discovery', sub: 'Mixed feed · intelligently curated for you' },
  trending: {
    today: { title: 'Trending Today', sub: 'What shoppers love right now' },
    week: { title: 'Trending This Week', sub: 'Momentum picks across Spacilly' },
    rising: { title: 'Fast Rising', sub: 'Products climbing the charts' },
    near: { title: 'Near You', sub: 'Popular in your area' },
  },
  bestseller: {
    selling: { title: 'Top Selling', sub: 'Trusted bestsellers this week' },
    bought: { title: 'Most Bought', sub: 'High repeat purchase velocity' },
    rated: { title: 'Top Rated', sub: 'Highest rated by buyers' },
    premium: { title: 'Premium Picks', sub: 'Luxury & elevated selections' },
  },
  ai: {
    recommended: { title: 'AI For You', sub: 'Personalized recommendations' },
    activity: { title: 'Based On Activity', sub: 'Shaped by your browsing' },
    smart: { title: 'Smart Picks', sub: 'Curated by marketplace AI' },
    similar: { title: 'Similar Interests', sub: 'Because you viewed related items' },
  },
  viewed: {
    today: { title: 'Most Viewed Today', sub: 'High attention right now' },
    week: { title: 'Most Viewed This Week', sub: 'Sustained shopper interest' },
    near: { title: 'Near You', sub: 'Trending locally' },
    growing: { title: 'Fast Growing', sub: 'View counts accelerating' },
  },
  new: {
    today: { title: 'New Today', sub: 'Fresh drops landing now' },
    week: { title: 'New This Week', sub: 'Latest arrivals' },
    month: { title: 'New This Month', sub: 'Recently added catalog' },
    fresh: { title: 'Fresh Picks', sub: 'Hand-picked new inventory' },
  },
  upcoming: {
    soon: { title: 'Upcoming Drops', sub: 'Launching soon · notify to get early access' },
    week: { title: 'This Week', sub: 'Drops landing in the next 7 days' },
    preorder: { title: 'Preorders', sub: 'Reserve before public launch' },
    limited: { title: 'Limited Edition', sub: 'Small-batch releases · act fast' },
  },
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

export function sectionCopyFor(tab, sub) {
  if (tab === 'all') return EXPLORE_SECTION_COPY.all;
  const block = EXPLORE_SECTION_COPY[tab];
  if (!block) return EXPLORE_SECTION_COPY.all;
  if (typeof block.title === 'string') return block;
  return block[sub] || block[Object.keys(block)[0]] || EXPLORE_SECTION_COPY.all;
}
