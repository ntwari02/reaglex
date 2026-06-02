import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Clock } from 'lucide-react';
import { navigateToProduct } from '../../../lib/productNavigation';
import { formatCountdownCompact } from './upcomingProductsData';
import { productDisplayName } from './productUtils';

/**
 * Upcoming drop — same shell as ExploreTrendingRailCard (rail + body + footer CTA).
 * Notify replaces Quick view; compact countdown in body; no add (+) button.
 */
export default function UpcomingRailCard({ drop, index = 0, onNotify }) {
  const navigate = useNavigate();
  const [left, setLeft] = useState(() => Math.max(0, (drop.launchAt || 0) - Date.now()));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, (drop.launchAt || 0) - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [drop.launchAt]);

  const title = drop.title || productDisplayName(drop.product) || 'Upcoming drop';
  const img = drop.image;

  return (
    <motion.article
      className="ex-rail-card"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, delay: index * 0.03 }}
    >
      <div className="ex-rail-card-hit">
        <button
          type="button"
          className="ex-rail-card-tap"
          onClick={() => {
            if (drop.product) navigateToProduct(navigate, drop.product);
          }}
        >
          <div className="ex-rail-card-media">
            <img src={img} alt="" loading="lazy" />
            <span className="ex-badge ex-badge--upcoming">{drop.badge || 'SOON'}</span>
          </div>
          <div className="ex-rail-card-body">
            <h3 className="ex-card-title">{title}</h3>
            <p className="ex-card-meta ex-card-meta--clamp">{drop.description}</p>
            <span className="ex-countdown-inline" aria-live="polite">
              <Clock size={10} strokeWidth={2} aria-hidden />
              {formatCountdownCompact(left)}
            </span>
          </div>
        </button>
        <div className="ex-card-actions">
          <button
            type="button"
            className="ex-card-cta ex-card-cta--upcoming"
            onClick={(e) => {
              e.stopPropagation();
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
