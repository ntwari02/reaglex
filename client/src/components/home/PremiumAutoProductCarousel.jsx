import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import { useReducedMotion } from 'framer-motion';
import PremiumCarouselProductCard from './PremiumCarouselProductCard';

import 'swiper/css';

const AUTO_DELAY = 3800;

export default function PremiumAutoProductCarousel({
  products = [],
  title = 'You might also like',
  subtitle = 'Recommended for you',
  viewAllHref = '/search',
  className = '',
}) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo(() => {
    if (!products?.length) return [];
    if (products.length >= 4) return products;
    return [...products, ...products];
  }, [products]);

  if (!slides.length) return null;

  const dotCount = products.length;
  const activeDot = useMemo(() => {
    if (!dotCount) return 0;
    const slide = slides[activeIndex];
    if (!slide) return activeIndex % dotCount;
    const idx = products.findIndex((p) => (p._id || p.id) === (slide._id || slide.id));
    return idx >= 0 ? idx : activeIndex % dotCount;
  }, [activeIndex, slides, products, dotCount]);

  return (
    <section className={`premium-auto-product-carousel ${className}`.trim()} aria-label={title}>
      <div className="mb-5 flex items-end justify-between gap-3 px-4 md:px-0">
        <div>
          {subtitle && (
            <p
              className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {subtitle}
            </p>
          )}
          <h2 className="text-[22px] font-bold tracking-tight md:text-2xl" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="shrink-0 text-[13px] font-semibold"
            style={{ color: 'var(--brand-primary)' }}
          >
            View all
          </Link>
        )}
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-[2] h-full w-10"
          style={{ background: 'linear-gradient(90deg, var(--bg-page) 0%, transparent 100%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 z-[2] h-full w-10"
          style={{ background: 'linear-gradient(270deg, var(--bg-page) 0%, transparent 100%)' }}
        />

        <Swiper
          modules={[Autoplay]}
          className="premium-auto-product-swiper !overflow-visible px-2"
          centeredSlides
          slidesPerView="auto"
          spaceBetween={14}
          loop={slides.length > 1}
          speed={reduceMotion ? 0 : 620}
          autoplay={
            reduceMotion || slides.length < 2
              ? false
              : {
                  delay: AUTO_DELAY,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }
          }
          onSlideChange={(s) => setActiveIndex(s.realIndex)}
          onSwiper={(s) => setActiveIndex(s.realIndex)}
        >
          {slides.map((product, i) => (
            <SwiperSlide key={`${product._id || product.id || i}-${i}`} className="premium-auto-product-slide">
              <PremiumCarouselProductCard product={product} isActive={i === activeIndex} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {dotCount > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {products.map((p, i) => (
            <span
              key={p._id || p.id || i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === activeDot ? 20 : 6,
                background:
                  i === activeDot
                    ? 'var(--brand-primary)'
                    : 'color-mix(in srgb, var(--text-muted) 35%, transparent)',
                boxShadow:
                  i === activeDot
                    ? '0 0 12px color-mix(in srgb, var(--brand-primary) 50%, transparent)'
                    : 'none',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
