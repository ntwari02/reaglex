import { useState } from 'react';
import { motion } from 'framer-motion';
import { useHomeFeedBundle } from '../../hooks/useHomeFeedSections';
import PremiumCasualHero from './PremiumCasualHero';
import PremiumCategoryChips from './PremiumCategoryChips';
import { useTheme } from '../../contexts/ThemeContext';
import MobileSectionHeader from './mobile/MobileSectionHeader';
import MobileCommerceBanner from './mobile/MobileCommerceBanner';
import TrendingCarouselCard from './mobile/TrendingCarouselCard';
import BestSellerCarouselCard from './mobile/BestSellerCarouselCard';
import CompactGridProductCard from './mobile/CompactGridProductCard';
import AIRecommendationsMobile from './mobile/AIRecommendationsMobile';
import RecentlyViewedMobile from './mobile/RecentlyViewedMobile';
import MobileTrustStrip from './mobile/MobileTrustStrip';
import SuperDealsBanner from './mobile/SuperDealsBanner';

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
      {/* 3. Categories */}
      <PremiumCategoryChips activeId={cat} onSelect={setCat} />

      {/* 4. Hello carousel */}
      <PremiumCasualHero isDark={isDark} compact />

      <MobileTrustStrip />

      {/* 5. Trending — horizontal swipe */}
      <section className="mob-section pt-2" aria-labelledby="mob-trending">
        <MobileSectionHeader
          id="mob-trending"
          title="Trending Now"
          href="/search?sort=trending"
        />
        {loading.trending ? (
          <div className="mob-horizontal-scroll">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mob-card-surface h-[200px] w-[148px] pwa-skeleton" />
            ))}
          </div>
        ) : (
          <div className="mob-horizontal-scroll">
            {trending.map((p, i) => (
              <TrendingCarouselCard key={p._id || p.id || i} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      <SuperDealsBanner />

      {/* 7. Best sellers — horizontal premium */}
      <section className="mob-section" aria-labelledby="mob-bestsellers">
        <MobileSectionHeader
          id="mob-bestsellers"
          title="Best sellers"
          subtitle="Top-rated this week"
          href="/search?sort=bestseller"
        />
        {loading.best ? (
          <div className="mob-horizontal-scroll">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mob-card-surface h-[210px] w-[156px] pwa-skeleton" />
            ))}
          </div>
        ) : (
          <div className="mob-horizontal-scroll">
            {bestSellers.map((p, i) => (
              <BestSellerCarouselCard key={p._id || p.id || i} product={p} rank={i} index={i} />
            ))}
          </div>
        )}
      </section>

      <MobileCommerceBanner
        variant="ai"
        title="AI picks just for you"
        subtitle="Smart recommendations from Reaglex"
        href="/search"
        cta="Explore"
      />

      {/* 8. AI recommendations */}
      <AIRecommendationsMobile products={aiRecs} loading={loading.ai} />

      <MobileCommerceBanner
        variant="shipping"
        title="Free shipping over $50"
        subtitle="On eligible orders · Track in app"
        href="/buyer-protection"
        cta="Details"
      />

      {/* 9. New arrivals — 2-col grid */}
      <section className="mob-section" aria-labelledby="mob-fresh">
        <MobileSectionHeader
          id="mob-fresh"
          title="New arrivals"
          subtitle="Fresh drops · 4–6 per screen"
          href="/search?sort=newest"
        />
        {loading.fresh ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mob-card-surface aspect-[3/4.2] pwa-skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {fresh.map((p, i) => (
              <CompactGridProductCard key={p._id || p.id || i} product={p} index={i} />
            ))}
          </div>
        )}
      </section>

      <MobileCommerceBanner
        variant="fashion"
        title="Fashion week edit"
        subtitle="Curated looks · Limited stock"
        href="/category/clothing"
        cta="View"
      />

      {/* 10. Recently viewed */}
      <RecentlyViewedMobile />
    </motion.div>
  );
}
