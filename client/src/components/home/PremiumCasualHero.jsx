import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Parallax } from 'swiper/modules';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useHeroCarousel } from '../../hooks/useBuyerSiteContent';
import { usePlatformFeature } from '../../hooks/useSystemFeatures';
import UpcomingHeroSlide from './mobile/UpcomingHeroSlide';
import { UPCOMING_HERO_TEASER } from './mobile/upcomingProductsData';
import '../../styles/upcoming-products.css';
import '../../styles/premium-casual-hero.css';

import 'swiper/css';

const FALLBACK_SLIDES = [
  {
    id: 'hello-casual',
    eyebrow: 'Hello casual',
    line1: 'Summer Sale',
    line2: 'Up to 40% OFF',
    detail: 'On selected items.',
    cta: 'Shop now',
    href: '/search?sort=discount',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=max&w=900&q=88',
    imgPosition: 'center center',
  },
  {
    id: 'street-edit',
    eyebrow: 'New drop',
    line1: 'Street edit',
    line2: 'Built to move',
    detail: 'Layered textures & confident silhouettes.',
    cta: 'Explore',
    href: '/category/clothing',
    image:
      'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=max&w=900&q=88',
    imgPosition: 'center center',
  },
  {
    id: 'everyday-tech',
    eyebrow: 'Everyday carry',
    line1: 'Sound & signal',
    line2: 'Refined daily',
    detail: 'Curated audio, wearables & essentials.',
    cta: 'Shop tech',
    href: '/category/electronics',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=max&w=900&q=88',
    imgPosition: 'center center',
  },
];

function slideOverlay(isDark) {
  if (isDark) {
    return 'linear-gradient(100deg, rgba(15,17,21,0.94) 0%, rgba(15,17,21,0.55) 42%, rgba(15,17,21,0.12) 68%, rgba(255,122,26,0.06) 100%)';
  }
  return 'linear-gradient(100deg, rgba(247,247,248,0.94) 0%, rgba(247,247,248,0.45) 40%, rgba(17,17,17,0.08) 58%, rgba(17,17,17,0.38) 100%)';
}

function mapApiSlides(slides) {
  return slides
    .filter((s) => s && s.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((s, i) => ({
      id: `hero-${i}-${s.line1}`,
      eyebrow: s.eyebrow,
      line1: s.line1,
      line2: s.line2,
      detail: s.detail,
      cta: s.cta,
      href: s.href || '/',
      image: s.imageUrl || s.image,
      videoUrl: s.videoUrl,
      imgPosition: s.imgPosition || 'center center',
    }));
}

export default function PremiumCasualHero({ isDark, className = '', compact = false }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const { enabled: heroOn } = usePlatformFeature('hero_carousel');
  const { data: heroData } = useHeroCarousel();
  const baseSlides =
    heroData?.slides?.length > 0 ? mapApiSlides(heroData.slides) : FALLBACK_SLIDES;
  const slides = [
    UPCOMING_HERO_TEASER,
    ...baseSlides.filter((s) => s.variant !== 'upcoming'),
  ];
  const overlay = slideOverlay(isDark);
  const textPrimary = isDark ? '#ffffff' : '#111111';
  const textMuted = isDark ? 'rgba(255,255,255,0.72)' : '#777777';
  const eyebrowColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(17,17,17,0.45)';

  const slideMinH = compact ? 260 : 280;
  const radius = compact ? 16 : 24;
  const fullWidthLg = !compact;

  const sectionPad = compact
    ? 'px-0 pt-0 pb-0'
    : 'w-full px-4 pb-6 sm:px-6 lg:px-0 lg:pb-8 pt-4 sm:pt-5';
  const shellRadius = fullWidthLg ? 'rounded-[24px] lg:rounded-none' : 'overflow-hidden';
  const shellLg = fullWidthLg ? 'lg:border-x-0 lg:border-t-0 lg:shadow-none' : '';

  const articleMinH = compact
    ? ''
    : 'min-h-[248px] md:min-h-[280px] lg:min-h-[360px] xl:min-h-[420px]';

  if (!heroOn) return null;

  return (
    <section
      className={`premium-casual-hero ${sectionPad} ${className}`.trim()}
      aria-label="Featured collections"
    >
      <div
        className={`relative w-full ${shellRadius} ${shellLg}`.trim()}
        style={{
          borderRadius: fullWidthLg ? undefined : radius,
          boxShadow: compact ? 'var(--shadow-sm)' : 'var(--shadow-md)',
          border: '1px solid color-mix(in srgb, var(--border-card) 55%, transparent)',
          overflow: compact ? 'hidden' : 'visible',
        }}
      >
        <Swiper
          modules={[Autoplay, Parallax]}
          parallax
          speed={reduceMotion ? 0 : 720}
          autoplay={
            reduceMotion
              ? false
              : { delay: 6200, disableOnInteraction: true, pauseOnMouseEnter: true }
          }
          pagination={false}
          onSlideChange={(s) => setActive(s.realIndex)}
          className={`premium-casual-swiper !overflow-hidden ${fullWidthLg ? 'rounded-[24px] lg:rounded-none' : ''} ${articleMinH}`.trim()}
          style={compact ? { minHeight: slideMinH, borderRadius: radius } : undefined}
        >
          {slides.map((slide, i) => (
            <SwiperSlide key={slide.id} className="!h-auto">
              {slide.variant === 'upcoming' ? (
                <UpcomingHeroSlide slide={slide} isDark={isDark} compact={compact} />
              ) : (
              <article
                className={`premium-casual-slide ${compact ? 'premium-casual-slide--compact' : 'premium-casual-slide--full relative overflow-hidden'} ${articleMinH || ''}`.trim()}
                style={{
                  ...(compact ? { minHeight: slideMinH } : { '--casual-img-pos': slide.imgPosition || 'center center' }),
                }}
                data-theme-mode={isDark ? 'dark' : 'light'}
              >
                {compact ? (
                  <>
                    <div className="premium-casual-slide__mesh" aria-hidden />
                    <div
                      className="premium-casual-slide__inner"
                      style={{ minHeight: slideMinH }}
                    >
                      <div className="premium-casual-slide__copy">
                        <p
                          className="font-semibold uppercase tracking-[0.18em] text-[9px]"
                          style={{ color: eyebrowColor }}
                        >
                          {slide.eyebrow}
                        </p>
                        <h2
                          className="mt-1 text-lg font-bold leading-[1.08] tracking-tight"
                          style={{ color: textPrimary }}
                        >
                          {slide.line1}
                          <br />
                          <span style={{ color: 'var(--brand-primary)' }}>{slide.line2}</span>
                        </h2>
                        <div className="mt-2.5">
                          <Link
                            to={slide.href}
                            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full px-3.5 py-1 text-[11px] font-semibold transition-transform active:scale-[0.97]"
                            style={{
                              background: 'var(--brand-primary)',
                              color: '#ffffff',
                              boxShadow: 'var(--shadow-cta)',
                            }}
                          >
                            {slide.cta === 'Shop now' || slide.cta === 'Shop Now' ? 'Shop Now' : slide.cta}
                            <ArrowRight size={12} strokeWidth={2.25} />
                          </Link>
                        </div>
                      </div>
                      <div className="premium-casual-slide__visual">
                        {slide.videoUrl ? (
                          <video
                            src={slide.videoUrl}
                            className="premium-casual-slide__video"
                            autoPlay
                            muted
                            loop
                            playsInline
                            poster={slide.image}
                          />
                        ) : (
                          <img
                            src={slide.image}
                            alt=""
                            className="premium-casual-slide__img select-none"
                            loading={i === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                            draggable={false}
                          />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="premium-casual-slide__media">
                      {slide.videoUrl ? (
                        <video
                          src={slide.videoUrl}
                          className="premium-casual-slide__video"
                          autoPlay
                          muted
                          loop
                          playsInline
                          poster={slide.image}
                        />
                      ) : (
                        <img
                          src={slide.image}
                          alt=""
                          className="premium-casual-slide__img select-none"
                          loading={i === 0 ? 'eager' : 'lazy'}
                          decoding="async"
                          draggable={false}
                        />
                      )}
                    </div>
                    <div
                      className="absolute inset-0"
                      style={{ background: overlay }}
                      data-swiper-parallax-opacity="0.3"
                    />
                    <div
                      className={`relative z-[1] flex w-full flex-row items-stretch ${articleMinH || ''}`.trim()}
                    >
                      <div
                        className="flex max-w-[58%] flex-col justify-center px-5 py-7 lg:max-w-[48%] lg:px-10 lg:py-10 xl:px-14"
                        data-swiper-parallax="-120"
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: eyebrowColor }}
                        >
                          {slide.eyebrow}
                        </p>
                        <h2
                          className="mt-1 font-bold leading-[1.08] tracking-tight"
                          style={{
                            color: textPrimary,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontSize: 'clamp(1.75rem, 7vw, 2.15rem)',
                          }}
                        >
                          {slide.line1}
                          <br />
                          <span style={{ color: 'var(--brand-primary)' }}>{slide.line2}</span>
                        </h2>
                        <p className="mt-2 text-[13px] leading-relaxed" style={{ color: textMuted }}>
                          {slide.detail}
                        </p>
                        <div className="mt-5" data-swiper-parallax="-60">
                          <Link
                            to={slide.href}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full px-6 py-2.5 text-[13px] font-semibold transition-transform active:scale-[0.97]"
                            style={{
                              background: 'var(--brand-primary)',
                              color: '#ffffff',
                              boxShadow: 'var(--shadow-cta)',
                            }}
                          >
                            {slide.cta === 'Shop now' || slide.cta === 'Shop Now' ? 'Shop Now' : slide.cta}
                            <ArrowRight size={14} strokeWidth={2.25} />
                          </Link>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1" aria-hidden />
                    </div>
                  </>
                )}
              </article>
              )}
            </SwiperSlide>
          ))}
        </Swiper>

        <div
          className={`pointer-events-none absolute left-0 right-0 z-10 flex justify-center gap-1 ${compact ? 'bottom-2' : 'bottom-3'}`}
        >
          {slides.map((s, i) => (
            <span
              key={s.id}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === active ? 22 : 6,
                background:
                  i === active
                    ? 'var(--brand-primary)'
                    : isDark
                      ? 'rgba(255,255,255,0.35)'
                      : 'rgba(17,17,17,0.2)',
                boxShadow:
                  i === active
                    ? '0 0 16px color-mix(in srgb, var(--brand-primary) 50%, transparent)'
                    : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
