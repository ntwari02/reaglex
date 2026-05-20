import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AnimatePresence, motion } from 'framer-motion';

import {

  ArrowLeft,

  ChevronDown,

  Flame,

  MapPin,

  RefreshCw,

  Search,

  ShoppingBag,

  Zap,

} from 'lucide-react';

import BuyerLayout from '../buyer/BuyerLayout';

import { useBuyerCart } from '../../stores/buyerCartStore';

import {

  EXPLORE_MAIN_TABS,

  EXPLORE_SUB_TABS,

  defaultSubForTab,

  productMatchesCategory,

  sectionCopyFor,

} from './exploreConfig';

import { injectExploreAds, useExploreFeed } from './useExploreFeed';

import ExploreCategoryFilters from './ExploreCategoryFilters';

import {

  AIGridCard,

  BestSellerGridCard,

  MostViewedGridCard,

  NewArrivalGridCard,

  TrendingGridCard,

} from '../cards/PremiumCards';

import {

  ExploreAIHeroCard,

  ExploreGridCard,

  ExploreRailCard,

  ExploreSellerBanner,

  renderFeedInsert,

} from './ExploreCards';

import { useRouteUiMemory } from '../../spa/useRouteUiMemory';
import { useHorizontalScrollMemory } from '../../spa/useHorizontalScrollMemory';
import HorizontalScrollRail from '../../spa/HorizontalScrollRail';

const PAGE_SIZE_MOBILE = 20;

const PAGE_SIZE_DESKTOP = 32;

const FOOTER_BATCHES = 3;



function useExplorePageSize() {

  const [pageSize, setPageSize] = useState(PAGE_SIZE_MOBILE);



  useEffect(() => {

    const mq = window.matchMedia('(min-width: 768px)');

    const sync = () => setPageSize(mq.matches ? PAGE_SIZE_DESKTOP : PAGE_SIZE_MOBILE);

    sync();

    mq.addEventListener('change', sync);

    return () => mq.removeEventListener('change', sync);

  }, []);



  return pageSize;

}



const SOURCE_VARIANT = {

  trending: 'trending',

  bestsellers: 'bestseller',

  foryou: 'ai',

  viewed: 'viewed',

  fresh: 'new',

  upcoming: 'upcoming',

};



const SUB_ICONS = {

  flame: Flame,

  zap: Zap,

  map: MapPin,

};



function ExploreSkeleton({ count = 8 }) {

  return (

    <div className="ex-skeleton-grid">

      {Array.from({ length: count }).map((_, i) => (

        <div key={i} className="ex-skeleton-card" />

      ))}

    </div>

  );

}



function SubTabIcon({ icon }) {

  const Icon = SUB_ICONS[icon];

  if (!Icon) return null;

  return <Icon size={14} className="ex-sub-icon" aria-hidden />;

}



export default function ExploreAllMobile() {

  const navigate = useNavigate();

  const [params, setParams] = useSearchParams();

  const tab = params.get('tab') || 'all';

  const sub = params.get('sub') || defaultSubForTab(tab) || '';

  const cartItems = useBuyerCart((s) => s.items);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);



  const pageSize = useExplorePageSize();

  const { products: rawProducts, isLoading } = useExploreFeed(tab, sub);

  const feedKey = `${tab}|${sub}`;

  const [routeUi, setRouteUi] = useRouteUiMemory({

    categoryFilter: 'all',

    sortOpen: false,

    visibleCounts: {},

  });

  const visibleCount = routeUi.visibleCounts[feedKey] ?? pageSize;

  const setVisibleCount = useCallback(

    (updater) => {

      const prev = routeUi.visibleCounts[feedKey] ?? pageSize;

      const next = typeof updater === 'function' ? updater(prev) : updater;

      setRouteUi({

        visibleCounts: { ...routeUi.visibleCounts, [feedKey]: next },

      });

    },

    [feedKey, pageSize, routeUi.visibleCounts, setRouteUi],

  );

  const categoryFilter = routeUi.categoryFilter;

  const setCategoryFilter = useCallback(

    (next) => setRouteUi({ categoryFilter: next }),

    [setRouteUi],

  );

  const sortOpen = routeUi.sortOpen;

  const setSortOpen = useCallback(

    (updater) => {

      const next = typeof updater === 'function' ? updater(routeUi.sortOpen) : updater;

      setRouteUi({ sortOpen: next });

    },

    [routeUi.sortOpen, setRouteUi],

  );

  const subTabsRef = useRef(null);

  useHorizontalScrollMemory('explore-subtabs-rail', subTabsRef);



  const products = useMemo(() => {

    if (tab !== 'trending' || categoryFilter === 'all') return rawProducts;

    return rawProducts.filter((p) => productMatchesCategory(p, categoryFilter));

  }, [rawProducts, tab, categoryFilter]);



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

  const variantKey = tab === 'all' ? 'trending' : tab;



  const trendingRail = tab === 'trending' ? products.slice(0, 4) : [];

  const aiHero = tab === 'ai' && products[0] ? products[0] : null;



  const gridProducts = useMemo(() => {

    let base = products;

    if (tab === 'trending') base = products.slice(4, visibleCount);

    else if (tab === 'ai') base = products.slice(1, visibleCount);

    else base = products.slice(0, visibleCount);

    if (tab === 'all' || tab === 'trending') return injectExploreAds(base, 20);

    return base;

  }, [products, visibleCount, tab]);



  const hasMore = visibleCount < products.length;

  const batchesLoaded = Math.ceil(visibleCount / pageSize);

  const showSiteFooter = batchesLoaded >= FOOTER_BATCHES && !hasMore;



  const renderGridCard = (item, index) => {

    const insert = renderFeedInsert(item);

    if (insert) return insert;

    const key = item._id || item.id || index;

    const props = { product: item, index };

    if (tab === 'trending') return <TrendingGridCard key={key} {...props} />;

    if (tab === 'bestseller') return <BestSellerGridCard key={key} {...props} />;

    if (tab === 'ai') return <AIGridCard key={key} {...props} />;

    if (tab === 'viewed') return <MostViewedGridCard key={key} {...props} />;

    if (tab === 'new' || tab === 'upcoming') return <NewArrivalGridCard key={key} {...props} />;

    const cardVariant =

      tab === 'all' ? SOURCE_VARIANT[item._exploreSource] || 'trending' : variantKey;

    return (

      <ExploreGridCard

        key={key}

        product={item}

        variantKey={cardVariant}

        index={index}

        meta={item._exploreMeta}

      />

    );

  };



  return (

    <BuyerLayout className="ex-page-shell">

      <div className="ex-page">

        <header className="ex-topbar">

          <button type="button" className="ex-topbar-btn" onClick={() => navigate(-1)} aria-label="Back">

            <ArrowLeft size={22} />

          </button>

          <h1 className="ex-topbar-title">Explore All</h1>

          <div className="ex-topbar-actions">

            <Link to="/search" className="ex-topbar-btn" aria-label="Search">

              <Search size={20} />

            </Link>

            <button

              type="button"

              className="ex-topbar-btn ex-topbar-btn--cart"

              onClick={() => navigate('/')}

              aria-label="Cart"

            >

              <ShoppingBag size={20} />

              {cartCount > 0 && <span className="ex-cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>}

            </button>

          </div>

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

                  {st.icon && <SubTabIcon icon={st.icon} />}

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

          {tab !== 'all' && (

            <button

              type="button"

              className="ex-sort-btn"

              onClick={() => setSortOpen((v) => !v)}

              aria-expanded={sortOpen}

            >

              Sort by

              <ChevronDown size={14} className={sortOpen ? 'ex-rot' : ''} />

            </button>

          )}

        </div>



        <AnimatePresence mode="wait">

          <motion.div

            key={`${tab}-${sub}-${categoryFilter}`}

            initial={{ opacity: 0, y: 6 }}

            animate={{ opacity: 1, y: 0 }}

            exit={{ opacity: 0, y: -4 }}

            transition={{ duration: 0.22 }}

            className="ex-content"

          >

            {isLoading ? (

              <ExploreSkeleton count={pageSize >= PAGE_SIZE_DESKTOP ? 10 : 6} />

            ) : (

              <>

                {tab === 'trending' && trendingRail.length > 0 && (

                  <div className="ex-rail-wrap">

                    <HorizontalScrollRail

                      railId="explore-trending-hero-rail"

                      className="ex-rail-scroll rx-card-rail ex-rail-scroll--hero"

                    >

                      {trendingRail.map((p, i) => (

                        <ExploreRailCard key={p._id || p.id} product={p} index={i} />

                      ))}

                    </HorizontalScrollRail>

                  </div>

                )}



                {tab === 'trending' && (

                  <ExploreCategoryFilters activeId={categoryFilter} onChange={setCategoryFilter} />

                )}



                <div className="ex-feed">

                  {aiHero && <ExploreAIHeroCard product={aiHero} />}



                  <div className={`ex-grid${tab === 'ai' && aiHero ? ' ex-grid--after-hero' : ''}`}>

                    {gridProducts.map((item, index) => renderGridCard(item, index))}



                    {!gridProducts.length && !trendingRail.length && !aiHero && (

                      <p className="ex-empty">No products in this feed yet. Check back soon.</p>

                    )}



                    {hasMore && (

                      <button

                        type="button"

                        className="ex-load-more"

                        onClick={() => setVisibleCount((c) => c + pageSize)}

                      >

                        <RefreshCw size={16} />

                        Load More Products

                      </button>

                    )}



                    {showSiteFooter && (

                      <div className="ex-footer-block">

                        <ExploreSellerBanner />

                        <button

                          type="button"

                          className="ex-continue"

                          onClick={() => setVisibleCount((c) => c + pageSize)}

                        >

                          Continue Exploring

                        </button>

                      </div>

                    )}

                  </div>

                </div>

              </>

            )}

          </motion.div>

        </AnimatePresence>

      </div>

    </BuyerLayout>

  );

}


