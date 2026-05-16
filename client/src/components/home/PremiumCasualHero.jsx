import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Parallax } from 'swiper/modules';
import { useReducedMotion } from 'framer-motion';

import 'swiper/css';

const CASUAL_SLIDES = [
  {
    id: 'hello-casual',
    eyebrow: 'Hello casual',
    line1: 'Summer Sale',
    line2: 'Up to 40% OFF',
    detail: 'On selected items.',
    cta: 'Shop now',
    href: '/search?sort=discount',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1400&q=88',
    imgPosition: '92% center',
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
      'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1400&q=88',
    imgPosition: '80% center',
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
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1400&q=88',
    imgPosition: '75% center',
  },
];

function slideOverlay(isDark) {
  if (isDark) {
    return 'linear-gradient(100deg, rgba(15,17,21,0.94) 0%, rgba(15,17,21,0.55) 42%, rgba(15,17,21,0.12) 68%, rgba(255,122,26,0.06) 100%)';
  }
  return 'linear-gradient(100deg, rgba(247,247,248,0.94) 0%, rgba(247,247,248,0.45) 40%, rgba(17,17,17,0.08) 58%, rgba(17,17,17,0.38) 100%)';
}

export default function PremiumCasualHero({ isDark, className = '' }) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const overlay = slideOverlay(isDark);
  const textPrimary = isDark ? '#ffffff' : '#111111';
  const textMuted = isDark ? 'rgba(255,255,255,0.72)' : '#777777';
  const eyebrow = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(17,17,17,0.45)';

  return (
    <section
      className={`premium-casual-hero px-4 pb-6 ${className}`.trim()}
      aria-label="Featured collections"
    >
      <div
        className="relative overflow-hidden rounded-[24px]"
        style={{
          boxShadow: 'var(--shadow-md)',
          border: '1px solid color-mix(in srgb, var(--border-card) 55%, transparent)',
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
          className="premium-casual-swiper !overflow-hidden rounded-[24px]"
          style={{ minHeight: 248 }}
        >
          {CASUAL_SLIDES.map((slide, i) => (
            <SwiperSlide key={slide.id} className="!h-auto">
              <article className="relative min-h-[248px] overflow-hidden">
                <img
                  src={slide.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover select-none scale-[1.06]"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  data-swiper-parallax="-18%"
                  data-swiper-parallax-scale="1.08"
                  style={{ objectPosition: slide.imgPosition }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: overlay }}
                  data-swiper-parallax-opacity="0.35"
                />

                <div className="relative z-[1] flex min-h-[248px] w-full flex-row items-stretch">
                  <div
                    className="flex max-w-[58%] flex-col justify-center px-5 py-7 pr-2"
                    data-swiper-parallax="-120"
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                      style={{ color: eyebrow }}
                    >
                      {slide.eyebrow}
                    </p>
                    <h2
                      className="mt-2 font-bold leading-[1.05] tracking-tight"
                      style={{
                        color: textPrimary,
                        fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
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
                        className="inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-2.5 text-[13px] font-semibold transition-transform active:scale-[0.97]"
                        style={{
                          background: 'var(--brand-primary)',
                          color: '#ffffff',
                          boxShadow: 'var(--shadow-cta)',
                        }}
                      >
                        {slide.cta}
                      </Link>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1" aria-hidden />
                </div>
              </article>
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
          {CASUAL_SLIDES.map((s, i) => (
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
