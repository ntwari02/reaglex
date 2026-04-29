import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingBag, Heart, Bell, Menu, X, ChevronDown, ChevronRight,
  Package, MapPin, CreditCard, Star, RotateCcw, Settings, LogOut, Clock, Flame,
  Globe, DollarSign, HelpCircle, Sun, Moon, Shield,
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

const PRIMARY = '#f97316';
const PRIMARY_HOVER = '#ea580c';
const DROPDOWN_SHADOW = '0 8px 24px rgba(0,0,0,0.12)';
const ALL_CATEGORIES = 'All Categories';

// ── Recent searches (localStorage, max 8) ───────────────────────────────────────
const RECENT_KEY = 'reaglex_recent_searches';
const MAX_RECENT = 8;
function getRecentSearches() {
  try {
    const s = localStorage.getItem(RECENT_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
function addRecentSearch(q) {
  if (!q?.trim()) return;
  const recent = getRecentSearches().filter((r) => r !== q.trim());
  recent.unshift(q.trim());
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}
function removeRecentSearch(q) {
  const recent = getRecentSearches().filter((r) => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}
function clearRecentSearches() {
  localStorage.setItem(RECENT_KEY, JSON.stringify([]));
}
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
  { icon: '📱', name: 'Electronics' },
  { icon: '👗', name: 'Clothing' },
  { icon: '👜', name: 'Accessories' },
  { icon: '🏠', name: 'Home & Garden' },
  { icon: '⚽', name: 'Sports' },
  { icon: '💄', name: 'Beauty' },
  { icon: '📚', name: 'Books' },
  { icon: '🧸', name: 'Toys' },
  { icon: '🚗', name: 'Automotive' },
  { icon: '🍔', name: 'Food & Grocery' },
];

const ANNOUNCEMENT_KEYS = ['topbar.announcement1', 'topbar.announcement2', 'topbar.announcement3'];
const LANG_OPTIONS = [
  { code: 'en', labelKey: 'languages.en' },
  { code: 'fr', labelKey: 'languages.fr' },
  { code: 'rw', labelKey: 'languages.rw' },
];

const NAV_LINKS = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/search?sort=newest', labelKey: 'nav.newArrivals' },
  { to: '/search?sort=discount', labelKey: 'nav.deals', badge: 'HOT' },
  { to: '/search?sort=rating', labelKey: 'nav.topSellers' },
  { to: '/search', labelKey: 'nav.stores' },
  { to: '/track', labelKey: 'nav.trackOrder' },
  { to: '#', labelKey: 'nav.blog' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'RWF', symbol: 'FRw', label: 'RWF' },
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
      <p className="text-xs truncate topbar-text" style={{ maxWidth: 220 }}>
        {t('header.freeShipping')} 🚚
      </p>

      <div className="flex-1 flex justify-center min-w-0 mx-4">
        <div className="overflow-hidden text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={announcementIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-xs topbar-text"
            >
              {t(ANNOUNCEMENT_KEYS[announcementIndex])}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
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
                    className="w-full text-left px-4 py-2 text-xs hover:bg-orange-50 transition"
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
                    className="w-full text-left px-4 py-2 text-xs hover:bg-orange-50 transition flex items-center gap-2"
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
          {t('header.sellOnReaglex')}
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

function resolveAvatar(src) {
  if (!src) return null;
  if (typeof src !== 'string') return null;
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  return `${SERVER_URL}${src}`;
}

// ── Tier 2: Main header ───────────────────────────────────────────────────────
function MainHeader({
  searchQuery, setSearchQuery, searchFocus, setSearchFocus, category, setCategory,
  language, currency, openAuth, user, signOut, onLogoutClick, cartCount, openCart, cartItems, wishlistCount,
  onMobileMenuOpen,
  t,
}) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState({ recent: [], trending: TRENDING, products: [] });
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const suggestionListRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [bellRing, setBellRing] = useState(false);
  const prevNotifUnreadRef = useRef(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartHoverOpen, setCartHoverOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const suggestRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
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
        actions.push({ type: 'product', data: p, onClick: () => { navigate(`/products/${p._id || p.id}`); setSuggestionsOpen(false); } });
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

  useClickOutside(profileRef, () => setProfileOpen(false));
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
      className="flex items-center justify-between gap-4 w-full px-4 sm:px-6 lg:px-8 xl:px-12"
      style={{ height: 70 }}
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
            alt="Reaglex"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          />
          <div className="hidden sm:block">
            <span
              className="font-bold block leading-tight"
              style={{ fontSize: 20, color: 'var(--text-primary)', fontFamily: "'Mea Culpa', serif" }}
            >
              Reag<span style={{ color: PRIMARY, fontFamily: "'Mea Culpa', serif" }}>lex</span>
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
              ? 'linear-gradient(90deg, rgba(249,115,22,0.55) 0%, rgba(139,92,246,0.38) 50%, rgba(249,115,22,0.55) 100%)'
              : 'transparent',
            opacity: searchFocus ? 1 : 0,
            filter: 'blur(4px)',
            transition: 'opacity 0.3s ease',
            zIndex: 0,
          }}
        />

        <div
          className="flex items-center overflow-hidden h-11 relative"
          style={{
            borderRadius: 999,
            background: 'var(--search-bg)',
            border: searchFocus
              ? '1.5px solid rgba(249,115,22,0.7)'
              : '1px solid var(--search-border)',
            boxShadow: searchFocus
              ? '0 0 0 3px rgba(249,115,22,0.12), 0 4px 20px rgba(0,0,0,0.08)'
              : '0 1px 4px rgba(0,0,0,0.06)',
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
                  background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.06), transparent)',
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
                        background: category === cat ? 'rgba(249,115,22,0.07)' : 'transparent',
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
              className="w-full px-3 py-2 text-sm outline-none min-w-0 search-input bg-transparent"
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
                  <X className="w-3 h-3" style={{ color: '#6b7280' }} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Submit button */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex-shrink-0 w-12 h-full flex items-center justify-center rounded-r-full relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${PRIMARY}, #ea580c)` }}
          >
            {/* Shimmer */}
            <motion.div
              animate={{ x: ['-120%', '200%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
                pointerEvents: 'none',
              }}
            />
            <Search className="w-4.5 h-4.5 text-white relative z-10" style={{ width: 18, height: 18 }} />
          </motion.button>
        </div>

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
                boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(249,115,22,0.06)',
                maxHeight: 420,
                overflowY: 'auto',
              }}
            >
              {/* Accent top bar */}
              <div style={{ height: 2, background: `linear-gradient(90deg, ${PRIMARY}, rgba(139,92,246,0.7), ${PRIMARY})`, opacity: 0.8 }} />

              {/* No results */}
              {searchQuery.trim() && suggestions.products?.length === 0 && (
                <div className="py-5 px-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4" style={{ color: '#9ca3af' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      No matches for <span style={{ color: PRIMARY }}>&ldquo;{searchQuery.trim()}&rdquo;</span>
                    </p>
                  </div>
                  <Link
                    to={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                    onClick={() => setSuggestionsOpen(false)}
                    data-suggestion-index={0}
                    className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                    style={{ color: PRIMARY, background: 'rgba(249,115,22,0.09)' }}
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
                        to={`/products/${p._id || p.id}`}
                        onClick={() => setSuggestionsOpen(false)}
                        data-suggestion-index={rowIndex >= 0 ? rowIndex : idx}
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-100"
                        style={{ background: isActive ? 'rgba(249,115,22,0.07)' : 'transparent' }}
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
                          style={{ background: isActive ? 'rgba(249,115,22,0.07)' : 'transparent', color: 'var(--text-secondary)' }}
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
                          background: isActive ? PRIMARY : 'rgba(249,115,22,0.09)',
                          color: isActive ? '#fff' : PRIMARY,
                          border: `1px solid ${isActive ? PRIMARY : 'rgba(249,115,22,0.2)'}`,
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
      <div className="flex items-center gap-5 flex-shrink-0">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-full border border-gray-200 dark:border-gray-700 p-0 leading-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
          title={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
        <div className="relative hidden md:block" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="group relative p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-110"
            style={{ transformOrigin: 'center' }}
          >
            <Bell
              className={`w-[22px] h-[22px] transition-colors duration-200 ${bellRing ? 'notif-bell-ring' : ''} ${notifOpen ? 'text-orange-500' : 'text-gray-500 group-hover:text-orange-500'}`}
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
          <Heart className="w-[22px] h-[22px] group-hover:fill-red-500 group-hover:stroke-red-500 transition" style={{ color: '#6b7280' }} />
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
            onClick={openCart}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <ShoppingBag className="w-[22px] h-[22px]" style={{ color: '#6b7280' }} />
            {cartCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-white text-xs font-bold flex items-center justify-center"
                style={{ background: PRIMARY }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>

        <div className="hidden md:block w-px h-6" style={{ background: '#e5e7eb' }} />

        {/* Profile / Login */}
        <div className="relative" ref={profileRef}>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-full overflow-hidden flex-shrink-0 p-0 leading-none transition"
                style={{ background: PRIMARY }}
              >
                {resolveAvatar(user.avatar_url) ? (
                  <img
                    src={resolveAvatar(user.avatar_url)}
                    alt={user.full_name || 'Profile'}
                    className="block w-full h-full object-cover rounded-full"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full mt-1 w-60 rounded-xl border py-3 z-[200]"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', boxShadow: 'var(--card-shadow-hover)' }}
                  >
                    <div className="px-4 pb-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY }}>
                        {resolveAvatar(user.avatar_url) ? (
                          <img
                            src={resolveAvatar(user.avatar_url)}
                            alt={user.full_name || 'Profile'}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-white font-bold text-sm">
                            {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{user.full_name || t('nav.profile')}</p>
                        <p className="text-xs truncate text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 py-2">
                      {[
                        { icon: Package, labelKey: 'nav.orders', to: '/account?tab=orders' },
                        { icon: Heart, labelKey: 'nav.wishlist', to: '/account?tab=wishlist' },
                        { icon: MapPin, labelKey: 'account.addresses', to: '/account?tab=addresses' },
                        { icon: CreditCard, labelKey: 'account.paymentMethods', to: '/account?tab=payment' },
                        { icon: Star, labelKey: 'nav.messages', to: '/account?tab=reviews' },
                        { icon: RotateCcw, labelKey: 'header.returns', to: '/returns' },
                        { icon: Shield, labelKey: 'header.buyerProtection', to: '/buyer-protection' },
                        { icon: Settings, labelKey: 'account.profileSettings', to: '/account' },
                      ].map(({ icon: Icon, labelKey, to }) => (
                        <Link
                          key={labelKey}
                          to={to}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition text-gray-700 dark:text-gray-300"
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" /> {t(labelKey)}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                      <button
                        type="button"
                        onClick={() => { onLogoutClick(); setProfileOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400"
                      >
                        <LogOut className="w-4 h-4" /> {t('buttons.logout')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition"
              style={{ background: PRIMARY }}
            >
              {t('header.loginRegister')}
            </button>
          )}
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <Menu className="w-6 h-6" style={{ color: '#374151' }} />
        </button>
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
      <Link
        to="/search"
        className="flex items-center gap-2 h-full px-4 rounded-lg text-sm font-semibold transition flex-shrink-0"
        style={{ color: 'white', background: PRIMARY }}
      >
        <Menu className="w-4 h-4" /> {t('nav.categories')}
      </Link>

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
          className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold transition text-orange-500 hover:text-orange-600"
        >
          {t('header.sellerDashboard')} <ChevronRight className="w-4 h-4" />
        </Link>
      ) : isSellerPending ? (
        <Link
          to="/seller/pending"
          className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold transition"
          style={{ color: '#fbbf24' }}
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
          className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold transition text-orange-500 hover:text-orange-600"
        >
          {t('header.becomeSeller')} <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────
function MobileDrawer({
  open, onClose, user, signOut, onLogoutClick, openAuth, cartCount, openCart, wishlistCount,
  language, setLanguage, currency, setCurrency, searchQuery, setSearchQuery, onSearchSubmit,
  t,
}) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-black/40 md:hidden"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 z-[160] flex flex-col shadow-2xl md:hidden transition-colors duration-300"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-lg text-gray-900 dark:text-white">{t('nav.menu')}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center justify-center w-9 h-9 min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] aspect-square rounded-full border border-gray-200 dark:border-gray-700 p-0 leading-none hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  aria-label={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
                  title={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {user ? (
              <div className="p-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: PRIMARY }}>
                  {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-gray-900 dark:text-white">{user.full_name || t('nav.profile')}</p>
                  <p className="text-xs truncate text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => { onClose(); openAuth('login'); }}
                  className="w-full py-3 rounded-xl text-white font-semibold"
                  style={{ background: PRIMARY }}
                >
                  {t('header.loginRegister')}
                </button>
              </div>
            )}

            {/* Mobile search */}
            <form onSubmit={onSearchSubmit} className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 focus-within:border-orange-500">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search.placeholderShort')}
                  className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button type="submit" className="p-2.5" style={{ background: PRIMARY }}>
                  <Search className="w-5 h-5 text-white" />
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto py-4">
              <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-2 text-gray-400 dark:text-gray-500">{t('nav.shop')}</p>
              {MEGA_CATEGORIES.map(({ icon, name }) => (
                <Link
                  key={name}
                  to={`/search?category=${encodeURIComponent(name)}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                >
                  <span>{icon}</span> {name}
                </Link>
              ))}
              <p className="px-4 text-xs font-semibold uppercase tracking-wider mt-4 mb-2 text-gray-400 dark:text-gray-500">{t('nav.menu')}</p>
              {NAV_LINKS.filter((l) => l.to !== '/').map(({ to, labelKey }) => (
                <Link
                  key={labelKey}
                  to={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition ${location.pathname === to ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400'}`}
                >
                  {t(labelKey)}
                </Link>
              ))}
              <Link to="/" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{t('nav.home')}</Link>

              <div className="mt-6 px-4 flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('header.language')}</p>
                <div className="flex flex-wrap gap-2">
                  {LANG_OPTIONS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        language === l.code
                          ? 'border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {String(l.code).toUpperCase()}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{currency}</span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={() => { onClose(); openCart(); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <ShoppingBag className="w-4 h-4" /> {t('nav.cart')} {cartCount > 0 && `(${cartCount})`}
              </button>
              <Link
                to="/account?tab=wishlist"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <Heart className="w-4 h-4" /> {t('nav.wishlist')} {wishlistCount > 0 && `(${wishlistCount})`}
              </Link>
            </div>

            {user && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => { onLogoutClick(); onClose(); }}
                  className="w-full py-2 text-sm font-medium flex items-center justify-center gap-2 text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4" /> {t('buttons.logout')}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main Navbar export ───────────────────────────────────────────────────────
export default function Navbar() {
  const navigate = useNavigate();
  const { language, setLanguage } = useTheme();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const wishlistCount = wishlistItems.length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      addRecentSearch(q);
      navigate(`/search?q=${encodeURIComponent(q)}${category && category !== ALL_CATEGORIES ? `&category=${encodeURIComponent(category)}` : ''}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] flex flex-col transition-colors duration-300"
      style={{ fontFamily: 'Inter, system-ui, sans-serif', background: 'var(--header-bg)' }}
    >
      {/* Tier 1 */}
      <div style={{ position: 'relative', zIndex: 103 }}>
        <UtilityBar
          language={language}
          setLanguage={setLanguage}
          currencyDisplay={currency.symbol + ' ' + currency.code}
          setCurrency={setCurrency}
          t={t}
        />
      </div>

      {/* Tier 2 */}
      <div
        className="flex flex-col"
        style={{
          background: 'var(--header-bg)',
          borderBottom: 'none',
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
          currency={currency.symbol + ' ' + currency.code}
          openAuth={openAuth}
          user={user}
          signOut={signOut}
          onLogoutClick={() => setShowLogoutConfirm(true)}
          cartCount={cartCount}
          openCart={openCart}
          cartItems={cartItems}
          wishlistCount={wishlistCount}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          t={t}
        />

        {/* Mobile: search bar full width below logo row */}
        <form onSubmit={handleSearchSubmit} className="md:hidden px-4 pb-3">
          <div
            className="flex rounded-full overflow-hidden border-2 h-11"
            style={{ background: 'var(--search-bg)', borderColor: 'var(--search-border)' }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="flex-1 px-4 text-sm outline-none min-w-0 bg-transparent search-input"
            />
            <button type="submit" className="px-4 flex-shrink-0" style={{ background: PRIMARY }} aria-label={t('buttons.search')}>
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>
        </form>
      </div>

      {/* Tier 3 */}
      <div style={{ position: 'relative', zIndex: 101 }}>
        <CategoryNav t={t} />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        signOut={signOut}
        onLogoutClick={() => setShowLogoutConfirm(true)}
        openAuth={openAuth}
        cartCount={cartCount}
        openCart={openCart}
        wishlistCount={wishlistCount}
        language={language}
        setLanguage={setLanguage}
        currency={currency.symbol + ' ' + currency.code}
        setCurrency={() => {}}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        t={t}
      />

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
