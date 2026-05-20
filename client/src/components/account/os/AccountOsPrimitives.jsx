import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1];

export function OsSectionTitle({ children, className = '' }) {
  return <p className={`aos-section-title ${className}`.trim()}>{children}</p>;
}

export function OsCard({ children, className = '', onClick, as: Tag = 'div' }) {
  const Comp = onClick ? motion.button : Tag;
  const props = onClick
    ? { type: 'button', onClick, whileTap: { scale: 0.98 }, className: `aos-card aos-card--btn ${className}`.trim() }
    : { className: `aos-card ${className}`.trim() };
  return <Comp {...props}>{children}</Comp>;
}

export function OsMenuRow({ icon: Icon, title, subtitle, onClick, danger }) {
  return (
    <motion.button
      type="button"
      className={`aos-menu-row${danger ? ' aos-menu-row--danger' : ''}`}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
    >
      <span className="aos-menu-icon">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="aos-menu-text">
        <span className="aos-menu-title">{title}</span>
        {subtitle && <span className="aos-menu-sub">{subtitle}</span>}
      </span>
      <ChevronRight size={18} className="aos-menu-chevron" />
    </motion.button>
  );
}

export function OsTabBar({ tabs, active, onChange }) {
  return (
    <div className="aos-tabbar-wrap">
      <div className="aos-tabbar">
        {tabs.map((t) => {
          const isActive = active === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              data-aos-tab-active={isActive ? 'true' : 'false'}
              className={`aos-tab${isActive ? ' aos-tab--active' : ''}`}
              onClick={() => onChange(t.id)}
            >
              {Icon && <Icon size={14} />}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OsEmpty({ title, desc, action }) {
  return (
    <div className="aos-empty">
      <p className="aos-empty-title">{title}</p>
      {desc && <p className="aos-empty-desc">{desc}</p>}
      {action}
    </div>
  );
}

export function OsShimmer({ height = 80 }) {
  return <div className="aos-shimmer" style={{ minHeight: height }} aria-hidden />;
}

export function OsInput({ label, ...props }) {
  return (
    <label className="aos-field">
      {label && <span className="aos-field-label">{label}</span>}
      <input className="aos-input" {...props} />
    </label>
  );
}

export function OsBtn({ children, variant = 'primary', ...props }) {
  return (
    <motion.button
      type="button"
      className={`aos-btn aos-btn--${variant}`}
      whileTap={{ scale: 0.97 }}
      transition={{ ease: EASE }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function OsPageHero({ eyebrow, title, subtitle, children }) {
  return (
    <div className="aos-page-hero">
      {eyebrow && <span className="aos-eyebrow">{eyebrow}</span>}
      <h1 className="aos-page-title">{title}</h1>
      {subtitle && <p className="aos-page-sub">{subtitle}</p>}
      {children}
    </div>
  );
}
