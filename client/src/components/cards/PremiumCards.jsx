/**
 * Reaglex 2026–2030 Premium Card System
 * Section-specific variants · shared tokens · mobile-first
 */
import {
  CardBadge,
  CardCartFab,
  CardMotionWrap,
  CardProductImage,
  CardRating,
  CardWishButton,
  deriveSoldLabel,
  deriveViewsLabel,
  formatStoreName,
  useProductCardCore,
} from './cardPrimitives';

/* ── Trending: horizontal rail (first 4) ── */
export function TrendingRailCard({ product, index = 0 }) {
  const c = useProductCardCore(product);
  return (
    <CardMotionWrap index={index} layout="rail" className="rx-card rx-card--trending-rail">
      <div className="rx-card__surface">
        <button type="button" className="rx-card__media-btn" onClick={c.openProduct}>
          <div className="rx-card__media">
            <CardProductImage product={product} src={c.imgSrc} alt="" />
            <CardBadge variant="trending" className="rx-card__badge--pos-bl" />
            <CardWishButton wishlisted={c.wishlisted} onClick={c.toggleWishlist} />
          </div>
        </button>
        <div className="rx-card__body rx-card__body--rail">
          <button type="button" className="rx-card__text-btn" onClick={c.openProduct}>
            <h3 className="rx-card__title">{c.name}</h3>
            <p className="rx-card__price">{c.currencyPricing.formatLocalWithUsd(c.price)}</p>
            <CardRating rating={c.rating} reviews={c.reviews} compact />
          </button>
          <CardCartFab onClick={c.addToCart} disabled={c.stock <= 0} />
        </div>
      </div>
    </CardMotionWrap>
  );
}

/* ── Trending: 2-col grid (after top 4) ── */
export function TrendingGridCard({ product, index = 0 }) {
  const c = useProductCardCore(product);
  return (
    <CardMotionWrap index={index} className="rx-card rx-card--trending-grid">
      <div className="rx-card__surface">
        <button type="button" className="rx-card__media-btn" onClick={c.openProduct}>
          <div className="rx-card__media">
            <CardProductImage product={product} src={c.imgSrc} alt="" />
            <CardBadge variant="trending" className="rx-card__badge--pos-bl" />
          </div>
        </button>
        <div className="rx-card__body">
          <h3 className="rx-card__title rx-card__title--sm">{c.name}</h3>
          <CardRating rating={c.rating} reviews={c.reviews} compact />
          <p className="rx-card__price rx-card__price--sm">{c.currencyPricing.formatLocalWithUsd(c.price)}</p>
          <div className="rx-card__action-row">
            <CardWishButton wishlisted={c.wishlisted} onClick={c.toggleWishlist} size="sm" />
            <CardCartFab onClick={c.addToCart} size="sm" disabled={c.stock <= 0} />
          </div>
        </div>
      </div>
    </CardMotionWrap>
  );
}

/* ── Best Seller: trusted luxury grid ── */
export function BestSellerGridCard({ product, index = 0 }) {
  const c = useProductCardCore(product);
  const store = formatStoreName(product);
  const sold = deriveSoldLabel(product);
  return (
    <CardMotionWrap index={index} className="rx-card rx-card--bestseller">
      <div className="rx-card__surface rx-card__surface--lux">
        <button type="button" className="rx-card__media-btn" onClick={c.openProduct}>
          <div className="rx-card__media">
            <CardProductImage product={product} src={c.imgSrc} alt="" />
            <CardBadge variant="bestseller" className="rx-card__badge--pos-tl" />
          </div>
        </button>
        <div className="rx-card__body">
          <h3 className="rx-card__title rx-card__title--sm">{c.name}</h3>
          <p className="rx-card__store">{store}</p>
          <CardRating rating={c.rating} reviews={c.reviews} compact />
          <p className="rx-card__insight">{sold}</p>
          <div className="rx-card__foot">
            <p className="rx-card__price">{c.currencyPricing.formatLocalWithUsd(c.price)}</p>
            <button type="button" className="rx-card__add-pill" onClick={c.addToCart} disabled={c.stock <= 0}>
              Add
            </button>
          </div>
        </div>
      </div>
    </CardMotionWrap>
  );
}

/* ── Most Viewed: data-driven grid ── */
export function MostViewedGridCard({ product, index = 0 }) {
  const c = useProductCardCore(product);
  const views = deriveViewsLabel(product);
  return (
    <CardMotionWrap index={index} className="rx-card rx-card--viewed">
      <div className="rx-card__surface">
        <button type="button" className="rx-card__media-btn" onClick={c.openProduct}>
          <div className="rx-card__media">
            <CardProductImage product={product} src={c.imgSrc} alt="" />
            <CardBadge variant="viewed" className="rx-card__badge--pos-tl" />
            <CardWishButton wishlisted={c.wishlisted} onClick={c.toggleWishlist} size="sm" />
          </div>
        </button>
        <div className="rx-card__body">
          <h3 className="rx-card__title rx-card__title--sm">{c.name}</h3>
          <CardRating rating={c.rating} reviews={c.reviews} compact />
          <p className="rx-card__insight rx-card__insight--views">{views}</p>
          <div className="rx-card__foot">
            <p className="rx-card__price rx-card__price--sm">{c.currencyPricing.formatLocalWithUsd(c.price)}</p>
            <CardCartFab onClick={c.addToCart} size="sm" disabled={c.stock <= 0} />
          </div>
        </div>
      </div>
    </CardMotionWrap>
  );
}

/* ── New Arrivals: fresh minimal ── */
export function NewArrivalGridCard({ product, index = 0 }) {
  const c = useProductCardCore(product);
  const fresh =
    product?._exploreMeta?.addedLabel ||
    (product?.aiMeta?.badges?.freshArrival ? 'Added today' : 'New this week');
  return (
    <CardMotionWrap index={index} className="rx-card rx-card--new">
      <div className="rx-card__surface rx-card__surface--fresh">
        <button type="button" className="rx-card__media-btn" onClick={c.openProduct}>
          <div className="rx-card__media rx-card__media--tall">
            <CardProductImage product={product} src={c.imgSrc} alt="" />
            <CardBadge variant="new" className="rx-card__badge--pos-tl rx-card__badge--glow" />
          </div>
        </button>
        <div className="rx-card__body rx-card__body--minimal">
          <h3 className="rx-card__title">{c.name}</h3>
          <p className="rx-card__price">{c.currencyPricing.formatLocalWithUsd(c.price)}</p>
          <CardRating rating={c.rating} reviews={c.reviews} compact />
          <p className="rx-card__insight">{fresh}</p>
          <button type="button" className="rx-card__details-cta" onClick={c.openProduct}>
            See details
          </button>
        </div>
      </div>
    </CardMotionWrap>
  );
}

/* ── AI: hero (first card) ── */
export function AIHeroCard({ product, index = 0 }) {
  const c = useProductCardCore(product);
  return (
    <CardMotionWrap index={index} className="rx-card rx-card--ai-hero">
      <div className="rx-card__surface rx-card__surface--ai-hero">
        <button type="button" className="rx-card__ai-media" onClick={c.openProduct}>
          <CardProductImage product={product} src={c.imgSrc} alt="" />
          <CardBadge variant="ai" className="rx-card__badge--pos-tl" />
        </button>
        <div className="rx-card__ai-content">
          <p className="rx-card__ai-reason">{c.reason}</p>
          <h3 className="rx-card__title">{c.name}</h3>
          <CardRating rating={c.rating} reviews={c.reviews} />
          <p className="rx-card__price">{c.currencyPricing.formatLocalWithUsd(c.price)}</p>
          <div className="rx-card__ai-actions">
            <CardWishButton wishlisted={c.wishlisted} onClick={c.toggleWishlist} />
            <CardCartFab onClick={c.addToCart} disabled={c.stock <= 0} />
            <button type="button" className="rx-card__view-details" onClick={c.openProduct}>
              View Details
            </button>
          </div>
        </div>
      </div>
    </CardMotionWrap>
  );
}

/* ── AI: grid cards ── */
export function AIGridCard({ product, index = 0 }) {
  const c = useProductCardCore(product);
  return (
    <CardMotionWrap index={index} className="rx-card rx-card--ai-grid">
      <div className="rx-card__surface rx-card__surface--ai">
        <button type="button" className="rx-card__media-btn" onClick={c.openProduct}>
          <div className="rx-card__media">
            <CardProductImage product={product} src={c.imgSrc} alt="" />
            <CardBadge variant="ai" className="rx-card__badge--pos-tl" />
          </div>
        </button>
        <div className="rx-card__body">
          <h3 className="rx-card__title rx-card__title--sm">{c.name}</h3>
          <p className="rx-card__insight rx-card__insight--ai">{c.reason}</p>
          <p className="rx-card__price rx-card__price--sm">{c.currencyPricing.formatLocalWithUsd(c.price)}</p>
          <div className="rx-card__foot">
            <CardRating rating={c.rating} reviews={c.reviews} compact />
            <CardCartFab onClick={c.addToCart} size="sm" disabled={c.stock <= 0} />
          </div>
        </div>
      </div>
    </CardMotionWrap>
  );
}

/* ── Explore / View All: max density compact ── */
export function ExploreCompactCard({
  product,
  variantKey = 'trending',
  index = 0,
  meta = {},
}) {
  const c = useProductCardCore(product);
  const merged = { ...product, _exploreMeta: { ...product._exploreMeta, ...meta } };
  const sold = variantKey === 'bestseller' ? deriveSoldLabel(merged) : null;
  const views = variantKey === 'viewed' ? deriveViewsLabel(merged) : null;
  const fresh = variantKey === 'new' ? merged._exploreMeta?.addedLabel : null;

  return (
    <CardMotionWrap index={index} className={`rx-card rx-card--explore rx-card--explore-${variantKey}`}>
      <div className="rx-card__surface rx-card__surface--compact" ref={c.cardRef}>
        <button type="button" className="rx-card__media-btn" onClick={c.openProduct}>
          <div className="rx-card__media rx-card__media--compact">
            <CardProductImage product={product} src={c.imgSrc} alt="" />
            {variantKey && variantKey !== 'all' && (
              <CardBadge variant={exploreVariantKey(variantKey)} className="rx-card__badge--pos-bl" />
            )}
            <CardWishButton wishlisted={c.wishlisted} onClick={c.toggleWishlist} size="sm" />
          </div>
        </button>
        <div className="rx-card__body rx-card__body--compact">
          <h3 className="rx-card__title rx-card__title--xs">{c.name}</h3>
          {sold && <p className="rx-card__insight">{sold}</p>}
          {views && <p className="rx-card__insight">{views}</p>}
          {fresh && <p className="rx-card__insight">{fresh}</p>}
          <div className="rx-card__foot rx-card__foot--tight">
            <div>
              <CardRating rating={c.rating} reviews={c.reviews} compact />
              <p className="rx-card__price rx-card__price--xs">
                {product._isUpcoming ? 'Soon' : c.currencyPricing.formatLocalWithUsd(c.price)}
              </p>
            </div>
            {!product._isUpcoming && (
              <CardCartFab onClick={c.addToCart} size="sm" disabled={c.stock <= 0} />
            )}
          </div>
        </div>
      </div>
    </CardMotionWrap>
  );
}

/* Map explore variant keys */
export const EXPLORE_VARIANT_MAP = {
  trending: 'trending',
  bestseller: 'bestseller',
  bestsellers: 'bestseller',
  ai: 'ai',
  foryou: 'ai',
  viewed: 'viewed',
  new: 'new',
  fresh: 'new',
  upcoming: 'upcoming',
};

export function exploreVariantKey(key) {
  return EXPLORE_VARIANT_MAP[key] || 'trending';
}
