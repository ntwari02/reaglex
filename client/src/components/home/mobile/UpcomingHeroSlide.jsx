import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { formatCountdown } from './upcomingProductsData';

/**
 * Single upcoming teaser slide for Hello carousel (compact).
 */
export default function UpcomingHeroSlide({ slide, isDark, compact }) {
  const [left, setLeft] = useState(() => Math.max(0, (slide.launchAt || 0) - Date.now()));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, (slide.launchAt || 0) - Date.now()));
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [slide.launchAt]);

  const minH = compact ? 196 : 150;

  return (
    <article
      className="up-hero-slide"
      style={{ minHeight: minH }}
      data-theme-mode={isDark ? 'dark' : 'light'}
    >
      <div className="up-hero-slide-mesh" aria-hidden />
      <div className="up-hero-slide-inner">
        <div className="up-hero-slide-copy">
          <p className="up-hero-eyebrow">{slide.eyebrow}</p>
          <h2 className="up-hero-title">
            {slide.line1}
            <span className="up-hero-accent"> {slide.line2}</span>
          </h2>
          <p className="up-hero-sub">{slide.detail}</p>
          <span className="up-hero-countdown">{formatCountdown(left)}</span>
          <Link to={slide.href || '/explore?tab=upcoming'} className="up-hero-cta">
            {slide.cta}
            <ArrowRight size={13} strokeWidth={2.25} />
          </Link>
        </div>
        <div className="up-hero-visual">
          <span className="up-hero-glow" aria-hidden />
          <motion.img
            src={slide.image}
            alt=""
            className="up-hero-img"
            loading="lazy"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </article>
  );
}
