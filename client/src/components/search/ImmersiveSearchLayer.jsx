import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Footprints,
  Headphones,
  History,
  Mic,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { useImmersiveSearch } from '../../stores/immersiveSearchStore';
import { useMotionUi } from '../../stores/motionUiStore';
import { productAPI } from '../../services/api';
import { openProductExperience } from '../../lib/productNavigation';
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
} from '../../lib/recentSearches';
import { EASE_OUT_EXPO } from '../../motion/presets';
import SearchResultRow from './SearchResultRow';

const SUGGESTIONS = [
  { label: 'Shoes for men', icon: Footprints },
  { label: 'Nike shoes', icon: Footprints },
  { label: 'Wireless earbuds', icon: Headphones },
  { label: 'Summer sale', icon: Sun },
  { label: 'Smart watch', icon: Sparkles },
];

export default function ImmersiveSearchLayer() {
  const navigate = useNavigate();
  const open = useImmersiveSearch((s) => s.open);
  const initialQuery = useImmersiveSearch((s) => s.initialQuery);
  const voiceOnOpen = useImmersiveSearch((s) => s.voiceOnOpen);
  const closeSearch = useImmersiveSearch((s) => s.closeSearch);
  const openVoiceSearch = useImmersiveSearch((s) => s.openVoiceSearch);
  const openVisualSearch = useMotionUi((s) => s.openVisualSearch);

  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [products, setProducts] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentVersion, setRecentVersion] = useState(0);

  const recent = useMemo(() => getRecentSearches().slice(0, 8), [recentVersion, open]);

  const refreshRecent = useCallback(() => setRecentVersion((v) => v + 1), []);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery || '');
      setFocused(true);
      const t = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
    setFocused(false);
    return undefined;
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open || !voiceOnOpen) return undefined;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      closeSearch();
      openVisualSearch();
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last?.[0]?.transcript) {
        setQuery(last[0].transcript);
      }
    };

    recognition.onerror = () => {
      closeSearch();
      openVisualSearch();
    };

    try {
      recognition.start();
    } catch {
      closeSearch();
      openVisualSearch();
    }

    return () => {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    };
  }, [open, voiceOnOpen, closeSearch, openVisualSearch]);

  useEffect(() => {
    if (!open) return undefined;

    const loadPopular = async () => {
      try {
        const data = await productAPI.getProducts({ limit: 6, sort: '-rating' });
        const list = Array.isArray(data) ? data : data?.products || data?.data || [];
        setPopularProducts(list.slice(0, 6));
      } catch {
        setPopularProducts([]);
      }
    };

    loadPopular();
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const term = query.trim();
    if (!term) {
      setProducts([]);
      setLoading(false);
      return undefined;
    }

    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await productAPI.getProducts({ search: term, limit: 8 });
        const list = Array.isArray(data) ? data : data?.products || data?.data || [];
        setProducts(list.slice(0, 8));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(t);
  }, [query, open]);

  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUGGESTIONS;
    return SUGGESTIONS.filter((s) => s.label.toLowerCase().includes(q));
  }, [query]);

  const displayProducts = query.trim() ? products : popularProducts;
  const isLiveResults = Boolean(query.trim());

  const submit = useCallback(
    (q) => {
      const term = (q ?? query).trim();
      if (!term) return;
      addRecentSearch(term);
      refreshRecent();
      closeSearch();
      navigate(`/search?q=${encodeURIComponent(term)}`);
    },
    [closeSearch, navigate, query, refreshRecent],
  );

  const openProduct = useCallback(
    (p) => {
      closeSearch();
      openProductExperience(navigate, p);
    },
    [closeSearch, navigate],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="isearch-root md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.26, ease: EASE_OUT_EXPO }}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <motion.button
            type="button"
            className="isearch-backdrop"
            aria-label="Close search"
            onClick={closeSearch}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="isearch-panel"
            initial={{ y: 12, opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.34, ease: EASE_OUT_EXPO }}
          >
            <header className="isearch-header">
              <button
                type="button"
                className="isearch-back"
                onClick={closeSearch}
                aria-label="Back"
              >
                <ArrowLeft size={22} />
              </button>

              <div className={`isearch-field-wrap${focused ? ' is-focused' : ''}`}>
                <div className={`isearch-field${focused ? ' is-focused' : ''}`}>
                  <Search size={18} className="isearch-field-icon" strokeWidth={2} />
                  <input
                    ref={inputRef}
                    type="search"
                    enterKeyHint="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={(e) => e.key === 'Enter' && submit()}
                    placeholder="Search products, brands, stores…"
                    className="isearch-input"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {query.length > 0 && (
                    <button
                      type="button"
                      className="isearch-clear"
                      onClick={() => {
                        setQuery('');
                        inputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={`isearch-voice${voiceOnOpen ? ' is-listening' : ''}`}
                onClick={() => openVoiceSearch(query)}
                aria-label="Voice search"
              >
                <Mic size={20} strokeWidth={2} />
              </button>
            </header>

            <div className="isearch-body">
              {filteredSuggestions.length > 0 && (
                <>
                  <div className="isearch-section-label">Suggestions</div>
                  <div className="isearch-chips-scroll">
                    {filteredSuggestions.map(({ label, icon: Icon }) => (
                      <motion.button
                        key={label}
                        type="button"
                        className="isearch-chip"
                        onClick={() => submit(label)}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Icon size={14} className="isearch-chip-icon" strokeWidth={2} />
                        {label}
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              {recent.length > 0 && !isLiveResults && (
                <>
                  <div className="isearch-recent-head">
                    <span className="isearch-section-label">Recent searches</span>
                    <button
                      type="button"
                      className="isearch-clear-all"
                      onClick={() => {
                        clearRecentSearches();
                        refreshRecent();
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="isearch-recent-scroll">
                    {recent.map((r) => (
                      <div key={r} className="isearch-recent-chip">
                        <button
                          type="button"
                          className="isearch-recent-chip-btn"
                          onClick={() => submit(r)}
                        >
                          <History size={13} className="isearch-recent-icon" />
                          <span>{r}</span>
                        </button>
                        <button
                          type="button"
                          className="isearch-recent-remove"
                          onClick={() => {
                            removeRecentSearch(r);
                            refreshRecent();
                          }}
                          aria-label={`Remove ${r}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="isearch-section-label">
                <span>{isLiveResults ? 'Products' : 'Popular products'}</span>
                {(isLiveResults ? products.length > 0 : popularProducts.length > 0) && (
                  <button type="button" className="isearch-see-all" onClick={() => submit()}>
                    See all
                  </button>
                )}
              </div>

              {loading && (
                <div className="isearch-results">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="isearch-skel" />
                  ))}
                </div>
              )}

              {!loading && displayProducts.length > 0 && (
                <motion.div
                  className="isearch-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.24 }}
                >
                  <AnimatePresence mode="popLayout">
                    {displayProducts.map((p, i) => (
                      <SearchResultRow
                        key={p._id || p.id || i}
                        product={p}
                        index={i}
                        onNavigate={openProduct}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {!loading && isLiveResults && displayProducts.length === 0 && query.trim() && (
                <p className="isearch-empty">No products found. Try another term or browse suggestions.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
