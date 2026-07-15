import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import OverlayPortal from '../OverlayPortal';
import {
  Home,
  LayoutGrid,
  Package,
  Heart,
  ShoppingBag,
  Ticket,
  User,
  MapPin,
  CreditCard,
  Clock,
  Star,
  Bell,
  MessageSquare,
  Settings,
  HelpCircle,
  Info,
  Store,
  Radio,
  LogOut,
  ChevronRight,
  Crown,
  X,
} from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { useMobileMenuOverlay } from '../../stores/mobileMenuOverlayStore';
import { useAuthStore } from '../../stores/authStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useNotificationStore } from '../../stores/notificationStore';
import '../../styles/mobile-menu-overlay.css';

const EASE = [0.22, 1, 0.36, 1];

function NavItem({ icon: Icon, label, to, badge, active, onNavigate }) {
  return (
    <li>
      <Link to={to} onClick={onNavigate} className={`mmo-nav-link${active ? ' mmo-nav-link--active' : ''}`}>
        <span className="mmo-nav-icon">
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span className="mmo-nav-label">{label}</span>
        {badge > 0 && <span className="mmo-nav-badge">{badge > 99 ? '99+' : badge}</span>}
        <ChevronRight className="mmo-nav-chevron" size={16} strokeWidth={2} />
      </Link>
    </li>
  );
}

export default function MobileMenuOverlay() {
  const isOpen = useMobileMenuOverlay((s) => s.isOpen);
  const close = useMobileMenuOverlay((s) => s.close);
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const cartCount = useBuyerCart((s) => s.items.reduce((n, i) => n + (i.quantity || 1), 0));
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const messageCount = useNotificationStore((s) => s.unreadMessageCount);
  const dragControls = useDragControls();

  const onNavigate = () => close();

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Guest';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const navSections = useMemo(
    () => [
      {
        label: 'Shop',
        items: [
          { icon: Home, label: t('nav.home'), to: '/', match: (p) => p === '/' },
          { icon: LayoutGrid, label: t('nav.categories'), to: '/category/all' },
          { icon: Store, label: t('footer.links.shop.allProducts'), to: '/category/all' },
          { icon: Radio, label: 'Live shopping', to: '/live' },
        ],
      },
      {
        label: 'Account',
        items: [
          { icon: Package, label: t('nav.orders'), to: '/account?tab=orders', badge: 0 },
          { icon: Heart, label: t('nav.wishlist'), to: '/account?tab=wishlist', badge: wishlistCount },
          { icon: ShoppingBag, label: t('nav.cart'), to: '/cart', badge: cartCount },
          { icon: Ticket, label: 'Coupons', to: '/search?q=coupon' },
          { icon: User, label: t('nav.account'), to: '/account' },
          { icon: MapPin, label: t('account.addresses'), to: '/account?tab=addresses' },
          { icon: CreditCard, label: t('account.paymentMethods'), to: '/account?tab=payment' },
          { icon: Clock, label: 'Recently Viewed', to: '/account' },
          { icon: Star, label: t('footer.links.account.myReviews'), to: '/account?tab=reviews' },
        ],
      },
      {
        label: 'Support',
        items: [
          { icon: Bell, label: t('nav.notifications'), to: '/notifications' },
          { icon: MessageSquare, label: t('nav.messages'), to: '/account?tab=messages', badge: messageCount },
          { icon: Settings, label: t('nav.settings'), to: '/account?tab=settings' },
          { icon: HelpCircle, label: `${t('nav.help')} & Support`, to: '/help' },
          { icon: Info, label: t('footer.links.shop.aboutSpacilly'), to: '/about' },
          { icon: Store, label: t('header.becomeSeller'), to: '/become-seller' },
        ],
      },
    ],
    [t, wishlistCount, cartCount, messageCount]
  );

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
              <header className="mmo-header">
                <div className="mmo-brand-row">
                  <span className="mmo-logo-mark">S</span>
                  <span className="mmo-brand-text">
                    SPAC<span className="mmo-brand-accent">ILLY</span>
                  </span>
                </div>
                <button type="button" className="mmo-close" onClick={close} aria-label="Close">
                  <X size={20} strokeWidth={1.85} />
                </button>
              </header>

              <Link to="/account" onClick={onNavigate} className="mmo-profile-card">
                <span className="mmo-avatar">{initials}</span>
                <span className="mmo-profile-copy">
                  <span className="mmo-profile-name">{displayName}</span>
                  <span className="mmo-profile-email">{user?.email || 'Sign in for full access'}</span>
                  <span className="mmo-member">
                    <Crown size={11} />
                    Gold Member
                  </span>
                </span>
                <ChevronRight size={18} className="mmo-profile-chevron" />
              </Link>

              <div className="mmo-premium-banner">
                <div>
                  <p className="mmo-premium-title">Upgrade to Premium</p>
                  <p className="mmo-premium-sub">Free shipping, exclusive deals & more</p>
                </div>
                <button type="button" className="mmo-premium-cta">
                  Upgrade
                </button>
              </div>

              <nav className="mmo-scroll">
                {navSections.map((section) => (
                  <div key={section.label}>
                    <p className="mmo-section-label">{section.label}</p>
                    <ul className="mmo-nav-list">
                      {section.items.map((item) => (
                        <NavItem
                          key={item.to + item.label}
                          icon={item.icon}
                          label={item.label}
                          to={item.to}
                          badge={item.badge}
                          active={
                            item.match
                              ? item.match(location.pathname)
                              : location.pathname + location.search === item.to ||
                                (item.to !== '/' && location.pathname.startsWith(item.to.split('?')[0]))
                          }
                          onNavigate={onNavigate}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>

              <footer className="mmo-footer">
                <button
                  type="button"
                  className="mmo-logout"
                  onClick={async () => {
                    onNavigate();
                    await signOut();
                  }}
                >
                  <LogOut size={18} strokeWidth={1.75} />
                  Logout
                </button>
              </footer>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </OverlayPortal>
  );
}
