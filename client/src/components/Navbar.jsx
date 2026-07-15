import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingBag, Heart, Bell, X, ChevronDown, ChevronRight,
  Clock, Flame,
  Globe, DollarSign, HelpCircle, SlidersHorizontal, Camera,
} from 'lucide-react';
import { useSellerAccess, useHandleSellerLink } from '../hooks/useSellerAccess';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useAuthStore } from '../stores/authStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { productAPI } from '../services/api';
import NotificationsDropdown from './NotificationsDropdown';
import { buyerNotificationsApi } from '../services/buyerNotificationsApi';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { buyerProductPath } from '../lib/productUrl';
import { useImmersiveSearch } from '../stores/immersiveSearchStore';
import { useScrollChrome } from '../stores/scrollChromeStore';
import { useMotionUi } from '../stores/motionUiStore';
import MobileBuyerTopBar from './buyer/MobileBuyerTopBar';
import AccountMenuButton from './header/AccountMenuButton';
import DeliveryLocationBar from './delivery/DeliveryLocationBar';
import '../styles/delivery-location.css';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../lib/recentSearches';

const PRIMARY = 'var(--brand-primary)';
const PRIMARY_HOVER = 'var(--brand-primary-hover)';
const DROPDOWN_SHADOW = '0 8px 24px rgba(0,0,0,0.12)';
const ALL_CATEGORIES = 'All Categories';

function highlightMatch(text, query) {
  if (!query?.trim() || !text) return text;
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${q})`, 'gi');
  return text.replace(re, (m) => `\u0000${m}\u0000`);
}

// ── Trending (static) ──────────────────────────────────────────────────────────
const TRENDING = ['Wireless earbuds', 'Running shoes', 'Laptop stand', 'Phone case', 'Smart watch'];

// ── Categories for search dropdown & mega menu ───────────────────────────────
const SEARCH_CATEGORIES = [
  'All Categories', 'Electronics', 'Clothing', 'Accessories', 'Home & Garden',
  'Sports', 'Beauty', 'Books', 'Toys', 'Automotive', 'Food & Grocery',
];

const MEGA_CATEGORIES = [
  { icon: '📱', name: 'Electronics', slug: 'electronics' },
  { icon: '👗', name: 'Clothing', slug: 'clothing' },
  { icon: '👜', name: 'Accessories', slug: 'accessories' },
  { icon: '🏠', name: 'Home & Garden', slug: 'home-garden' },
  { icon: '⚽', name: 'Sports', slug: 'sports' },
  { icon: '💄', name: 'Beauty', slug: 'beauty' },
  { icon: '📚', name: 'Books', slug: 'books' },
  { icon: '🧸', name: 'Toys', slug: 'toys' },
  { icon: '🚗', name: 'Automotive', slug: 'automotive' },
  { icon: '🍔', name: 'Food & Grocery', slug: 'food-grocery' },
];

const ANNOUNCEMENT_KEYS = ['topbar.announcement1', 'topbar.announcement2', 'topbar.announcement3'];
const LANG_OPTIONS = [
  { code: 'en', labelKey: 'languages.en' },
  { code: 'fr', labelKey: 'languages.fr' },
  { code: 'rw', labelKey: 'languages.rw' },
];

const NAV_LINKS = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/category/all', labelKey: 'footer.links.shop.allProducts' },
  { to: '/search?sort=newest', labelKey: 'nav.newArrivals' },
  { to: '/search?sort=discount', labelKey: 'nav.deals', badge: 'HOT' },
  { to: '/search?sort=rating', labelKey: 'nav.topSellers' },
  { to: '/search', labelKey: 'nav.stores' },
  { to: '/track', labelKey: 'nav.trackOrder' },
  { to: '#', labelKey: 'nav.blog' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'RWF', symbol: 'FRw', label: 'RWF' },
  { code: 'KES', symbol: 'KSh', label: 'KES' },
  { code: 'UGX', symbol: 'USh', label: 'UGX' },
  { code: 'TZS', symbol: 'TSh', label: 'TZS' },
  { code: 'NGN', symbol: '₦', label: 'NGN' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
];

// ── Tier 1: Utility bar ───────────────────────────────────────────────────────
function UtilityBar({ language, setLanguage, currencyDisplay, setCurrency, t }) {
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);
  const langRef = useRef(null);
  const currRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIndex((i) => (i + 1) % ANNOUNCEMENT_KEYS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useClickOutside(langRef, () => setLangOpen(false));
  useClickOutside(currRef, () => setCurrOpen(false));

  return (
    <div
      className="hidden md:flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12 h-9"
      style={{
        background: 'var(--topbar-bg)',
        color: 'var(--topbar-text)',
        borderBottom: '1px solid var(--divider)',
        height: 36,
        position: 'relative',
        zIndex: 103,
      }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0 max-w-[28%]">
        <p className="text-xs truncate topbar-text hidden lg:block" style={{ maxWidth: 160 }}>
          {t('header.freeShipping')} 🚚
        </p>
      </div>

      <div className="flex-1 flex justify-center min-w-0 px-2">
        <DeliveryLocationBar headerCenter />
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 justify-end max-w-[44%]">
        <div className="overflow-hidden text-center hidden xl:block max-w-[200px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={announcementIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-xs topbar-text truncate"
            >
              {t(ANNOUNCEMENT_KEYS[announcementIndex])}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => { setLangOpen(!langOpen); setCurrOpen(false); }}
            className="flex items-center gap-1 text-xs hover:opacity-90 transition"
            style={{ color: 'var(--topbar-text)' }}
          >
            <Globe className="w-3.5 h-3.5" /> {String(language).toUpperCase()}
          </button>
          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 py-1 rounded-xl min-w-[140px] z-[200]"
                style={{
                  background: 'var(--dropdown-bg)',
                  border: '1px solid var(--dropdown-border)',
                  boxShadow: 'var(--dropdown-shadow)',
                  color: 'var(--dropdown-text)',
                }}
              >
                {LANG_OPTIONS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-[var(--brand-tint)] transition"
                    style={{ color: l.code === language ? PRIMARY : 'var(--dropdown-text)' }}
                  >
                    {t(l.labelKey)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={currRef}>
          <button
            type="button"
            onClick={() => { setCurrOpen(!currOpen); setLangOpen(false); }}
            className="flex items-center gap-1 text-xs hover:opacity-90 transition"
            style={{ color: 'var(--topbar-text)' }}
          >
            <DollarSign className="w-3.5 h-3.5" /> {currencyDisplay}
          </button>
          <AnimatePresence>
            {currOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 py-1 rounded-xl min-w-[120px] z-[200]"
                style={{
                  background: 'var(--dropdown-bg)',
                  border: '1px solid var(--dropdown-border)',
                  boxShadow: 'var(--dropdown-shadow)',
                  color: 'var(--dropdown-text)',
                }}
              >
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { setCurrency(c); setCurrOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-[var(--brand-tint)] transition flex items-center gap-2"
                    style={{ color: currencyDisplay === `${c.symbol} ${c.code}` ? PRIMARY : 'var(--dropdown-text)' }}
                  >
                    {c.symbol} {c.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link
          to="/seller"
          className="text-xs font-medium hover:opacity-90 transition"
          style={{ color: PRIMARY }}
        >
          {t('header.sellOnSpacilly')}
        </Link>
        <Link
          to="/help"
          className="text-xs hover:opacity-90 transition flex items-center gap-1"
          style={{ color: 'var(--topbar-text)' }}
        >
          <HelpCircle className="w-3.5 h-3.5" /> {t('header.helpCenter')}
        </Link>
      </div>
    </div>
  );
}

// ── Click outside hook ───────────────────────────────────────────────────────
function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

import { SERVER_URL } from '../lib/config';
function resolveImg(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
}

// ── Tier 2: Main header ───────────────────────────────────────────────────────
function MainHeader({
  searchQuery, setSearchQuery, searchFocus, setSearchFocus, category, setCategory,
  language, currency, openAuth, user, signOut, onLogoutClick, cartCount, openCart, cartItems, wishlistCount,
  t,
}) {
  const openVisualSearch = useMotionUi((s) => s.openVisualSearch);
  const navigate = useNavigate();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({ recent: [], trending: TRENDING, products: [] });
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const suggestionListRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [bellRing, setBellRing] = useState(false);
  const prevNotifUnreadRef = useRef(0);
  const [cartHoverOpen, setCartHoverOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const suggestRef = useRef(null);
  const notifRef = useRef(null);
  const cartRef = useRef(null);
  const categoryRef = useRef(null);
  const { isSeller, isLoggedIn, isSellerPending } = useSellerAccess();
  const handleSellerLink = useHandleSellerLink();

  const recentSearches = getRecentSearches();

  // Debounced product search for suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions((s) => ({ ...s, products: [] }));
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await productAPI.getProducts({ search: searchQuery, limit: 5 });
        const items = Array.isArray(data) ? data : data.products || data.items || [];
        setSuggestions((s) => ({ ...s, products: items }));
      } catch {
        setSuggestions((s) => ({ ...s, products: [] }));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useClickOutside(suggestRef, () => { setSuggestionsOpen(false); setSuggestionIndex(-1); });
  useClickOutside(notifRef, () => setNotifOpen(false));

  // Build flat list of suggestion actions for keyboard (max 8)
  const suggestionActions = useCallback(() => {
    const actions = [];
    const q = searchQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;
    const products = suggestions.products || [];
    const recent = recentSearches.slice(0, 3);
    const trending = TRENDING.slice(0, 2);
    if (hasQuery && products.length === 0) {
      actions.push({ type: 'noResult', label: t('search.noMatches'), onClick: () => { navigate('/search'); setSuggestionsOpen(false); } });
    } else {
      if (products.length > 0) products.slice(0, 5).forEach((p) => {
        actions.push({ type: 'product', data: p, onClick: () => { navigate(buyerProductPath(p)); setSuggestionsOpen(false); } });
      });
      recent.forEach((r) => {
        actions.push({ type: 'recent', label: r, onClick: () => { setSearchQuery(r); addRecentSearch(r); navigate(`/search?q=${encodeURIComponent(r)}${category && category !== ALL_CATEGORIES ? `&category=${encodeURIComponent(category)}` : ''}`); setSuggestionsOpen(false); } });
      });
      trending.forEach((t) => {
        actions.push({ type: 'trending', label: t, onClick: () => { setSearchQuery(t); addRecentSearch(t); navigate(`/search?q=${encodeURIComponent(t)}${category && category !== ALL_CATEGORIES ? `&category=${encodeURIComponent(category)}` : ''}`); setSuggestionsOpen(false); } });
      });
    }
    return actions.slice(0, 8);
  }, [searchQuery, suggestions.products, recentSearches, category, navigate]);

  const actions = suggestionActions();
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const showSuggestions = suggestionsOpen && (searchFocus || searchQuery);

  useEffect(() => {
    setSuggestionIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    if (suggestionIndex < 0 || !suggestionListRef.current) return;
    const el = suggestionListRef.current.querySelector(`[data-suggestion-index="${suggestionIndex}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [suggestionIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (!showSuggestions) {
        if (e.key === 'Escape') setSearchQuery('');
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestionsOpen(false);
        setSuggestionIndex(-1);
        if (searchQuery) setSearchQuery('');
        return;
      }
      const acts = actionsRef.current;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((i) => (i < acts.length - 1 ? i + 1 : i));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((i) => (i <= 0 ? -1 : i - 1));
        return;
      }
      if (e.key === 'Enter' && suggestionIndex >= 0 && acts[suggestionIndex]) {
        e.preventDefault();
        acts[suggestionIndex].onClick();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSuggestions, searchQuery, suggestionIndex]);
  const handleNotifUnreadChange = useCallback((count) => {
    const isNew = count > prevNotifUnreadRef.current && prevNotifUnreadRef.current > 0;
    prevNotifUnreadRef.current = count;
    setNotifUnreadCount(count);
    if (isNew) { setBellRing(true); setTimeout(() => setBellRing(false), 500); }
  }, []);
  useEffect(() => {
    let mounted = true;
    if (!user) {
      setNotifUnreadCount(0);
      return;
    }
    buyerNotificationsApi
      .getUnreadCount()
      .then((data) => {
        if (!mounted) return;
        setNotifUnreadCount(Number(data?.count || 0));
        prevNotifUnreadRef.current = Number(data?.count || 0);
      })
      .catch(() => {
        if (mounted) setNotifUnreadCount(0);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;
    const refresh = () => {
      buyerNotificationsApi
        .getUnreadCount()
        .then((data) => {
          const n = Number(data?.count || 0);
          if (n > prevNotifUnreadRef.current) {
            setBellRing(true);
            setTimeout(() => setBellRing(false), 500);
          }
          prevNotifUnreadRef.current = n;
          setNotifUnreadCount(n);
        })
        .catch(() => {});
    };
    window.addEventListener('systemInboxUnreadRefresh', refresh);
    return () => window.removeEventListener('systemInboxUnreadRefresh', refresh);
  }, [user]);

  useClickOutside(cartRef, () => setCartHoverOpen(false));
  useClickOutside(categoryRef, () => setCategoryDropdownOpen(false));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      addRecentSearch(q);
      navigate(`/search?q=${encodeURIComponent(q)}${category && category !== ALL_CATEGORIES ? `&category=${encodeURIComponent(category)}` : ''}`);
      setSuggestionsOpen(false);
    }
  };

  const subtotal = (cartItems || []).reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div
      className="hidden md:flex items-center justify-between gap-2 md:gap-4 w-full px-3 sm:px-6 lg:px-8 xl:px-12 min-h-[48px] md:h-[70px] md:min-h-0 py-1.5 md:py-0"
    >
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2 flex-shrink-0 md:flex-1 md:max-w-[200px]"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          <img
            src="/logo.jpg"
            alt="Spacilly"
            className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover flex-shrink-0"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          />
          <div className="hidden sm:block">
            <span
              className="spacilly-logo-font font-bold block leading-tight"
              style={{ fontSize: 20, color: 'var(--text-primary)' }}
            >
              Spac<span style={{ color: PRIMARY }}>illy</span>
            </span>
            <span
              className="text-[10px] block leading-tight"
              style={{ color: 'var(--text-muted)' }}
            >
              Buy & Sell Anything
            </span>
          </div>
        </motion.div>
      </Link>

      {/* ── Enhanced futuristic search bar ── */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex-1 max-w-[600px] hidden md:block relative"
        ref={suggestRef}
      >
        {/* Outer glow ring — only visible on focus */}
        <div
          style={{
            position: 'absolute', inset: -2, borderRadius: 999, pointerEvents: 'none',
            background: searchFocus
              ? 'linear-gradient(90deg, color-mix(in srgb, var(--brand-primary) 55%, transparent) 0%, var(--navbar-violet-mix) 50%, color-mix(in srgb, var(--brand-primary) 55%, transparent) 100%)'
              : 'transparent',
            opacity: searchFocus ? 1 : 0,
            filter: 'blur(4px)',
            transition: 'opacity 0.3s ease',
            zIndex: 0,
          }}
        />

        <motion.div
          className="flex items-center overflow-hidden h-11 relative"
          style={{
            borderRadius: 20,
            background: 'color-mix(in srgb, var(--card-bg) 72%, var(--search-bg))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: searchFocus
              ? '1.5px solid color-mix(in srgb, var(--brand-primary) 65%, transparent)'
              : '1px solid color-mix(in srgb, var(--border-card) 80%, transparent)',
            boxShadow: searchFocus
              ? '0 0 0 3px color-mix(in srgb, var(--brand-primary) 14%, transparent), 0 0 28px color-mix(in srgb, var(--brand-primary) 12%, transparent), 0 8px 24px rgba(0,0,0,0.1)'
              : 'var(--shadow-sm)',
            transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
            zIndex: 1,
          }}
        >
          {/* Animated scan line on focus */}
          {searchFocus && (
            <motion.div
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                pointerEvents: 'none', borderRadius: 999, overflow: 'hidden', zIndex: 0,
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }}
                style={{
                  position: 'absolute', top: 0, bottom: 0, width: '40%',
                  background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand-primary) 6%, transparent), transparent)',
                }}
              />
            </motion.div>
          )}

          {/* Category selector */}
          <div className="relative flex-shrink-0" ref={categoryRef} style={{ zIndex: 2 }}>
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="flex items-center gap-1 pl-4 pr-3 h-11 text-[11px] font-semibold transition-colors duration-150"
              style={{
                color: category !== ALL_CATEGORIES ? PRIMARY : 'var(--text-secondary)',
                background: 'transparent',
                letterSpacing: '0.03em',
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              <span className="truncate">{category === ALL_CATEGORIES ? 'All' : category}</span>
              <motion.span animate={{ rotate: categoryDropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
              </motion.span>
            </button>

            {/* Separator */}
            <div
              style={{
                position: 'absolute', right: 0, top: '20%', height: '60%',
                width: 1, background: 'var(--search-border)',
              }}
            />

            <AnimatePresence>
              {categoryDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-0 top-full mt-2 py-1.5 rounded-2xl min-w-[190px] max-h-64 overflow-y-auto z-[200]"
                  style={{
                    background: 'var(--dropdown-bg)',
                    border: '1px solid var(--dropdown-border)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  }}
                >
                  <p className="px-3 pb-1 pt-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>Category</p>
                  {SEARCH_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setCategory(cat); setCategoryDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs transition-colors duration-100 flex items-center gap-2"
                      style={{
                        color: category === cat ? PRIMARY : 'var(--dropdown-text)',
                        background: category === cat ? 'color-mix(in srgb, var(--brand-primary) 7%, transparent)' : 'transparent',
                        fontWeight: category === cat ? 600 : 400,
                      }}
                    >
                      {category === cat && (
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: PRIMARY, flexShrink: 0, display: 'inline-block' }} />
                      )}
                      {cat}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text input */}
          <div className="flex-1 flex items-center min-w-0 relative" style={{ zIndex: 2 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { setSearchFocus(true); setSuggestionsOpen(true); }}
              onBlur={() => setTimeout(() => setSearchFocus(false), 180)}
              placeholder={t('search.placeholder')}
              className="premium-input-exempt w-full px-3 py-2 text-sm outline-none min-w-0 search-input bg-transparent"
              style={{ color: 'var(--text-primary)', letterSpacing: '0.01em' }}
            />
            <AnimatePresence>
              {searchQuery.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  type="button"
                  onClick={() => { setSearchQuery(''); setSuggestionsOpen(false); setSuggestionIndex(-1); }}
                  className="flex-shrink-0 mr-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(107,114,128,0.15)' }}
                  aria-label={t('buttons.clear')}
                >
                  <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Camera visual search */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              openVisualSearch();
            }}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl mx-1 transition active:scale-[0.94]"
            style={{
              background: searchFocus
                ? 'color-mix(in srgb, var(--brand-primary) 18%, transparent)'
                : 'color-mix(in srgb, var(--brand-primary) 8%, transparent)',
              color: 'var(--brand-primary)',
              boxShadow: searchFocus
                ? '0 0 16px color-mix(in srgb, var(--brand-primary) 35%, transparent)'
                : 'none',
            }}
            aria-label="Visual search"
          >
            <Camera className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>

          {/* Filter / browse */}
          <Link
            to="/products"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl mr-1.5 transition active:scale-[0.94]"
            style={{
              background: 'color-mix(in srgb, var(--bg-tertiary) 65%, transparent)',
              color: 'var(--text-secondary)',
            }}
            aria-label={t('footer.links.shop.allProducts')}
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.85} />
          </Link>
        </motion.div>

        {/* ── Futuristic suggestions panel ── */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              ref={suggestionListRef}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-[200]"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px color-mix(in srgb, var(--brand-primary) 6%, transparent)',
                maxHeight: 420,
                overflowY: 'auto',
              }}
            >
              {/* Accent top bar */}
              <div style={{ height: 2, background: `linear-gradient(90deg, ${PRIMARY}, var(--navbar-violet-strong), ${PRIMARY})`, opacity: 0.8 }} />

              {/* No results */}
              {searchQuery.trim() && suggestions.products?.length === 0 && (
                <div className="py-5 px-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      No matches for <span style={{ color: PRIMARY }}>&ldquo;{searchQuery.trim()}&rdquo;</span>
                    </p>
                  </div>
                  <Link
                    to={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                    onClick={() => setSuggestionsOpen(false)}
                    data-suggestion-index={0}
                    className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                    style={{ color: PRIMARY, background: 'var(--brand-tint)' }}
                  >
                    Search anyway →
                  </Link>
                </div>
              )}

              {/* Product results */}
              {searchQuery.trim() && suggestions.products?.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center justify-between px-4 py-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-faint)' }}>Products</span>
                    <Link to={`/search?q=${encodeURIComponent(searchQuery.trim())}`} onClick={() => setSuggestionsOpen(false)} className="text-[10px] font-semibold" style={{ color: PRIMARY }}>
                      See all →
                    </Link>
                  </div>
                  {suggestions.products.slice(0, 5).map((p, idx) => {
                    const rowIndex = actions.findIndex((a) => a.type === 'product' && (a.data?._id || a.data?.id) === (p._id || p.id));
                    const name = p.title || p.name || '';
                    const parts = highlightMatch(name, searchQuery).split('\u0000');
                    const isActive = suggestionIndex === (rowIndex >= 0 ? rowIndex : idx);
                    return (
                      <Link
                        key={p._id || p.id}
                        to={buyerProductPath(p)}
                        onClick={() => setSuggestionsOpen(false)}
                        data-suggestion-index={rowIndex >= 0 ? rowIndex : idx}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-100"
                        style={{ background: isActive ? 'color-mix(in srgb, var(--brand-primary) 7%, transparent)' : 'transparent' }}
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}>
                          <img src={resolveImg(p.images?.[0] || p.image)} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                            {parts.map((seg, i) => (i % 2 === 1 ? <span key={i} style={{ color: PRIMARY, fontWeight: 700 }}>{seg}</span> : seg))}
                          </p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                            {p.category && <span>{p.category}</span>}
                            {p.price != null && <span style={{ color: PRIMARY, fontWeight: 600, marginLeft: 6 }}>${Number(p.price).toFixed(2)}</span>}
                          </p>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PRIMARY }} />}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="py-2" style={{ borderTop: suggestions.products?.length > 0 ? '1px solid var(--divider)' : 'none' }}>
                  <div className="flex items-center justify-between px-4 py-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                      <Clock className="w-3 h-3" /> Recent
                    </span>
                    <button type="button" onClick={() => clearRecentSearches()} className="text-[10px] font-medium transition-colors" style={{ color: 'var(--text-faint)' }}>
                      Clear
                    </button>
                  </div>
                  {recentSearches.slice(0, 5).map((r) => {
                    const rowIndex = actions.findIndex((a) => a.type === 'recent' && a.label === r);
                    const isActive = suggestionIndex === rowIndex;
                    return (
                      <div key={r} className="flex items-center group">
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(r); addRecentSearch(r); navigate(`/search?q=${encodeURIComponent(r)}${category && category !== ALL_CATEGORIES ? `&category=${encodeURIComponent(category)}` : ''}`); setSuggestionsOpen(false); }}
                          data-suggestion-index={rowIndex}
                          className="flex-1 text-left px-4 py-2 text-sm transition-colors duration-100 flex items-center gap-2.5 min-w-0"
                          style={{ background: isActive ? 'color-mix(in srgb, var(--brand-primary) 7%, transparent)' : 'transparent', color: 'var(--text-secondary)' }}
                        >
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
                          <span className="truncate">{r}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeRecentSearch(r); }}
                          className="p-1.5 mr-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'var(--bg-hover)' }}
                          aria-label={t('buttons.remove')}
                        >
                          <X className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Trending */}
              <div className="py-2" style={{ borderTop: '1px solid var(--divider)' }}>
                <div className="px-4 py-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.16em] flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
                    <Flame className="w-3 h-3" style={{ color: PRIMARY }} /> Trending now
                  </span>
                </div>
                <div className="px-3 pb-2 flex flex-wrap gap-2">
                  {TRENDING.slice(0, 5).map((item, idx) => {
                    const rowIndex = actions.findIndex((a) => a.type === 'trending' && a.label === item);
                    const isActive = suggestionIndex === rowIndex;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => { setSearchQuery(item); addRecentSearch(item); navigate(`/search?q=${encodeURIComponent(item)}${category && category !== ALL_CATEGORIES ? `&category=${encodeURIComponent(category)}` : ''}`); setSuggestionsOpen(false); }}
                        data-suggestion-index={rowIndex}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                        style={{
                          background: isActive ? PRIMARY : 'var(--brand-tint)',
                          color: isActive ? 'var(--text-on-accent)' : PRIMARY,
                          border: `1px solid ${isActive ? PRIMARY : 'var(--brand-border-subtle)'}`,
                        }}
                      >
                        <Flame className="w-3 h-3" />
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer hint */}
              <div
                className="flex items-center justify-between px-4 py-2"
                style={{ borderTop: '1px solid var(--divider)', background: 'var(--bg-secondary)' }}
              >
                <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  ↑↓ navigate &nbsp;·&nbsp; ↵ select &nbsp;·&nbsp; Esc close
                </span>
                <span className="text-[10px] font-semibold" style={{ color: PRIMARY }}>AI-Powered Search</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <div className="relative hidden md:block" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="group relative p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-110"
            style={{ transformOrigin: 'center' }}
          >
            <Bell
              className={`w-[22px] h-[22px] transition-colors duration-200 ${bellRing ? 'notif-bell-ring' : ''} ${notifOpen ? 'text-[var(--brand-primary)]' : 'text-gray-500 group-hover:text-[var(--brand-primary)]'}`}
            />
            {notifUnreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center notif-badge-pulse"
                style={{ boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' }}
              >
                {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
              </motion.span>
            )}
          </button>
          <NotificationsDropdown
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
            onUnreadChange={handleNotifUnreadChange}
          />
        </div>

        {/* Wishlist */}
        <Link
          to="/account?tab=wishlist"
          className="relative hidden md:flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition group"
          title={t('wishlist.title')}
        >
          <Heart className="w-[22px] h-[22px] group-hover:fill-red-500 group-hover:stroke-red-500 transition" style={{ color: 'var(--text-muted)' }} />
          {wishlistCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-white text-xs font-bold flex items-center justify-center"
              style={{ background: PRIMARY }}
            >
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          )}
        </Link>

        {/* Cart with mini dropdown */}
        <div className="relative" ref={cartRef}>
          <button
            type="button"
            data-cart-target="badge"
            onClick={openCart}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <ShoppingBag className="w-5 h-5 md:w-[22px] md:h-[22px]" style={{ color: 'var(--text-muted)' }} />
            {cartCount > 0 && (
              <span
                data-cart-target="badge"
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ background: PRIMARY }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>

        <AccountMenuButton
          variant="desktop"
          onLogoutClick={onLogoutClick}
          openAuth={openAuth}
        />
      </div>
    </div>
  );
}

// ── Tier 3: Category nav bar ──────────────────────────────────────────────────
function CategoryNav({ t }) {
  const location = useLocation();
  const { isSeller, isLoggedIn, isSellerPending } = useSellerAccess();
  const handleSellerLink = useHandleSellerLink();

  return (
    <div
      className="hidden md:flex items-center w-full px-4 sm:px-6 lg:px-8 xl:px-12"
      style={{ height: 44, background: 'var(--navbar-bg)', boxShadow: 'var(--shadow-navbar)', position: 'relative', zIndex: 101 }}
    >
      <nav className="flex-1 flex items-center gap-6 overflow-x-auto scrollbar-hide px-4">
        {NAV_LINKS.map(({ to, labelKey, badge }) => {
          const isActive = location.pathname === to || (to === '/search' && location.pathname === '/search');
          return (
            <Link
              key={labelKey}
              to={to}
              className="flex-shrink-0 flex items-center gap-1 py-2 text-sm font-medium transition whitespace-nowrap"
              style={{
                color: isActive ? 'var(--nav-link-hover)' : 'var(--nav-link)',
                borderBottom: isActive ? '2px solid var(--nav-link-hover)' : '2px solid transparent',
              }}
            >
              {t(labelKey)}
              {badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {isSeller ? (
        <Link
          to="/seller"
          className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold transition text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]"
        >
          {t('header.sellerDashboard')} <ChevronRight className="w-4 h-4" />
        </Link>
      ) : isSellerPending ? (
        <Link
          to="/seller/pending"
          className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold transition"
          style={{ color: 'var(--notif-type-review)' }}
        >
          {t('header.applicationPending')} ⏳
        </Link>
      ) : (
        <Link
          to="/become-seller"
          onClick={(e) => {
            if (!isLoggedIn) return;
            handleSellerLink(e, '/seller');
          }}
          className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold transition text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]"
        >
          {t('header.becomeSeller')} <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// ── Main Navbar export ───────────────────────────────────────────────────────
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCategoryBrowse = /^\/category(\/|$)/.test(location.pathname);
  const { language, setLanguage, currency, setCurrency } = useTheme();
  const { t } = useTranslation();
  const openImmersiveSearch = useImmersiveSearch((s) => s.openSearch);
  const headerHidden = useScrollChrome((s) => s.headerHidden);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const selectedCurrency = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const openAuth = (tab = 'login') => {
    if (tab === 'signup') {
      navigate('/auth?tab=signup');
      return;
    }
    navigate('/auth?tab=login');
  };
  const cartItems = useBuyerCart((s) => s.items);
  const openCart = useBuyerCart((s) => s.openCart);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const wishlistItems = useWishlistStore((s) => s.items);
  const fetchWishlist = useWishlistStore((s) => s.fetchWishlist);
  const wishlistCount = wishlistItems.length;

  useEffect(() => {
    if (user?.id) void fetchWishlist(user.id);
  }, [user?.id, fetchWishlist]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      addRecentSearch(q);
      navigate(`/search?q=${encodeURIComponent(q)}${category && category !== ALL_CATEGORIES ? `&category=${encodeURIComponent(category)}` : ''}`);
    }
  };

  return (
    <header
      className="mob-storefront-header fixed top-0 left-0 right-0 z-[100] flex flex-col transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:translate-y-0"
      style={{
        background: 'color-mix(in srgb, var(--header-bg) 88%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        transform: headerHidden ? 'translateY(calc(-100% + 44px))' : 'translateY(0)',
        boxShadow: headerHidden ? 'none' : 'var(--shadow-header)',
      }}
    >
      {/* Tier 1 */}
      <div style={{ position: 'relative', zIndex: 103 }}>
        <UtilityBar
          language={language}
          setLanguage={setLanguage}
          currencyDisplay={selectedCurrency.symbol + ' ' + selectedCurrency.code}
          setCurrency={(c) => setCurrency(c.code)}
          t={t}
        />
      </div>

      {/* Tier 2 */}
      <div
        className="mob-header-tier flex flex-col"
        style={{
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--header-border)',
          boxShadow: 'var(--shadow-header)',
          position: 'relative',
          zIndex: 102,
        }}
      >
        <MainHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchFocus={searchFocus}
          setSearchFocus={setSearchFocus}
          category={category}
          setCategory={setCategory}
          language={language}
          currency={selectedCurrency.symbol + ' ' + selectedCurrency.code}
          openAuth={openAuth}
          user={user}
          signOut={signOut}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          cartCount={cartCount}
          openCart={openCart}
          cartItems={cartItems}
          wishlistCount={wishlistCount}
          t={t}
        />

        <MobileBuyerTopBar
          onLogoutClick={() => setShowLogoutConfirm(true)}
          openAuth={openAuth}
        />

        {/* Mobile: search — hidden on category browse (page has its own search) */}
        {!isCategoryBrowse && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              openImmersiveSearch(searchQuery);
            }}
            className="md:hidden mob-header-search-wrap"
          >
            <motion.button
              type="button"
              role="search"
              onClick={() => openImmersiveSearch(searchQuery)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  openImmersiveSearch(searchQuery);
                }
              }}
              className={`mob-search-bar mob-search-bar--2026 w-full text-left${searchQuery ? ' has-value' : ''}`}
              aria-label="Search"
            >
              <Search className="mob-search-bar__icon" strokeWidth={2} aria-hidden />
              <span className="mob-search-bar__placeholder">
                {searchQuery || 'Search products, brands…'}
              </span>
              <Link
                to="/category/all"
                className="mob-search-filter-btn"
                aria-label={t('footer.links.shop.allProducts')}
                onClick={(e) => e.stopPropagation()}
              >
                <SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden />
              </Link>
            </motion.button>
          </form>
        )}

      </div>

      {/* Tier 3 */}
      <div style={{ position: 'relative', zIndex: 101 }}>
        <CategoryNav t={t} />
      </div>

      {/* Logout confirmation modal */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
              {t('dialog.logoutTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              {t('dialog.logoutConfirm')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                signOut();
                setShowLogoutConfirm(false);
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
            >
              {t('buttons.logout')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
