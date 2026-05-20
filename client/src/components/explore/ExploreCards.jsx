import { Link } from 'react-router-dom';
import {
  AIHeroCard,
  ExploreCompactCard,
  TrendingRailCard,
  exploreVariantKey,
} from '../cards/PremiumCards';

export { TrendingRailCard as ExploreRailCard };
export { AIHeroCard as ExploreAIHeroCard };
export { ExploreCompactCard as ExploreGridCard };

/** Subtle inline sponsored unit */
export function ExploreSponsoredCard() {
  return (
    <article className="ex-sponsored">
      <span className="ex-sponsored-label">Sponsored</span>
      <p className="ex-sponsored-title">Discover premium picks</p>
      <p className="ex-sponsored-sub">Curated for your shopping style</p>
    </article>
  );
}

/** Premium horizontal promo — mockup “Top deals” strip */
export function ExplorePromoCard() {
  return (
    <article className="ex-promo">
      <div className="ex-promo-copy">
        <span className="ex-sponsored-label">Sponsored</span>
        <h3 className="ex-promo-title">Top deals you shouldn&apos;t miss 🔥</h3>
        <p className="ex-promo-sub">Hand-picked savings · limited window</p>
        <Link to="/search?sort=discount" className="ex-promo-cta">
          Shop Now
        </Link>
      </div>
      <div className="ex-promo-visual" aria-hidden>
        <div className="ex-promo-thumb ex-promo-thumb--a" />
        <div className="ex-promo-thumb ex-promo-thumb--b" />
        <span className="ex-promo-brand">REAGLEX</span>
      </div>
    </article>
  );
}

export function ExploreInsightCard() {
  return (
    <article className="ex-insight">
      <span className="ex-insight-label">For you</span>
      <p className="ex-insight-text">Based on what shoppers like you saved this week</p>
    </article>
  );
}

export function ExploreSellerBanner() {
  return (
    <article className="ex-seller-banner">
      <div className="ex-seller-copy">
        <h3>Sell on Reaglex</h3>
        <p>Grow your business · reach more customers</p>
        <Link to="/become-seller" className="ex-seller-cta">
          Start Selling Now
        </Link>
      </div>
      <div className="ex-seller-visual" aria-hidden>
        <span className="ex-seller-bag">REAGLEX</span>
      </div>
    </article>
  );
}

export function mapExploreCardVariant(variantKey) {
  return exploreVariantKey(variantKey);
}

export function renderFeedInsert(item) {
  if (item._type === 'promo') return <ExplorePromoCard key={item.id} />;
  if (item._type === 'insight') return <ExploreInsightCard key={item.id} />;
  if (item._type === 'sponsored') return <ExploreSponsoredCard key={item.id} />;
  return null;
}
