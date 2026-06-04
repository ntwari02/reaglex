import { HOME_PRODUCT_LIMIT } from '../../../hooks/useHomeFeedSections';
import { useHomeLayoutForSection } from '../../../hooks/useHomeLayoutConfig';
import { layoutModeToExploreLayout } from '../../../constants/buyerHomeLayoutDefaults';
import '../../../styles/home-layout-cards.css';

function cardDensityClass(density) {
  if (density === 'compact') return 'ex-card--compact';
  if (density === 'compact_expandable') return 'ex-card--compact ex-card--expandable';
  return '';
}
import MobileSectionHeader from './MobileSectionHeader';
import RecentlyViewedRailCard from './RecentlyViewedRailCard';
import {
  ExploreAIHeroCard,
  ExploreGridCard,
} from '../../explore/ExploreProductCards';

export { HOME_PRODUCT_LIMIT };
const TRENDING_RAIL_COUNT_DEFAULT = 4;

/**
 * Home sections reuse Explore All card system (rail + 2-col grid).
 */
export default function HomeExploreSection({
  id,
  sectionKey,
  title,
  subtitle,
  href,
  products = [],
  loading = false,
  layout: layoutProp,
  layoutOverride = null,
  variant = 'trending',
}) {
  const key = sectionKey || id?.replace(/^mob-/, '') || 'trending';
  const isTrendingSection = variant === 'trending';
  const { layout: fetchedLayout } = useHomeLayoutForSection(key, 'mobile');
  const layoutSettings = layoutOverride || fetchedLayout;
  const layout =
    layoutProp ||
    (isTrendingSection ? 'trending' : layoutModeToExploreLayout(layoutSettings?.mode || 'grid'));
  const railCount = Math.max(1, Math.min(8, Number(layoutSettings?.railCount) || TRENDING_RAIL_COUNT_DEFAULT));
  /** Trending Now — fixed 148px cards (same as recently viewed); no compact/expand. */
  const cardDensity = isTrendingSection ? 'standard' : layoutSettings?.cardDensity || 'standard';
  const densityCls = isTrendingSection ? '' : cardDensityClass(cardDensity);

  const items = (Array.isArray(products) ? products : []).slice(0, HOME_PRODUCT_LIMIT);

  if (!loading && items.length === 0) return null;

  const railItems = layout === 'trending' ? items.slice(0, railCount) : [];
  const gridItems =
    layout === 'trending'
      ? items.slice(railCount)
      : layout === 'ai'
        ? items.slice(1)
        : layout === 'carousel'
          ? []
          : items;
  const heroProduct = layout === 'ai' ? items[0] : null;
  const carouselItems = layout === 'carousel' ? items : [];

  return (
    <section className="mob-section mob-home-ex" aria-labelledby={id}>
      <MobileSectionHeader id={id} title={title} subtitle={subtitle} href={href} />

      {loading && !items.length ? (
        <HomeExploreSkeleton layout={layout} />
      ) : (
        <>
          {layout === 'trending' && railItems.length > 0 && (
            <div className="ex-rail-wrap mob-home-ex-rail mob-trending-rail">
              <div className="ex-rail-scroll">
                {railItems.map((p, i) => (
                  <RecentlyViewedRailCard
                    key={p._id || p.id || `rail-${i}`}
                    product={p}
                    index={i}
                    showHotBadge
                  />
                ))}
              </div>
            </div>
          )}

          {layout === 'carousel' && carouselItems.length > 0 && (
            <div className="ex-rail-wrap mob-home-ex-rail">
              <div className="ex-rail-scroll">
                {carouselItems.map((p, i) => (
                  <ExploreGridCard
                    key={p._id || p.id || `car-${i}`}
                    product={p}
                    variant={variant}
                    index={i}
                    cardDensity={cardDensity}
                    className={densityCls}
                  />
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
                  cardDensity={cardDensity}
                  className={densityCls}
                  cartNearPrice={isTrendingSection}
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
  if (layout === 'carousel') {
    return (
      <div className="ex-rail-wrap mob-home-ex-rail">
        <div className="ex-rail-scroll">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ex-skeleton-rail" />
          ))}
        </div>
      </div>
    );
  }

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
