/** Loose Mongo filter for Product queries (mongoose 9 — FilterQuery removed). */
export type ProductBuyerFilter = Record<string, unknown>;

/** Mongo filter: products visible on buyer storefront (home, search, categories, etc.). */
export function buyerVisibleProductFilter(extra: ProductBuyerFilter = {}): ProductBuyerFilter {
  return {
    ...extra,
    $and: [
      ...(extra.$and ? (Array.isArray(extra.$and) ? extra.$and : [extra.$and]) : []),
      {
        $or: [
          { publicationStatus: { $exists: false } },
          { publicationStatus: 'published' },
        ],
      },
      {
        status: { $in: ['in_stock', 'low_stock'] },
      },
    ],
  };
}

export function isProductBuyerVisible(product: { publicationStatus?: string } | null | undefined): boolean {
  if (!product) return false;
  const ps = product.publicationStatus;
  if (!ps || ps === 'published') return true;
  return false;
}
