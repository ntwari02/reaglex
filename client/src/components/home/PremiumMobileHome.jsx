import { useState } from 'react';
import { motion } from 'framer-motion';
import { useHomeFeedBundle } from '../../hooks/useHomeFeedSections';
import PremiumCasualHero from './PremiumCasualHero';
import PremiumCategoryChips from './PremiumCategoryChips';
import { useTheme } from '../../contexts/ThemeContext';
import MobileSectionHeader from './mobile/MobileSectionHeader';
import TrendingCarouselCard from './mobile/TrendingCarouselCard';
import BestSellerCarouselCard from './mobile/BestSellerCarouselCard';
import CompactGridProductCard from './mobile/CompactGridProductCard';
import AIRecommendationsMobile from './mobile/AIRecommendationsMobile';
import RecentlyViewedMobile from './mobile/RecentlyViewedMobile';
import MobileTrustStrip from './mobile/MobileTrustStrip';
import SuperDealsBanner from './mobile/SuperDealsBanner';
import UpcomingProductsMobile from './mobile/UpcomingProductsMobile';
import { explorePath } from '../explore/exploreConfig';
import HorizontalScrollRail from '../../spa/HorizontalScrollRail';

export default function PremiumMobileHome() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [cat, setCat] = useState('all');
  const { data: feed, isPending } = useHomeFeedBundle(10);

  const trending = feed?.trending ?? [];
  const bestSellers = feed?.bestsellers ?? [];
  const fresh = feed?.fresh ?? [];
  const aiRecs = feed?.foryou ?? [];
  const loading = {
    trending: isPending && !trending.length,
    best: isPending && !bestSellers.length,
    fresh: isPending && !fresh.length,
    ai: isPending && !aiRecs.length,
  };

  return (
    <motion.div
      className="mob-page md:hidden pb-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
      style={{ background: 'var(--bg-page)' }}
    >
      <PremiumCategoryChips activeId={cat} onSelect={setCat} />

      <PremiumCasualHero isDark={isDark} compact />

      <MobileTrustStrip />

      {/* 1. Trending Now */}
      <section className="mob-section pt-2" aria-labelledby="mob-trending">
        <MobileSectionHeader
          id="mob-trending"
          title="Trending Now"
          href={explorePath('trending')}
        />
        {loading.trending ? (
          <div className="mob-horizontal-scroll">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mob-card-surface h-[200px] w-[148px] pwa-skeleton" />
            ))}
          </div>
        ) : (
          <HorizontalScrollRail
            railId="home-trending-rail"
            className="rx-card-rail mob-horizontal-scroll"
          >
            {trending.map((p, i) => (
              <TrendingCarouselCard key={p._id || p.id || i} product={p} index={i} />
            ))}
          </HorizontalScrollRail>
        )}
      </section>

      {/* 2. Best Sellers */}
      <section className="mob-section" aria-labelledby="mob-bestsellers">
        <MobileSectionHeader
          id="mob-bestsellers"
          title="Best sellers"
          subtitle="Top-rated this week"
          href={explorePath('bestseller')}
        />
        {loading.best ? (
          <div className="mob-horizontal-scroll">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mob-card-surface h-[210px] w-[156px] pwa-skeleton" />
            ))}
          </div>
        ) : (
          <div className="rx-card-grid">
            {bestSellers.slice(0, 6).map((p, i) => (
              <BestSellerCarouselCard key={p._id || p.id || i} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Recommended For You */}
      <AIRecommendationsMobile products={aiRecs} loading={loading.ai} />

      {/* 4. Upcoming Products */}
      <UpcomingProductsMobile />

      {/* 5. New Arrivals */}
      <section className="mob-section" aria-labelledby="mob-fresh">
        <MobileSectionHeader
          id="mob-fresh"
          title="New arrivals"
          subtitle="Fresh drops · 4–6 per screen"
          href={explorePath('new')}
        />
        {loading.fresh ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mob-card-surface aspect-[3/4.2] pwa-skeleton" />
            ))}
          </div>
        ) : (
          <div className="rx-card-grid">
            {fresh.map((p, i) => (
              <CompactGridProductCard key={p._id || p.id || i} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Flash Deals */}
      <SuperDealsBanner />

      {/* 7. Recently Viewed */}
      <RecentlyViewedMobile />
    </motion.div>
  );
}
