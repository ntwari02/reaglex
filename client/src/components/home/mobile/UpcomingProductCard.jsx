import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Clock } from 'lucide-react';
import { explorePath } from '../../explore/exploreConfig';
import { formatCountdown } from './upcomingProductsData';

/**
 * Upcoming drop card — matches Explore All grid aesthetic.
 */
export default function UpcomingProductCard({ drop, index = 0, onNotify }) {
  const [left, setLeft] = useState(() => Math.max(0, (drop.launchAt || 0) - Date.now()));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, (drop.launchAt || 0) - Date.now()));
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [drop.launchAt]);

  return (
    <motion.article
      className="ex-upcoming-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.2) }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="ex-upcoming-card-hit">
        <Link to={explorePath('upcoming')} className="ex-upcoming-card-tap">
          <div className="ex-upcoming-card-media">
            <img src={drop.image} alt="" loading="lazy" />
            <span className="ex-badge ex-badge--upcoming">{drop.badge || 'COMING SOON'}</span>
          </div>
          <div className="ex-upcoming-card-body">
            <h3 className="ex-card-title">{drop.title}</h3>
            <p className="ex-card-meta">{drop.description}</p>
            <span className="ex-upcoming-countdown" aria-live="polite">
              <Clock size={10} strokeWidth={2} aria-hidden />
              {formatCountdown(left)}
            </span>
          </div>
        </Link>
        <div className="ex-card-actions">
          <button
            type="button"
            className="ex-card-cta ex-card-cta--hot"
            onClick={(e) => {
              e.preventDefault();
              onNotify?.(drop);
            }}
          >
            <Bell size={12} strokeWidth={2} aria-hidden />
            Notify me
          </button>
        </div>
      </div>
    </motion.article>
  );
}
