/** Mock search results for voice / visual / demo queries */
export const MOCK_SEARCH_CHIPS = [
  'Wireless earbuds',
  'Nike shoes',
  'Summer sale',
  'Smart watch',
  'Gaming laptop',
  'Skincare kit',
];

export const MOCK_RECENT = ['Bluetooth speaker', 'Running shoes', 'LED desk lamp'];

export const MOCK_PRODUCTS = [
  {
    _id: 'mock-1',
    title: 'Aurora Wireless Earbuds Pro',
    price: 89.99,
    rating: 4.8,
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
  },
  {
    _id: 'mock-2',
    title: 'Nike Air Runner X',
    price: 129.0,
    rating: 4.7,
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80',
  },
  {
    _id: 'mock-3',
    title: 'Minimal Steel Watch',
    price: 199.5,
    rating: 4.9,
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80',
  },
  {
    _id: 'mock-4',
    title: 'Smart Home Hub',
    price: 64.0,
    rating: 4.5,
    thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80',
  },
];

export function getMockSearchResults(query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return MOCK_PRODUCTS.slice(0, 4);
  return MOCK_PRODUCTS.filter((p) => p.title.toLowerCase().includes(q) || q.length < 3).slice(0, 6);
}
