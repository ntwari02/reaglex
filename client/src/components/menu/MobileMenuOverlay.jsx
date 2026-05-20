import { memo, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Search,
  Settings,
  Sparkles,
  ChevronRight,
  Crown,
  Star,
  Camera,
  SlidersHorizontal,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useMobileMenuOverlay } from '../../stores/mobileMenuOverlayStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useRecentlyViewed } from '../../stores/recentlyViewedStore';
import { useImmersiveSearch } from '../../stores/immersiveSearchStore';
import { useMotionUi } from '../../stores/motionUiStore';
import { useTheme } from '../../contexts/ThemeContext';
import { openAccountExperience } from '../../lib/accountNavigation';
import { SERVER_URL } from '../../lib/config';
import {
  ACCOUNT_ITEMS,
  MENU_EASE,
  MENU_MS,
  QUICK_ACCESS,
  SETTINGS_ITEMS,
  SHOP_ITEMS,
  displayName,
  greetingPeriod,
} from './menuConfig';
import '../../styles/mobile-menu-overlay.css';

const panelMotion = {
  initial: { x: -28, opacity: 0, scale: 0.96 },
  animate: { x: 0, opacity: 1, scale: 1 },
  exit: { x: -32, opacity: 0, scale: 0.96 },
  transition: { duration: MENU_MS, ease: MENU_EASE },
};

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: MENU_MS, ease: MENU_EASE },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
};

const itemFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: MENU_EASE },
};

function resolveAvatar(src) {
  if (!src || typeof src !== 'string') return null;
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  return `${SERVER_URL}${src}`;
}

function isShopActive(item, pathname, search) {
  if (item.id === 'home') return pathname === '/';
  if (item.id === 'categories') {
    return pathname.startsWith('/products') || pathname.startsWith('/category');
  }
  if (item.id === 'deals') {
    return pathname.startsWith('/search') && search.includes('sort=discount');
  }
  if (item.id === 'new' || item.id === 'trending') {
    if (!pathname.startsWith('/explore')) return false;
    const tab = new URLSearchParams(search).get('tab');
    return tab === (item.id === 'new' ? 'new' : 'trending');
  }
  return false;
}

const QuickAccessCard = memo(function QuickAccessCard({ card, subtext, onPress }) {
  const Icon = card.icon;
  return (
    <motion.button
      type="button"
      className="mmo-quick-card"
      onClick={onPress}
      whileTap={{ scale: 0.97, y: -2 }}
    >
      <Icon className="mmo-quick-icon" size={22} strokeWidth={1.75} style={{ color: card.accent }} />
      <div>
        <div className="mmo-quick-title">{card.title}</div>
        <div className="mmo-quick-sub">{subtext}</div>
      </div>
    </motion.button>
  );
});

const NavRow = memo(function NavRow({ icon: Icon, label, active, onClick, trailing }) {
  return (
    <motion.li variants={itemFade}>
      <button
        type="button"
        className={`mmo-nav-item${active ? ' is-active' : ''}${trailing != null ? '' : ''}`}
        onClick={onClick}
      >
        <Icon className="mmo-nav-icon" size={22} strokeWidth={1.75} />
        <span className="mmo-nav-label">{label}</span>
        {trailing ?? <ChevronRight className="mmo-nav-chevron" size={18} strokeWidth={1.75} />}
      </button>
    </motion.li>
  );
});

function DarkModeSwitch({ on, onToggle }) {
  return (
    <button
      type="button"
      className={`mmo-ios-switch${on ? ' is-on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={onToggle}
    >
      <span className="mmo-ios-switch-thumb" />
    </button>
  );
}

export default function MobileMenuOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const isOpen = useMobileMenuOverlay((s) => s.isOpen);
  const close = useMobileMenuOverlay((s) => s.close);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const wishlistCount = useWishlistStore((s) => s.items?.length ?? 0);
  const viewedCount = useRecentlyViewed((s) => s.items?.length ?? 0);
  const { theme, toggleTheme } = useTheme();
  const openSearch = useImmersiveSearch((s) => s.openSearch);
  const openVisualSearch = useMotionUi((s) => s.openVisualSearch);

  const name = displayName(user);
  const avatarSrc = resolveAvatar(user?.avatar || user?.profileImage);
  const isDark = theme === 'dark';
  const isPremium = Boolean(user);

  const quickCards = useMemo(
    () =>
      QUICK_ACCESS.map((card) => {
        let sub = card.sub;
        if (card.countKey === 'wishlist') sub = `${wishlistCount} items`;
        if (card.countKey === 'viewed') sub = `${viewedCount} items`;
        return { card, sub };
      }),
    [wishlistCount, viewedCount],
  );

  useEffect(() => {
    if (!isOpen) return undefined;
    document.documentElement.classList.add('rx-menu-open');
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('rx-menu-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  const go = useCallback(
    (to) => {
      close();
      if (to) navigate(to);
    },
    [close, navigate],
  );

  const handleAccountOpen = useCallback(() => {
    close();
    openAccountExperience(navigate);
  }, [close, navigate]);

  const handleSettings = useCallback(() => {
    close();
    openAccountExperience(navigate, 'settings', 'profile');
  }, [close, navigate]);

  const handleAccountItem = useCallback(
    (item) => {
      close();
      if (item.tab) {
        openAccountExperience(navigate, item.tab);
        return;
      }
      navigate(item.to);
    },
    [close, navigate],
  );

  const handleLogout = useCallback(async () => {
    close();
    await signOut();
    navigate('/');
  }, [close, signOut, navigate]);

  const handleSearchOpen = useCallback(() => {
    close();
    openSearch('');
  }, [close, openSearch]);

  const handleVisualSearch = useCallback(() => {
    close();
    openVisualSearch();
  }, [close, openVisualSearch]);

  const panelVariants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : panelMotion;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="mmo-root md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <motion.button
            type="button"
            className="mmo-backdrop"
            aria-label="Close menu"
            {...backdropMotion}
            onClick={close}
          />

          <motion.aside
            className="mmo-panel"
            {...panelVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mmo-header">
              <div className="mmo-header-left">
                <div className="mmo-avatar-wrap">
                  <div className="mmo-avatar">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" />
                    ) : (
                      <span className="mmo-avatar-initial">{name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {isPremium && (
                    <span className="mmo-avatar-badge" aria-hidden>
                      <Star size={10} fill="currentColor" strokeWidth={0} />
                    </span>
                  )}
                </div>
                <div className="mmo-greeting-block">
                  <p className="mmo-greeting-top">{greetingPeriod()}</p>
                  <p className="mmo-greeting-name">{name} 👋</p>
                  {isPremium && (
                    <span className="mmo-greeting-member">
                      <Crown size={14} strokeWidth={1.75} />
                      Premium member
                    </span>
                  )}
                </div>
              </div>
              <div className="mmo-header-actions">
                <button type="button" className="mmo-icon-btn" aria-label="Settings" onClick={handleSettings}>
                  <Settings size={22} strokeWidth={1.65} />
                </button>
                <button
                  type="button"
                  className="mmo-icon-btn mmo-icon-btn--ai"
                  aria-label="AI search"
                  onClick={() => {
                    close();
                    openSearch('');
                  }}
                >
                  <Sparkles size={22} strokeWidth={1.65} />
                </button>
              </div>
            </div>

            <div className="mmo-scroll">
              <motion.div variants={stagger} initial="initial" animate="animate">
                <motion.div className="mmo-search" variants={itemFade}>
                  <button type="button" className="mmo-search-main" onClick={handleSearchOpen}>
                    <Search size={22} strokeWidth={1.75} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
                    <span>Search products, brands, stores...</span>
                  </button>
                  <div className="mmo-search-actions">
                    <button type="button" className="mmo-search-tool" aria-label="Visual search" onClick={handleVisualSearch}>
                      <Camera size={20} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="mmo-search-tool"
                      aria-label="Filters"
                      onClick={() => go('/products')}
                    >
                      <SlidersHorizontal size={20} strokeWidth={1.75} />
                    </button>
                  </div>
                </motion.div>

                <motion.p className="mmo-section-label" variants={itemFade}>
                  Quick access
                </motion.p>
                <motion.div className="mmo-quick-row" variants={itemFade}>
                  {quickCards.map(({ card, sub }) => (
                    <QuickAccessCard
                      key={card.id}
                      card={card}
                      subtext={sub}
                      onPress={() => {
                        if (card.id === 'orders' || card.id === 'saved') {
                          handleAccountItem({ tab: card.id === 'saved' ? 'wishlist' : 'orders', to: card.to });
                          return;
                        }
                        go(card.to);
                      }}
                    />
                  ))}
                </motion.div>

                <motion.p className="mmo-group-title" variants={itemFade}>
                  Shop
                </motion.p>
                <motion.ul className="mmo-nav-list" variants={stagger}>
                  {SHOP_ITEMS.map((item) => (
                    <NavRow
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={isShopActive(item, location.pathname, location.search)}
                      onClick={() => go(item.to)}
                    />
                  ))}
                </motion.ul>

                <motion.p className="mmo-group-title" variants={itemFade}>
                  Account
                </motion.p>
                <motion.ul className="mmo-nav-list" variants={stagger}>
                  {ACCOUNT_ITEMS.map((item) => (
                    <NavRow
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      active={
                        location.pathname.startsWith('/account')
                        && (item.tab ? new URLSearchParams(location.search).get('tab') === item.tab : false)
                      }
                      onClick={() => handleAccountItem(item)}
                    />
                  ))}
                </motion.ul>

                <motion.p className="mmo-group-title" variants={itemFade}>
                  Settings
                </motion.p>
                <motion.ul className="mmo-nav-list" variants={stagger}>
                  {SETTINGS_ITEMS.map((item) => {
                    if (item.action === 'dark') {
                      return (
                        <motion.li key={item.id} variants={itemFade}>
                          <div className="mmo-nav-item mmo-dark-row">
                            <item.icon className="mmo-nav-icon" size={22} strokeWidth={1.75} />
                            <span className="mmo-nav-label">{item.label}</span>
                            <DarkModeSwitch on={isDark} onToggle={toggleTheme} />
                          </div>
                        </motion.li>
                      );
                    }
                    if (item.action === 'settings') {
                      return (
                        <NavRow
                          key={item.id}
                          icon={item.icon}
                          label={item.label}
                          active={false}
                          onClick={handleSettings}
                        />
                      );
                    }
                    return (
                      <NavRow
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        active={location.pathname === item.to}
                        onClick={() => go(item.to)}
                      />
                    );
                  })}
                </motion.ul>
              </motion.div>
            </div>

            <div className="mmo-footer">
              <button type="button" className="mmo-account-card" onClick={handleAccountOpen}>
                <div className="mmo-avatar">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="" />
                  ) : (
                    <span className="mmo-avatar-initial">{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="mmo-account-meta">
                  <p className="mmo-account-name">{name}</p>
                  <p className="mmo-account-tier">{isPremium ? 'Premium member' : 'Guest shopper'}</p>
                </div>
                <div className="mmo-points">
                  <p className="mmo-points-main">2,450 pts</p>
                  <p className="mmo-points-sub">Rewards balance</p>
                </div>
              </button>
              <button type="button" className="mmo-logout" onClick={handleLogout}>
                <LogOut size={18} strokeWidth={1.75} />
                Log out
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
