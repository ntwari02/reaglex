import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  LayoutGrid,
  Sparkles,
  Package,
  Heart,
  MapPin,
  RotateCcw,
  Shield,
  HelpCircle,
  X,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { getRecentSearches } from '../../lib/recentSearches';

const QUICK_LINKS = [
  { icon: Home, labelKey: 'nav.home', to: '/' },
  { icon: LayoutGrid, labelKey: 'footer.links.shop.allProducts', to: '/products' },
  { icon: Sparkles, labelKey: 'nav.deals', to: '/search?sort=discount' },
];

const ACCOUNT_LINKS = [
  { icon: Package, labelKey: 'nav.orders', to: '/account?tab=orders' },
  { icon: Heart, labelKey: 'nav.wishlist', to: '/account?tab=wishlist' },
  { icon: MapPin, labelKey: 'account.addresses', to: '/account?tab=addresses' },
  { icon: RotateCcw, labelKey: 'header.returns', to: '/returns' },
  { icon: Shield, labelKey: 'header.buyerProtection', to: '/buyer-protection' },
  { icon: HelpCircle, label: 'Help & FAQ', to: '/faq' },
];

export default function MobileBuyerMenu({ open, onClose }) {
  const { t } = useTranslation();
  const recent = getRecentSearches().slice(0, 4);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            className="md:hidden fixed inset-0 z-[190] bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="md:hidden fixed left-0 top-0 bottom-0 z-[195] flex w-[min(300px,86vw)] flex-col"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            style={{
              paddingTop: 'max(12px, env(safe-area-inset-top))',
              background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRight: '1px solid color-mix(in srgb, var(--border-card) 55%, transparent)',
              boxShadow: '8px 0 32px rgba(15,23,42,0.12)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-card)]">
              <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                REAG<span style={{ color: 'var(--brand-primary)' }}>LEX</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'var(--bg-secondary)' }}
                aria-label="Close"
              >
                <X size={18} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
              <p className="mob-menu-label px-2">Shop</p>
              <ul className="mb-4 space-y-0.5">
                {QUICK_LINKS.map(({ icon: Icon, labelKey, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={onClose}
                      className="mob-menu-row flex items-center gap-3 rounded-xl px-3 py-2.5"
                    >
                      <Icon size={18} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
                      <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {t(labelKey)}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mob-menu-label px-2">Account</p>
              <ul className="mb-4 space-y-0.5">
                {ACCOUNT_LINKS.map(({ icon: Icon, labelKey, label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      onClick={onClose}
                      className="mob-menu-row flex items-center gap-3 rounded-xl px-3 py-2.5"
                    >
                      <Icon size={18} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
                      <span className="flex-1 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {label || t(labelKey)}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
                    </Link>
                  </li>
                ))}
              </ul>

              {recent.length > 0 && (
                <>
                  <p className="mob-menu-label px-2 flex items-center gap-1">
                    <Clock size={12} /> Recent
                  </p>
                  <ul className="space-y-0.5">
                    {recent.map((q) => (
                      <li key={q}>
                        <Link
                          to={`/search?q=${encodeURIComponent(q)}`}
                          onClick={onClose}
                          className="mob-menu-row block rounded-xl px-3 py-2 text-[12px] truncate"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {q}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <Link
                to="/search"
                onClick={onClose}
                className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{
                  background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--brand-primary) 22%, transparent)',
                }}
              >
                <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
                <span className="text-[12px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
                  AI-powered search
                </span>
              </Link>
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
