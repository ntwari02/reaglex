import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { PageSeo } from '../components/seo/PageSeo';
import { getPreferredSiteOrigin } from '../lib/siteOrigin';
import BuyerLayout from '../components/buyer/BuyerLayout';
import PremiumMobileHome from '../components/home/PremiumMobileHome';
import FuturisticHero from '../components/home/FuturisticHero';
const FeaturedCategories = lazy(() => import('../components/home/FeaturedCategories'));
const TrendingProducts = lazy(() => import('../components/home/TrendingProducts'));
const PromoBanner = lazy(() => import('../components/home/PromoBanner'));
const BestSellers = lazy(() => import('../components/home/BestSellers'));
const TrustSection = lazy(() => import('../components/home/TrustSection'));
const RecommendedSection = lazy(() => import('../components/home/RecommendedSection'));

function HomeSectionSkeleton({ height = 420 }) {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-12">
      <div
        className="rounded-2xl overflow-hidden animate-pulse"
        style={{
          minHeight: height,
          background: 'var(--bg-card, #eef0f5)',
          border: '1px solid var(--card-border, rgba(0,0,0,0.08))',
        }}
      />
    </div>
  );
}

function DeferredSection({ children, fallbackHeight = 420, rootMargin = '400px 0px' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref}>
      {visible ? children : <HomeSectionSkeleton height={fallbackHeight} />}
    </div>
  );
}

export default function Home() {
  const origin = getPreferredSiteOrigin();

  return (
    <BuyerLayout>
      <PageSeo
        title="Spacilly – Shop with escrow protection"
        description="Discover premium products from verified sellers. Secure payments, fast delivery, and buyer protection built in."
        canonicalUrl={origin ? `${origin}/` : undefined}
        ogImage={origin ? `${origin}/logo.jpg` : undefined}
        ogType="website"
      />
      <div className="md:hidden">
        <PremiumMobileHome />
      </div>

      <div className="hidden md:block w-full">
        <FuturisticHero />
      </div>

      <div className="hidden md:block">
        <DeferredSection fallbackHeight={500} rootMargin="520px 0px">
          <Suspense fallback={<HomeSectionSkeleton height={500} />}>
            <FeaturedCategories />
          </Suspense>
        </DeferredSection>
        <DeferredSection fallbackHeight={520}>
          <Suspense fallback={<HomeSectionSkeleton height={520} />}>
            <TrendingProducts />
          </Suspense>
        </DeferredSection>
        <DeferredSection fallbackHeight={380}>
          <Suspense fallback={<HomeSectionSkeleton height={380} />}>
            <PromoBanner />
          </Suspense>
        </DeferredSection>
        <DeferredSection fallbackHeight={440}>
          <Suspense fallback={<HomeSectionSkeleton height={440} />}>
            <BestSellers />
          </Suspense>
        </DeferredSection>
        <DeferredSection fallbackHeight={560}>
          <Suspense fallback={<HomeSectionSkeleton height={560} />}>
            <TrustSection />
          </Suspense>
        </DeferredSection>
        <DeferredSection fallbackHeight={540}>
          <Suspense fallback={<HomeSectionSkeleton height={540} />}>
            <RecommendedSection />
          </Suspense>
        </DeferredSection>
      </div>
    </BuyerLayout>
  );
}
