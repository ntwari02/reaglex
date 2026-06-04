import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Zap } from 'lucide-react';
import { explorePath } from '../../explore/exploreConfig';
import { formatCountdownHMS } from './upcomingProductsData';

export default function UpcomingFeaturedDrop({ drop, onNotify }) {
  const [left, setLeft] = useState(() => Math.max(0, (drop.launchAt || 0) - Date.now()));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, (drop.launchAt || 0) - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [drop.launchAt]);

  const stockPct = Math.round((drop.unitsLeft / drop.unitsTotal) * 100);

  return (
    <motion.article
      className="ud-featured"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="ud-featured-glow ud-featured-glow--purple" aria-hidden />
      <div className="ud-featured-glow ud-featured-glow--orange" aria-hidden />

      <div className="ud-featured-badges">
        <span className="ud-pill ud-pill--purple">LIMITED DROP</span>
        <span className="ud-pill ud-pill--hype">
          <Zap size={11} fill="currentColor" />
          HYPE SCORE {drop.hypeScore}%
        </span>
      </div>

      <div className="ud-featured-visual">
        <img src={drop.image} alt="" className="ud-featured-img" loading="eager" />
      </div>

      <div className="ud-featured-body">
        <h3 className="ud-featured-title">{drop.title}</h3>
        <p className="ud-featured-desc">{drop.description}</p>

        <div className="ud-featured-countdown" aria-live="polite">
          {formatCountdownHMS(left).split(' : ').map((part, i) => (
            <span key={i} className="ud-countdown-seg">
              <span className="ud-countdown-num">{part}</span>
              <span className="ud-countdown-unit">{['HRS', 'MINS', 'SECS'][i]}</span>
            </span>
          ))}
        </div>

        <div className="ud-featured-stock">
          <div className="ud-featured-stock-top">
            <span>Only {drop.unitsLeft} units</span>
          </div>
          <div className="ud-featured-stock-bar">
            <span style={{ width: `${stockPct}%` }} />
          </div>
        </div>

        <div className="ud-featured-social">
          <span className="ud-avatars" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <span className="ud-interested">
            {(drop.interestedCount / 1000).toFixed(1)}K users interested
          </span>
        </div>

        <div className="ud-featured-actions">
          <Link to={explorePath('upcoming')} className="ud-btn ud-btn--ghost">
            View Details
          </Link>
          <button
            type="button"
            className="ud-btn ud-btn--primary"
            onClick={() => onNotify?.(drop)}
          >
            <Bell size={14} />
            Notify Me
          </button>
        </div>
      </div>
    </motion.article>
  );
}
