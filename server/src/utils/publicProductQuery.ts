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
      {
        $or: [{ listingMode: { $exists: false } }, { listingMode: 'live' }],
      },
    ],
  };
}

export function isProductBuyerVisible(product: { publicationStatus?: string; listingMode?: string } | null | undefined): boolean {
  if (!product) return false;
  if (product.listingMode === 'upcoming') return false;
  const ps = product.publicationStatus;
  if (!ps || ps === 'published') return true;
  return false;
}

/** Upcoming drops — seller-scheduled, not yet purchasable. */
export function buyerUpcomingProductFilter(extra: ProductBuyerFilter = {}): ProductBuyerFilter {
  const now = new Date();
  return {
    ...extra,
    listingMode: 'upcoming',
    launchAt: { $gt: now },
    $and: [
      ...(extra.$and ? (Array.isArray(extra.$and) ? extra.$and : [extra.$and]) : []),
      {
        $or: [
          { publicationStatus: { $exists: false } },
          { publicationStatus: 'published' },
          { publicationStatus: 'pending_verification' },
        ],
      },
    ],
  };
}
