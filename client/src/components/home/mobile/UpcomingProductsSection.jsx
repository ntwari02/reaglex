import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { explorePath } from '../../explore/exploreConfig';
import { useReducedMotion } from 'framer-motion';
import { useHomeFeedSection } from '../../../hooks/useHomeFeedSections';
import { mergeUpcomingList } from './upcomingProductsData';
import UpcomingProductCard from './UpcomingProductCard';
import '../../../styles/upcoming-products.css';

const SCROLL_SPEED = 0.28;

export default function UpcomingProductsSection() {
  const trackRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const { data: freshProducts, isPending } = useHomeFeedSection('fresh', 6);

  const drops = mergeUpcomingList(Array.isArray(freshProducts) ? freshProducts : []);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => {
    window.setTimeout(() => setPaused(false), 2200);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || reduceMotion || drops.length < 2) return undefined;

    let raf = 0;
    const step = () => {
      if (!paused && el) {
        el.scrollLeft += SCROLL_SPEED;
        const max = el.scrollWidth - el.clientWidth;
        if (max > 0 && el.scrollLeft >= max - 1) el.scrollLeft = 0;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused, reduceMotion, drops.length]);

  return (
    <section className="up-section" aria-labelledby="upcoming-drops-heading">
      <header className="up-header">
        <div className="up-header-text">
          <h2 id="upcoming-drops-heading" className="up-title">
            Upcoming Drops
          </h2>
          <p className="up-subtitle">Launching soon</p>
        </div>
        <Link to={explorePath('upcoming')} className="up-view-all">
          View All →
        </Link>
      </header>

      <div className="up-track-wrap">
        <div
          ref={trackRef}
          className="up-track"
          onTouchStart={pause}
          onTouchEnd={resume}
          onMouseEnter={pause}
          onMouseLeave={resume}
        >
          {isPending && !drops.length
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="up-card up-card--skel" />
              ))
            : drops.map((drop, i) => (
                <UpcomingProductCard key={drop.id} drop={drop} index={i} />
              ))}
        </div>
      </div>
    </section>
  );
}
