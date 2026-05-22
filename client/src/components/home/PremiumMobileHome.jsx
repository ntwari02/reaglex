import { useState } from 'react';
import { motion } from 'framer-motion';
import { useHomeFeedBundle } from '../../hooks/useHomeFeedSections';
import { HOME_PRODUCT_LIMIT } from './mobile/HomeExploreSection';
import PremiumCasualHero from './PremiumCasualHero';
import PremiumCategoryChips from './PremiumCategoryChips';
import { useTheme } from '../../contexts/ThemeContext';
import HomeExploreSection from './mobile/HomeExploreSection';
import UpcomingProductsSection from './mobile/UpcomingProductsSection';
import MobileTrustStrip from './mobile/MobileTrustStrip';
import SuperDealsBanner from './mobile/SuperDealsBanner';
import TrendingLiveRail from '../live/TrendingLiveRail';
import RecentlyViewedMobile from './mobile/RecentlyViewedMobile';
import { explorePath } from '../explore/exploreConfig';
import '../../styles/explore-all.css';
import '../../styles/home-explore-bridge.css';

export default function PremiumMobileHome() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [cat, setCat] = useState('all');
  const { data: feed, isPending } = useHomeFeedBundle(HOME_PRODUCT_LIMIT);

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

      <TrendingLiveRail />

      <HomeExploreSection
        id="mob-trending"
        title="Trending Now"
        subtitle="Hot picks · swipe or browse below"
        href={explorePath('trending')}
        products={trending}
        loading={loading.trending}
        layout="trending"
        variant="trending"
      />

      <HomeExploreSection
        id="mob-bestsellers"
        title="Best sellers"
        subtitle="Top-rated this week"
        href={explorePath('bestseller')}
        products={bestSellers}
        loading={loading.best}
        layout="grid"
        variant="bestseller"
      />

      <HomeExploreSection
        id="mob-ai-recs"
        title="AI for you"
        subtitle="Personalized picks"
        href={explorePath('ai')}
        products={aiRecs}
        loading={loading.ai}
        layout="ai"
        variant="ai"
      />

      <UpcomingProductsSection />

      <HomeExploreSection
        id="mob-fresh"
        title="New arrivals"
        subtitle="Fresh drops · updated daily"
        href={explorePath('new')}
        products={fresh}
        loading={loading.fresh}
        layout="grid"
        variant="new"
      />

      <SuperDealsBanner />

      <RecentlyViewedMobile />
    </motion.div>
  );
}
