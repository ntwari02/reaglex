import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { explorePath } from '../../explore/exploreConfig';
import { motion } from 'framer-motion';
import { formatCountdown } from './upcomingProductsData';

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
      className="up-card"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      whileTap={{ scale: 0.98, y: -2 }}
    >
      <Link to={explorePath('upcoming')} className="up-card-inner">
        <div className="up-card-content">
          <span className="up-badge">{drop.badge || 'COMING SOON'}</span>
          <h3 className="up-card-title">{drop.title}</h3>
          <p className="up-card-desc">{drop.description}</p>
          <span className="up-countdown" aria-live="polite">
            {formatCountdown(left)}
          </span>
          <button
            type="button"
            className="up-notify-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onNotify?.(drop);
            }}
          >
            Notify Me
          </button>
        </div>
        <div className="up-card-visual">
          <span className="up-glow" aria-hidden />
          <img src={drop.image} alt="" className="up-product-img" loading="lazy" />
        </div>
      </Link>
    </motion.article>
  );
}
