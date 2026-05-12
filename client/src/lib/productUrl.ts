/** Buyer-facing PDP path: canonical `/product/:slug` when available. */
export function buyerProductPath(product: {
  slug?: string;
  _id?: string;
  id?: string;
}): string {
  const slug = typeof product.slug === 'string' ? product.slug.trim() : '';
  if (slug) return `/product/${encodeURIComponent(slug)}`;
  const id = product._id || product.id;
  return `/products/${encodeURIComponent(id != null ? String(id) : '')}`;
}
