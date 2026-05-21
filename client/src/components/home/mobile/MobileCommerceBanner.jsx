import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles, Zap, Truck, Tag } from 'lucide-react';

const ICONS = { sparkles: Sparkles, zap: Zap, truck: Truck, tag: Tag };

const PRESETS = {
  flash: {
    gradient: 'linear-gradient(115deg, #ff7a1a 0%, #ff9f4a 42%, #1a1a2e 100%)',
    icon: 'zap',
  },
  ai: {
    gradient: 'linear-gradient(115deg, #6366f1 0%, #8b5cf6 48%, #ff7a1a 100%)',
    icon: 'sparkles',
  },
  shipping: {
    gradient: 'linear-gradient(115deg, #0ea5e9 0%, #22c55e 55%, #0f172a 100%)',
    icon: 'truck',
  },
  deals: {
    gradient: 'linear-gradient(115deg, #ef4444 0%, #f97316 50%, #1e293b 100%)',
    icon: 'tag',
  },
  fashion: {
    gradient: 'linear-gradient(115deg, #ec4899 0%, #f43f5e 40%, #18181b 100%)',
    icon: 'tag',
  },
};

export default function MobileCommerceBanner({
  variant = 'flash',
  title,
  subtitle,
  cta = 'Shop',
  href = '/search',
}) {
  const preset = PRESETS[variant] || PRESETS.flash;
  const Icon = ICONS[preset.icon] || Zap;

  return (
    <motion.div
      className="mob-section"
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={href}
        className="relative flex min-h-[96px] max-h-[120px] items-center overflow-hidden rounded-[14px] px-4 py-3 active:scale-[0.99] transition-transform"
        style={{
          background: preset.gradient,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        }}
      >
        <motion.div
          className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20"
          style={{ background: '#fff' }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative z-[1] flex min-w-0 flex-1 flex-col justify-center pr-2">
          <div className="mb-1 flex items-center gap-1.5">
            <Icon size={14} strokeWidth={2.2} className="text-white/90" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
              Limited
            </span>
          </div>
          <p className="text-[15px] font-bold leading-tight tracking-tight text-white">{title}</p>
          {subtitle && (
            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-white/80">{subtitle}</p>
          )}
        </div>
        <span
          className="relative z-[1] flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
          style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
        >
          {cta}
          <ChevronRight size={14} />
        </span>
      </Link>
    </motion.div>
  );
}
