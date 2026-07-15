const RECENT_KEY = 'spacilly_recent_searches';
const MAX_RECENT = 8;

export function getRecentSearches() {
  try {
    const s = localStorage.getItem(RECENT_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(q) {
  if (!q?.trim()) return;
  const recent = getRecentSearches().filter((r) => r !== q.trim());
  recent.unshift(q.trim());
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function removeRecentSearch(q) {
  const recent = getRecentSearches().filter((r) => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}

export function clearRecentSearches() {
  localStorage.setItem(RECENT_KEY, JSON.stringify([]));
}
