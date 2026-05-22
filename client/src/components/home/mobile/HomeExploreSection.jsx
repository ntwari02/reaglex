import { HOME_PRODUCT_LIMIT } from '../../../hooks/useHomeFeedSections';
import MobileSectionHeader from './MobileSectionHeader';
import {
  ExploreAIHeroCard,
  ExploreGridCard,
  ExploreTrendingRailCard,
} from '../../explore/ExploreProductCards';

export { HOME_PRODUCT_LIMIT };
const TRENDING_RAIL_COUNT = 4;

/**
 * Home sections reuse Explore All card system (rail + 2-col grid).
 */
export default function HomeExploreSection({
  id,
  title,
  subtitle,
  href,
  products = [],
  loading = false,
  layout = 'grid',
  variant = 'trending',
}) {
  const items = (Array.isArray(products) ? products : []).slice(0, HOME_PRODUCT_LIMIT);

  if (!loading && items.length === 0) return null;

  const railItems = layout === 'trending' ? items.slice(0, TRENDING_RAIL_COUNT) : [];
  const gridItems =
    layout === 'trending' ? items.slice(TRENDING_RAIL_COUNT) : layout === 'ai' ? items.slice(1) : items;
  const heroProduct = layout === 'ai' ? items[0] : null;

  return (
    <section className="mob-section mob-home-ex" aria-labelledby={id}>
      <MobileSectionHeader id={id} title={title} subtitle={subtitle} href={href} />

      {loading && !items.length ? (
        <HomeExploreSkeleton layout={layout} />
      ) : (
        <>
          {layout === 'trending' && railItems.length > 0 && (
            <div className="ex-rail-wrap mob-home-ex-rail">
              <div className="ex-rail-scroll">
                {railItems.map((p, i) => (
                  <ExploreTrendingRailCard key={p._id || p.id || `rail-${i}`} product={p} index={i} />
                ))}
              </div>
            </div>
          )}

          {layout === 'ai' && heroProduct && <ExploreAIHeroCard product={heroProduct} />}

          {gridItems.length > 0 && (
            <div className={`ex-grid${layout === 'ai' ? ' ex-grid--after-hero' : ''}`}>
              {gridItems.map((p, i) => (
                <ExploreGridCard
                  key={p._id || p.id || `grid-${i}`}
                  product={p}
                  variant={variant}
                  index={i}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function HomeExploreSkeleton({ layout }) {
  if (layout === 'trending') {
    return (
      <>
        <div className="ex-rail-wrap mob-home-ex-rail">
          <div className="ex-rail-scroll">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="ex-skeleton-rail" />
            ))}
          </div>
        </div>
        <div className="ex-skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ex-skeleton-card" />
          ))}
        </div>
      </>
    );
  }

  if (layout === 'ai') {
    return (
      <>
        <div className="ex-skeleton-card ex-skeleton-ai-hero" />
        <div className="ex-skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ex-skeleton-card" />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="ex-skeleton-grid">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="ex-skeleton-card" />
      ))}
    </div>
  );
}
