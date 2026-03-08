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
import { useTheme } from '../contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const PRIMARY = '#f97316';
const PRIMARY_HOVER = '#ea580c';
const DROPDOWN_SHADOW = '0 8px 24px rgba(0,0,0,0.12)';

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

const ANNOUNCEMENTS = [
  "New arrivals every Monday",
  "Secure payments with escrow protection",
  "24/7 Customer Support",
];

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/search?sort=newest', label: "New Arrivals ✨" },
  { to: '/search?sort=discount', label: "Today's Deals 🔥", badge: 'HOT' },
  { to: '/search?sort=rating', label: 'Top Sellers ⭐' },
  { to: '/search', label: 'Stores' },
  { to: '/track', label: 'Track My Order' },
  { to: '#', label: 'Blog' },
];

const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'FR', label: 'French' },
  { code: 'RW', label: 'Kinyarwanda' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'RWF', symbol: 'FRw', label: 'RWF' },
];

// ── Tier 1: Utility bar ───────────────────────────────────────────────────────
function UtilityBar({ language, setLanguage, currencyDisplay, setCurrency }) {
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [langOpen, setLangOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);
  const langRef = useRef(null);
  const currRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => {
      setAnnouncementIndex((i) => (i + 1) % ANNOUNCEMENTS.length);
    }, 4000);
    return () => clearInterval(t);
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
        Free shipping on orders over $50 🚚
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
              {ANNOUNCEMENTS[announcementIndex]}
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
            <Globe className="w-3.5 h-3.5" /> {language}
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
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-orange-50 transition"
                    style={{ color: l.code === language ? PRIMARY : 'var(--dropdown-text)' }}
                  >
                    {l.label}
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
          Sell on Reaglex
        </Link>
        <Link
          to="/help"
          className="text-xs hover:opacity-90 transition flex items-center gap-1"
          style={{ color: 'var(--topbar-text)' }}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Help Center
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

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
function resolveImg(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
}

// ── Tier 2: Main header ───────────────────────────────────────────────────────
function MainHeader({
  searchQuery, setSearchQuery, searchFocus, setSearchFocus, category, setCategory,
  language, currency, openAuth, user, signOut, onLogoutClick, cartCount, openCart, cartItems, wishlistCount,
  onMobileMenuOpen,
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
      actions.push({ type: 'noResult', label: 'Browse all products', onClick: () => { navigate('/search'); setSuggestionsOpen(false); } });
    } else {
      if (products.length > 0) products.slice(0, 5).forEach((p) => {
        actions.push({ type: 'product', data: p, onClick: () => { navigate(`/products/${p._id || p.id}`); setSuggestionsOpen(false); } });
      });
      recent.forEach((r) => {
        actions.push({ type: 'recent', label: r, onClick: () => { setSearchQuery(r); addRecentSearch(r); navigate(`/search?q=${encodeURIComponent(r)}${category && category !== 'All Categories' ? `&category=${encodeURIComponent(category)}` : ''}`); setSuggestionsOpen(false); } });
      });
      trending.forEach((t) => {
        actions.push({ type: 'trending', label: t, onClick: () => { setSearchQuery(t); addRecentSearch(t); navigate(`/search?q=${encodeURIComponent(t)}${category && category !== 'All Categories' ? `&category=${encodeURIComponent(category)}` : ''}`); setSuggestionsOpen(false); } });
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
  useClickOutside(profileRef, () => setProfileOpen(false));
  useClickOutside(cartRef, () => setCartHoverOpen(false));
  useClickOutside(categoryRef, () => setCategoryDropdownOpen(false));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      addRecentSearch(q);
      navigate(`/search?q=${encodeURIComponent(q)}${category && category !== 'All Categories' ? `&category=${encodeURIComponent(category)}` : ''}`);
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

      {/* Search bar — center, 560px on large screens */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex-1 max-w-[560px] hidden md:block relative"
        ref={suggestRef}
      >
        <div
          className="flex items-center overflow-hidden rounded-full h-11"
          style={{
            background: 'var(--search-bg)',
            border: searchFocus ? `1.5px solid var(--input-border-focus)` : '1px solid var(--search-border)',
            boxShadow: searchFocus ? 'var(--input-shadow-focus)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          {/* Category dropdown */}
          <div className="relative flex-shrink-0" ref={categoryRef}>
            <button
              type="button"
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="flex items-center gap-1 pl-4 pr-2 py-2 text-xs font-medium h-full"
              style={{ color: 'var(--text-secondary)', background: 'transparent' }}
            >
              {category}
              <ChevronDown className="w-4 h-4" />
            </button>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-6"
              style={{ right: -2, borderRight: '1px solid var(--search-border)' }}
            />
            <AnimatePresence>
              {categoryDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 top-full mt-1 py-1 rounded-xl min-w-[180px] max-h-60 overflow-y-auto z-[200]"
                  style={{
                    background: 'var(--dropdown-bg)',
                    border: '1px solid var(--dropdown-border)',
                    boxShadow: 'var(--dropdown-shadow)',
                  }}
                >
                  {SEARCH_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setCategory(cat); setCategoryDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-orange-50 transition"
                      style={{ color: category === cat ? PRIMARY : 'var(--dropdown-text)' }}
                    >
                      {cat}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 flex items-center min-w-0 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { setSearchFocus(true); setSuggestionsOpen(true); }}
              onBlur={() => setTimeout(() => setSearchFocus(false), 180)}
              placeholder="Search products, brands, stores..."
              className="w-full px-3 py-2 pr-8 text-sm outline-none min-w-0 search-input bg-transparent"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSuggestionsOpen(false); setSuggestionIndex(-1); }}
                className="absolute right-2 p-1 rounded-full hover:bg-gray-200 transition"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" style={{ color: '#6b7280' }} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="flex-shrink-0 w-12 h-full flex items-center justify-center rounded-r-full transition"
            style={{ background: PRIMARY }}
          >
            <Search className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search suggestions dropdown — sections: Recent, Trending, Products; keyboard nav; max 8 */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              ref={suggestionListRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute left-0 right-0 top-full mt-1 rounded-xl bg-white overflow-hidden z-[200] max-h-[360px] overflow-y-auto"
              style={{ boxShadow: DROPDOWN_SHADOW }}
            >
              {searchQuery.trim() && suggestions.products?.length === 0 && (
                <div className="py-4 px-4">
                  <p className="text-sm" style={{ color: '#6b7280' }}>No results for &apos;{searchQuery.trim()}&apos;</p>
                  <Link
                    to="/search"
                    onClick={() => setSuggestionsOpen(false)}
                    data-suggestion-index={0}
                    className={`inline-block mt-2 text-sm font-semibold ${suggestionIndex === 0 ? 'opacity-90' : ''}`}
                    style={{ color: PRIMARY }}
                  >
                    Browse all products →
                  </Link>
                </div>
              )}
              {searchQuery.trim() && suggestions.products?.length > 0 && (
                <div className="py-2">
                  <p className="px-4 py-1 text-xs font-semibold flex items-center gap-1" style={{ color: '#94a3b8' }}>📦 Products</p>
                  {suggestions.products.slice(0, 5).map((p, idx) => {
                    const rowIndex = actions.findIndex((a) => a.type === 'product' && (a.data?._id || a.data?.id) === (p._id || p.id));
                    const name = p.title || p.name || '';
                    const parts = highlightMatch(name, searchQuery).split('\u0000');
                    return (
                      <Link
                        key={p._id || p.id}
                        to={`/products/${p._id || p.id}`}
                        onClick={() => setSuggestionsOpen(false)}
                        data-suggestion-index={rowIndex >= 0 ? rowIndex : idx}
                        className={`flex items-center gap-3 px-4 py-2 transition ${suggestionIndex === (rowIndex >= 0 ? rowIndex : idx) ? 'bg-orange-50' : 'hover:bg-orange-50'}`}
                      >
                        <img src={resolveImg(p.images?.[0] || p.image)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm truncate block" style={{ color: '#1a1a1a' }}>
                            {parts.map((seg, i) => (i % 2 === 1 ? <span key={i} style={{ color: PRIMARY, fontWeight: 600 }}>{seg}</span> : seg))}
                          </span>
                          <span className="text-xs" style={{ color: '#94a3b8' }}>{(p.category || '') && ` • ${p.category}`} {(p.price != null) && ` • $${Number(p.price).toFixed(2)}`}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              {recentSearches.length > 0 && (
                <div className="py-2 border-t border-gray-100">
                  <div className="flex items-center justify-between px-4 py-1">
                    <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#94a3b8' }}>🕐 Recent</p>
                    <button type="button" onClick={() => clearRecentSearches()} className="text-xs" style={{ color: PRIMARY }}>Clear history</button>
                  </div>
                  {recentSearches.slice(0, 8).map((r, idx) => {
                    const rowIndex = actions.findIndex((a) => a.type === 'recent' && a.label === r);
                    return (
                      <div key={r} className="flex items-center group">
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(r); addRecentSearch(r); navigate(`/search?q=${encodeURIComponent(r)}${category && category !== 'All Categories' ? `&category=${encodeURIComponent(category)}` : ''}`); setSuggestionsOpen(false); }}
                          data-suggestion-index={rowIndex}
                          className={`flex-1 text-left px-4 py-2 text-sm transition flex items-center gap-2 min-w-0 ${suggestionIndex === rowIndex ? 'bg-orange-50' : 'hover:bg-orange-50'}`}
                          style={{ color: '#374151' }}
                        >
                          {r}
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeRecentSearch(r); }} className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition" aria-label="Remove">
                          <X className="w-3.5 h-3.5" style={{ color: '#6b7280' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="py-2 border-t border-gray-100">
                <p className="px-4 py-1 text-xs font-semibold flex items-center gap-1" style={{ color: '#94a3b8' }}>🔥 Trending</p>
                {TRENDING.slice(0, 5).map((t, idx) => {
                  const rowIndex = actions.findIndex((a) => a.type === 'trending' && a.label === t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setSearchQuery(t); addRecentSearch(t); navigate(`/search?q=${encodeURIComponent(t)}${category && category !== 'All Categories' ? `&category=${encodeURIComponent(category)}` : ''}`); setSuggestionsOpen(false); }}
                      data-suggestion-index={rowIndex}
                      className={`w-full text-left px-4 py-2 text-sm transition ${suggestionIndex === rowIndex ? 'bg-orange-50' : 'hover:bg-orange-50'}`}
                      style={{ color: '#374151' }}
                    >
                      {t}
                    </button>
                  );
                })}
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
          className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
        {/* Notifications */}
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
          title="My Wishlist"
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
            onMouseEnter={() => cartItems?.length > 0 && setCartHoverOpen(true)}
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
          <AnimatePresence>
            {cartHoverOpen && cartItems?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                onMouseLeave={() => setCartHoverOpen(false)}
                className="absolute right-0 top-full mt-1 w-80 rounded-xl bg-white overflow-hidden z-[200]"
                style={{ boxShadow: DROPDOWN_SHADOW }}
              >
                <div className="max-h-64 overflow-y-auto py-2">
                  {cartItems.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      to="/account?tab=orders"
                      onClick={() => setCartHoverOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition"
                    >
                      <img src={resolveImg(item.image)} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1a1a1a' }}>{item.title}</p>
                        <p className="text-xs font-semibold" style={{ color: PRIMARY }}>${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Subtotal: ${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex gap-2 px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => { setCartHoverOpen(false); openCart(); }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold border transition"
                    style={{ borderColor: PRIMARY, color: PRIMARY }}
                  >
                    View Cart
                  </button>
                  <Link
                    to="/checkout"
                    onClick={() => setCartHoverOpen(false)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold text-white text-center transition"
                    style={{ background: PRIMARY }}
                  >
                    Checkout
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden md:block w-px h-6" style={{ background: '#e5e7eb' }} />

        {/* Profile / Login */}
        <div className="relative" ref={profileRef}>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden flex-shrink-0 transition"
                style={{ background: PRIMARY }}
              >
                <span className="text-white font-bold text-sm">
                  {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </span>
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
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: PRIMARY }}>
                        <span className="text-white font-bold text-sm">
                          {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{user.full_name || 'User'}</p>
                        <p className="text-xs truncate text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 py-2">
                      {[
                        { icon: Package, label: 'My Orders', to: '/account?tab=orders' },
                        { icon: Heart, label: 'Wishlist', to: '/account?tab=wishlist' },
                        { icon: MapPin, label: 'Addresses', to: '/account?tab=addresses' },
                        { icon: CreditCard, label: 'Payment Methods', to: '/account?tab=payment' },
                        { icon: Star, label: 'My Reviews', to: '/account?tab=reviews' },
                        { icon: RotateCcw, label: 'Returns', to: '/returns' },
                        { icon: Shield, label: '🛡️ Buyer Protection', to: '/buyer-protection' },
                        { icon: Settings, label: 'Account Settings', to: '/account' },
                      ].map(({ icon: Icon, label, to }) => (
                        <Link
                          key={label}
                          to={to}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition text-gray-700 dark:text-gray-300"
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" /> {label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                      <button
                        type="button"
                        onClick={() => { onLogoutClick(); setProfileOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400"
                      >
                        <LogOut className="w-4 h-4" /> Logout
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
              Login / Register
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
function CategoryNav({ megaOpen, setMegaOpen }) {
  const location = useLocation();
  const [megaHover, setMegaHover] = useState(false);
  const megaRef = useRef(null);
  const { isSeller, isLoggedIn, isSellerPending } = useSellerAccess();
  const handleSellerLink = useHandleSellerLink();
  useClickOutside(megaRef, () => { setMegaOpen(false); setMegaHover(false); });

  return (
    <div
      className="hidden md:flex items-center w-full px-4 sm:px-6 lg:px-8 xl:px-12"
      style={{ height: 44, background: 'var(--navbar-bg)', boxShadow: 'var(--shadow-navbar)', position: 'relative', zIndex: 101 }}
    >
      <div className="relative flex-shrink-0" ref={megaRef}>
        <button
          type="button"
          onClick={() => setMegaOpen(!megaOpen)}
          onMouseEnter={() => setMegaHover(true)}
          className="flex items-center gap-2 h-full px-4 rounded-lg text-sm font-semibold transition"
          style={{ color: 'white', background: PRIMARY }}
        >
          <Menu className="w-4 h-4" /> All Categories
        </button>

        <AnimatePresence>
          {(megaOpen || megaHover) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              onMouseLeave={() => { setMegaHover(false); setMegaOpen(false); }}
              className="absolute left-0 top-full mt-0 w-full min-w-[600px] max-w-[900px] rounded-b-xl overflow-hidden z-[200] border"
              style={{
                background: 'var(--dropdown-bg)',
                borderColor: 'var(--dropdown-border)',
                boxShadow: 'var(--dropdown-shadow)',
              }}
            >
              <div className="flex">
                <div className="w-56 flex-shrink-0 py-3 border-r border-gray-100 dark:border-gray-700">
                  {MEGA_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.name}
                      to={`/search?category=${encodeURIComponent(cat.name)}`}
                      onClick={() => setMegaOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                      style={{ color: 'var(--dropdown-text)' }}
                    >
                      <span>{cat.icon}</span> {cat.name}
                    </Link>
                  ))}
                </div>
                <div className="flex-1 p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                  <div className="text-center">
                    <p className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Today's Deals 🔥</p>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Up to 70% off — limited time</p>
                    <Link
                      to="/search?sort=discount"
                      onClick={() => setMegaOpen(false)}
                      className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ background: PRIMARY }}
                    >
                      Shop Deals
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 flex items-center gap-6 overflow-x-auto scrollbar-hide px-4">
        {NAV_LINKS.map(({ to, label, badge }) => {
          const isActive = location.pathname === to || (to === '/search' && location.pathname === '/search');
          return (
            <Link
              key={label}
              to={to}
              className="flex-shrink-0 flex items-center gap-1 py-2 text-sm font-medium transition whitespace-nowrap"
              style={{
                color: isActive ? 'var(--nav-link-hover)' : 'var(--nav-link)',
                borderBottom: isActive ? '2px solid var(--nav-link-hover)' : '2px solid transparent',
              }}
            >
              {label}
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
          Seller Dashboard <ChevronRight className="w-4 h-4" />
        </Link>
      ) : isSellerPending ? (
        <Link
          to="/seller/pending"
          className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold transition"
          style={{ color: '#fbbf24' }}
        >
          Application Pending ⏳
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
          Become a Seller <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────
function MobileDrawer({
  open, onClose, user, signOut, onLogoutClick, openAuth, cartCount, openCart, wishlistCount,
  language, setLanguage, currency, setCurrency, searchQuery, setSearchQuery, onSearchSubmit,
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
              <span className="font-bold text-lg text-gray-900 dark:text-white">Menu</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
                  <p className="font-semibold truncate text-gray-900 dark:text-white">{user.full_name || 'User'}</p>
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
                  Login / Register
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
                  placeholder="Search..."
                  className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button type="submit" className="p-2.5" style={{ background: PRIMARY }}>
                  <Search className="w-5 h-5 text-white" />
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto py-4">
              <p className="px-4 text-xs font-semibold uppercase tracking-wider mb-2 text-gray-400 dark:text-gray-500">Shop</p>
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
              <p className="px-4 text-xs font-semibold uppercase tracking-wider mt-4 mb-2 text-gray-400 dark:text-gray-500">Links</p>
              {NAV_LINKS.filter((l) => l.to !== '/').map(({ to, label }) => (
                <Link
                  key={label}
                  to={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition ${location.pathname === to ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300 hover:text-orange-500 dark:hover:text-orange-400'}`}
                >
                  {label}
                </Link>
              ))}
              <Link to="/" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">Home</Link>

              <div className="mt-6 px-4 flex items-center gap-4">
                <button type="button" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Globe className="w-4 h-4" /> {language}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">{currency}</span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={() => { onClose(); openCart(); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <ShoppingBag className="w-4 h-4" /> Cart {cartCount > 0 && `(${cartCount})`}
              </button>
              <Link
                to="/account?tab=wishlist"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <Heart className="w-4 h-4" /> Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
              </Link>
            </div>

            {user && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => { onLogoutClick(); onClose(); }}
                  className="w-full py-2 text-sm font-medium flex items-center justify-center gap-2 text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4" /> Logout
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [category, setCategory] = useState('All Categories');
  const [language, setLanguage] = useState('EN');
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [megaOpen, setMegaOpen] = useState(false);
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
      navigate(`/search?q=${encodeURIComponent(q)}${category && category !== 'All Categories' ? `&category=${encodeURIComponent(category)}` : ''}`);
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
              placeholder="Search products, brands, stores..."
              className="flex-1 px-4 text-sm outline-none min-w-0 bg-transparent search-input"
            />
            <button type="submit" className="px-4 flex-shrink-0" style={{ background: PRIMARY }}>
              <Search className="w-5 h-5 text-white" />
            </button>
          </div>
        </form>
      </div>

      {/* Tier 3 */}
      <div style={{ position: 'relative', zIndex: 101 }}>
        <CategoryNav megaOpen={megaOpen} setMegaOpen={setMegaOpen} />
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
      />

      {/* Logout confirmation modal */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400">
              Log out?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to log out? You will need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                signOut();
                setShowLogoutConfirm(false);
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
            >
              Log out
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
