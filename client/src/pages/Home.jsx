import { useSeo } from '../utils/useSeo';
import BuyerLayout from '../components/buyer/BuyerLayout';

// ── New cinematic homepage sections ─────────────────────────────────────────
import ReimaginedHero       from '../components/home/ReimaginedHero';
import FeaturedCategories   from '../components/home/FeaturedCategories';
import TrendingProducts     from '../components/home/TrendingProducts';
import BestSellers          from '../components/home/BestSellers';
import TrustSection         from '../components/home/TrustSection';
import PromoBanner          from '../components/home/PromoBanner';
import RecommendedSection   from '../components/home/RecommendedSection';

export default function Home() {
  useSeo({
    title: 'Reaglex – Shop the Future',
    description: 'Discover premium products from verified sellers. Secure payments, fast delivery, and buyer protection built in.',
  });

  return (
    <BuyerLayout>
      {/* Hero extends to top of viewport, cancelling BuyerLayout's navbar padding */}
      <div className="-mt-[150px]">
        <ReimaginedHero />
      </div>

      {/* ── E-commerce sections ── */}
      <FeaturedCategories />
      <TrendingProducts />
      <PromoBanner />
      <BestSellers />
      <TrustSection />
      <RecommendedSection />
    </BuyerLayout>
  );
}
