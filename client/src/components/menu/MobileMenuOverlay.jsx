import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import OverlayPortal from '../OverlayPortal';
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
import { useMobileMenuOverlay } from '../../stores/mobileMenuOverlayStore';
import { getRecentSearches } from '../../lib/recentSearches';
import '../../styles/mobile-menu-overlay.css';

const EASE = [0.22, 1, 0.36, 1];

const SHOP_LINKS = [
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

export default function MobileMenuOverlay() {
  const isOpen = useMobileMenuOverlay((s) => s.isOpen);
  const close = useMobileMenuOverlay((s) => s.close);
  const { t } = useTranslation();
  const recent = getRecentSearches().slice(0, 4);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!isOpen) return undefined;
    document.documentElement.classList.add('rx-menu-open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('rx-menu-open');
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  return (
    <OverlayPortal active={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <div className="mmo-root md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <motion.button
            type="button"
            className="mmo-backdrop"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            onClick={close}
          />

          <motion.aside
            className="mmo-panel"
            initial={{ x: '-105%', opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-108%', opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            drag="x"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ left: -120, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -72 || info.velocity.x < -400) close();
            }}
          >
            <div
              className="mmo-grabber"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <span className="mmo-grabber-bar" />
            </div>

            <header className="mmo-header">
              <span className="mmo-brand" style={{ color: 'var(--text-primary)' }}>
                REAG<span style={{ color: 'var(--brand-primary)' }}>LEX</span>
              </span>
              <button type="button" className="mmo-close" onClick={close} aria-label="Close">
                <X size={20} strokeWidth={1.85} />
              </button>
            </header>

            <nav className="mmo-scroll">
              <p className="mmo-section-label">Shop</p>
              <ul className="mmo-nav-list">
                {SHOP_LINKS.map(({ icon: Icon, labelKey, to }) => (
                  <li key={to}>
                    <Link to={to} onClick={close} className="mmo-nav-link">
                      <Icon size={20} strokeWidth={1.75} />
                      <span>{t(labelKey)}</span>
                      <ChevronRight className="mmo-nav-chevron" size={16} strokeWidth={2} />
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mmo-section-label">Account</p>
              <ul className="mmo-nav-list">
                {ACCOUNT_LINKS.map(({ icon: Icon, labelKey, label, to }) => (
                  <li key={to}>
                    <Link to={to} onClick={close} className="mmo-nav-link">
                      <Icon size={20} strokeWidth={1.75} />
                      <span>{label || t(labelKey)}</span>
                      <ChevronRight className="mmo-nav-chevron" size={16} strokeWidth={2} />
                    </Link>
                  </li>
                ))}
              </ul>

              {recent.length > 0 && (
                <>
                  <p className="mmo-section-label">
                    <Clock size={12} style={{ display: 'inline', marginRight: 6 }} />
                    Recent searches
                  </p>
                  <div className="mmo-recent-list">
                    {recent.map((q) => (
                      <Link
                        key={q}
                        to={`/search?q=${encodeURIComponent(q)}`}
                        onClick={close}
                        className="mmo-recent-item"
                      >
                        {q}
                      </Link>
                    ))}
                  </div>
                </>
              )}

              <Link to="/search" onClick={close} className="mmo-ai-banner">
                <Sparkles size={18} strokeWidth={1.75} />
                AI-powered search
              </Link>
            </nav>
          </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </OverlayPortal>
  );
}
