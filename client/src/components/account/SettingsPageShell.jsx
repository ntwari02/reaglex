import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

/**
 * Sticky settings chrome: fixed-style back control (top-left) + title.
 */
export function SettingsTopBar({ title, subtitle, onBack, backLabel = 'Back' }) {
  return (
    <header className="rx-settings-topbar">
      <motion.button
        type="button"
        className="rx-settings-back-btn"
        onClick={onBack}
        aria-label={backLabel}
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      >
        <motion.span
          className="rx-settings-back-icon"
          aria-hidden
          animate={{ x: [0, -3, 0] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            repeatDelay: 2.8,
            ease: [0.45, 0, 0.55, 1],
          }}
        >
          <ArrowLeft size={20} strokeWidth={2.25} />
        </motion.span>
      </motion.button>
      <div className="rx-settings-topbar-text">
        <h1 className="rx-settings-topbar-title">{title}</h1>
        {subtitle ? <p className="rx-settings-topbar-sub">{subtitle}</p> : null}
      </div>
    </header>
  );
}

export function SettingsNavCard({ icon: Icon, label, description, onClick, danger }) {
  return (
    <motion.button
      type="button"
      className={`rx-settings-nav-card${danger ? ' rx-settings-nav-card--danger' : ''}`}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <span className="rx-settings-nav-card__icon">
        <Icon size={18} strokeWidth={1.85} />
      </span>
      <span className="rx-settings-nav-card__body">
        <span className="rx-settings-nav-card__label">{label}</span>
        {description ? (
          <span className="rx-settings-nav-card__desc">{description}</span>
        ) : null}
      </span>
      <span className="rx-settings-nav-card__chev" aria-hidden>
        ›
      </span>
    </motion.button>
  );
}
