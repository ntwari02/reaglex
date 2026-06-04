import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { formatCountdown } from './upcomingProductsData';

export default function UpcomingDropMiniCard({ drop, index = 0, onNotify }) {
  const [left, setLeft] = useState(() => Math.max(0, (drop.launchAt || 0) - Date.now()));

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, (drop.launchAt || 0) - Date.now()));
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [drop.launchAt]);

  return (
    <motion.article
      className="ud-mini"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, delay: index * 0.04 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="ud-mini-glow" aria-hidden />
      <span className="ud-mini-badge">{drop.badge || 'NEW'}</span>
      <div className="ud-mini-media">
        <img src={drop.image} alt="" loading="lazy" />
      </div>
      <h4 className="ud-mini-title">{drop.title}</h4>
      <span className="ud-mini-timer">{formatCountdown(left)}</span>
      <button
        type="button"
        className="ud-mini-notify"
        onClick={() => onNotify?.(drop)}
      >
        <Bell size={12} />
        Notify Me
      </button>
    </motion.article>
  );
}
