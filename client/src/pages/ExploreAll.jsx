import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, ShoppingBag } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import {
  EXPLORE_MAIN_TABS,
  EXPLORE_SUB_TABS,
  defaultSubForTab,
  explorePath,
  sectionCopyFor,
} from '../components/explore/exploreConfig';
import { injectExploreAds, useExploreFeed } from '../components/explore/useExploreFeed';
import {
  ExploreAIHeroCard,
  ExploreGridCard,
  ExploreTrendingRailCard,
  renderFeedInsert,
} from '../components/explore/ExploreProductCards';
import ExploreUpcomingFeed from '../components/explore/ExploreUpcomingFeed';
import '../styles/explore-all.css';

const PAGE_SIZE = 20;
const FOOTER_BATCHES = 3;
const EASE = [0.22, 1, 0.36, 1];

function ExploreSkeleton({ count = 8 }) {
  return (
    <div className="ex-skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ex-skeleton-card" />
      ))}
    </div>
  );
}

function mapVariant(tab, source) {
  if (tab === 'all') {
    const s = source || 'trending';
    if (['bestseller', 'ai', 'viewed', 'new', 'trending'].includes(s)) return s;
    return 'trending';
  }
  if (tab === 'bestseller') return 'bestseller';
  if (tab === 'ai') return 'ai';
  if (tab === 'viewed') return 'viewed';
  if (tab === 'new') return 'new';
  return 'trending';
}

export default function ExploreAll() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'all';
  const sub = params.get('sub') || defaultSubForTab(tab) || '';

  const { products: rawProducts, isLoading } = useExploreFeed(tab, sub);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const products = rawProducts;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, sub]);

  const setTab = useCallback(
    (nextTab) => {
      const nextSub = defaultSubForTab(nextTab);
      setParams(nextSub ? { tab: nextTab, sub: nextSub } : { tab: nextTab }, { replace: true });
    },
    [setParams],
  );

  const setSubTab = useCallback(
    (nextSub) => {
      setParams({ tab, sub: nextSub }, { replace: true });
    },
    [setParams, tab],
  );

  const hasSubTabs = Boolean(EXPLORE_SUB_TABS[tab]);
  const sectionCopy = sectionCopyFor(tab, sub);
  const subTabs = EXPLORE_SUB_TABS[tab];

  const trendingRail = tab === 'trending' ? products.slice(0, 4) : [];
  const aiHero = tab === 'ai' && products[0] ? products[0] : null;

  const gridSource = useMemo(() => {
    if (tab === 'trending') return products.slice(4);
    if (tab === 'ai') return products.slice(1);
    return products;
  }, [products, tab]);

  const gridProducts = useMemo(() => {
    const slice = gridSource.slice(0, visibleCount);
    if (tab === 'all') return injectExploreAds(slice, 20);
    return slice;
  }, [gridSource, visibleCount, tab]);

  const hasMore = visibleCount < gridSource.length;
  const batchesLoaded = Math.ceil(visibleCount / PAGE_SIZE);
  const showSiteFooter = batchesLoaded >= FOOTER_BATCHES && !hasMore;

  const renderGridItem = (item, index) => {
    const insert = renderFeedInsert(item);
    if (insert) return insert;
    const variant = mapVariant(tab, item._exploreSource);
    return (
      <ExploreGridCard
        key={item._id || item.id || index}
        product={item}
        variant={variant}
        index={index}
        sub={sub}
      />
    );
  };

  return (
    <BuyerLayout className="ex-page-wrap">
      <div className="ex-page">
        <header className="ex-topbar">
          <button type="button" className="ex-back" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={1.85} />
          </button>
          <h1 className="ex-page-title">Explore All</h1>
          <Link to="/" className="ex-cart-link" aria-label="Home">
            <ShoppingBag size={20} strokeWidth={1.75} />
          </Link>
        </header>

        <div className="ex-sticky-l1">
          <div className="ex-tabs-scroll" role="tablist" aria-label="Explore sections">
            {EXPLORE_MAIN_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`ex-tab-pill${tab === t.id ? ' is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {hasSubTabs && (
          <div className="ex-sticky-l2">
            <div className="ex-subtabs-scroll" role="tablist" aria-label="Sub filters">
              {subTabs.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  role="tab"
                  aria-selected={sub === st.id}
                  className={`ex-sub-pill${sub === st.id ? ' is-active' : ''}`}
                  onClick={() => setSubTab(st.id)}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ex-section-head">
          <div>
            <h2 className="ex-section-title">{sectionCopy.title}</h2>
            <p className="ex-section-sub">{sectionCopy.sub}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${sub}`}
            className="ex-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            {isLoading ? (
              <>
                {tab === 'trending' && (
                  <div className="ex-rail-wrap ex-rail-wrap--skel">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="ex-skeleton-rail" />
                    ))}
                  </div>
                )}
                <ExploreSkeleton count={8} />
              </>
            ) : (
              <>
                {tab === 'trending' && trendingRail.length > 0 && (
                  <div className="ex-rail-wrap">
                    <div className="ex-rail-scroll">
                      {trendingRail.map((p, i) => (
                        <ExploreTrendingRailCard key={p._id || p.id} product={p} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {aiHero && <ExploreAIHeroCard product={aiHero} />}

                {tab === 'upcoming' ? (
                  <ExploreUpcomingFeed products={products} loading={isLoading} />
                ) : (
                <div className={`ex-grid${tab === 'ai' && aiHero ? ' ex-grid--after-hero' : ''}`}>
                  {gridProducts.map((item, index) => renderGridItem(item, index))}

                  {!gridProducts.length && !trendingRail.length && !aiHero && (
                    <p className="ex-empty">No products in this feed yet. Check back soon.</p>
                  )}

                  {hasMore && (
                    <button
                      type="button"
                      className="ex-load-more"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    >
                      <RefreshCw size={16} />
                      Load More Products
                    </button>
                  )}

                  {showSiteFooter && (
                    <div className="ex-footer-block">
                      <div className="ex-seller-banner">
                        <p className="ex-seller-banner-title">Discover verified sellers</p>
                        <p className="ex-seller-banner-sub">Escrow-protected checkout on every order</p>
                      </div>
                      <button
                        type="button"
                        className="ex-continue"
                        onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      >
                        Continue Exploring
                      </button>
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </BuyerLayout>
  );
}

/** Re-export for homepage section links */
export { explorePath };
