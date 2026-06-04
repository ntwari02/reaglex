import { ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export default function OsNotificationCard({
  variant = 'stack',
  unread = false,
  accent = 'var(--brand-primary)',
  surface = 'var(--brand-tint)',
  glow,
  Icon,
  kicker,
  title,
  message,
  time,
  actionLabel,
  thumbnails = [],
  showThumbs = false,
  compact = false,
  onClick,
  footer = null,
  index = 0,
}) {
  const reduceMotion = useReducedMotion();
  const thumbList = showThumbs && thumbnails.length ? thumbnails : [];

  const interactive = typeof onClick === 'function';

  return (
    <motion.article
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      role={interactive ? 'button' : 'article'}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`rxn-os rxn-os--${variant}${unread ? ' rxn-os--unread' : ''}${compact ? ' rxn-os--compact' : ''}${interactive ? '' : ' rxn-os--static'}`}
      style={{
        '--rxn-os-accent': accent,
        '--rxn-os-surface': surface,
        '--rxn-os-glow': glow || 'var(--rxn-glow-orange)',
      }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
    >
      {unread ? <span className="rxn-os__unread-ring" aria-hidden /> : null}

      {variant === 'hero' && thumbList[0] ? (
        <div className="rxn-os__hero-thumb">
          <img src={thumbList[0]} alt="" loading="lazy" />
        </div>
      ) : null}

      <div className="rxn-os__inner">
        {Icon ? (
          <span className="rxn-os__icon" aria-hidden>
            <Icon size={variant === 'pill' ? 16 : 20} strokeWidth={1.75} />
          </span>
        ) : null}

        <div className="rxn-os__body">
          {kicker || time ? (
            <div className="rxn-os__meta">
              {kicker ? <span className="rxn-os__kicker">{kicker}</span> : null}
              {time ? <time className="rxn-os__time">{time}</time> : null}
            </div>
          ) : null}

          <h4 className={`rxn-os__title${unread ? ' rxn-os__title--bold' : ''}`}>{title}</h4>
          {message ? <p className="rxn-os__message">{message}</p> : null}

          {variant !== 'hero' && thumbList.length > 0 ? (
            <div className="rxn-os__thumbs">
              {thumbList.map((src, i) => (
                <img key={i} src={src} alt="" loading="lazy" />
              ))}
            </div>
          ) : null}

          {footer}

          {actionLabel ? (
            <span className="rxn-os__cta">
              {actionLabel}
              <ChevronRight size={14} strokeWidth={2} />
            </span>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
