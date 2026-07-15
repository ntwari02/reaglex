import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Mic, Camera, ShoppingCart, Sparkles, ArrowLeft } from 'lucide-react';
import { useImmersiveSearch } from '../../stores/immersiveSearchStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useToastStore } from '../../stores/toastStore';
import { productAPI } from '../../services/api';
import { SERVER_URL } from '../../lib/config';
import { buyerProductPath } from '../../lib/productUrl';
import { EASE_OUT_EXPO } from '../../motion/presets';
import {
  MOCK_SEARCH_CHIPS,
  MOCK_RECENT,
  getMockSearchResults,
} from '../../lib/mockSearch';
const RECENT_KEY = 'spacilly_recent_searches';

function getRecent() {
  try {
    const s = localStorage.getItem(RECENT_KEY);
    const parsed = s ? JSON.parse(s) : [];
    return Array.isArray(parsed) && parsed.length ? parsed : MOCK_RECENT;
  } catch {
    return MOCK_RECENT;
  }
}

function resolveImg(src) {
  if (!src) return null;
  const v = typeof src === 'string' ? src : src?.url || src?.src;
  if (!v) return null;
  return v.startsWith('http') ? v : `${SERVER_URL}${v}`;
}

export default function ImmersiveSearchLayer() {
  const navigate = useNavigate();
  const open = useImmersiveSearch((s) => s.open);
  const initialQuery = useImmersiveSearch((s) => s.initialQuery);
  const closeSearch = useImmersiveSearch((s) => s.closeSearch);
  const addItem = useBuyerCart((s) => s.addItem);
  const showToast = useToastStore((s) => s.showToast);

  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mockMode, setMockMode] = useState(null);
  const [listening, setListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [mockBanner, setMockBanner] = useState('');

  const recent = getRecent().slice(0, 8);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery || '');
      setMockMode(null);
      setCameraOpen(false);
      setMockBanner('');
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, initialQuery]);

  const applyMockResults = useCallback((label, term) => {
    setMockMode(label);
    setProducts(getMockSearchResults(term));
    setMockBanner(label === 'voice' ? `Heard: “${term}”` : 'Visual match — demo results');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    if (mockMode) return undefined;

    if (!query.trim()) {
      setProducts([]);
      setLoading(false);
      return undefined;
    }

    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await productAPI.getProducts({ search: query.trim(), limit: 6 });
        const list = Array.isArray(data) ? data : data?.products || data?.data || [];
        setProducts(list.slice(0, 6));
      } catch {
        setProducts(getMockSearchResults(query));
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [query, open, mockMode]);

  const saveRecent = (term) => {
    try {
      const recentList = getRecent().filter((r) => r !== term);
      recentList.unshift(term);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recentList.slice(0, 8)));
    } catch {
      /* ignore */
    }
  };

  const submit = (q) => {
    const term = (q || query).trim();
    if (!term) return;
    saveRecent(term);
    closeSearch();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const startVoiceSearch = () => {
    if (listening) return;
    setMockMode(null);
    setListening(true);
    setMockBanner('');
    window.setTimeout(() => {
      setListening(false);
      const heard = 'Wireless earbuds under $100';
      setQuery(heard);
      applyMockResults('voice', heard);
    }, 2200);
  };

  const runCameraMock = () => {
    setCameraOpen(false);
    const term = 'Similar products';
    setQuery(term);
    applyMockResults('camera', term);
  };

  const handleQuickAdd = (e, product) => {
    e.stopPropagation();
    addItem({
      _id: product._id || product.id,
      title: product.title || product.name,
      price: product.price,
      images: [product.thumbnail || product.image],
    });
    showToast('Added to cart', 'success');
  };

  const showResults = products.length > 0 || loading;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="isearch-root fixed inset-0 z-[200] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
        >
          <motion.button
            type="button"
            className="absolute inset-0"
            style={{
              background: 'color-mix(in srgb, var(--bg-page) 70%, rgba(0,0,0,0.4))',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
            aria-label="Close search"
            onClick={closeSearch}
          />

          <motion.div
            className="isearch-panel relative flex h-full flex-col"
            initial={{ y: -20, opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.36, ease: EASE_OUT_EXPO }}
            style={{ paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="isearch-top-bar">
              <button type="button" className="isearch-back-btn" onClick={closeSearch} aria-label="Close search">
                <ArrowLeft size={20} />
                <span>Cancel</span>
              </button>
            </header>
            <div className="isearch-bar-row">
              <div className="isearch-field">
                <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => {
                    setMockMode(null);
                    setMockBanner('');
                    setQuery(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Search products, brands, stores…"
                  className="isearch-input"
                />
                <button
                  type="button"
                  className={`isearch-icon-btn isearch-icon-btn--mic${listening ? ' is-listening is-active' : ''}`}
                  onClick={startVoiceSearch}
                  aria-label={listening ? 'Listening…' : 'Voice search'}
                >
                  <Mic size={18} />
                </button>
                <button
                  type="button"
                  className="isearch-icon-btn"
                  onClick={() => setCameraOpen(true)}
                  aria-label="Camera search"
                >
                  <Camera size={18} />
                </button>
              </div>
              <button type="button" className="isearch-close" onClick={closeSearch} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="isearch-body">
              {listening && (
                <div className="isearch-mock-banner">
                  <Mic size={16} className="isearch-icon-btn--mic is-listening" />
                  Listening… speak now
                </div>
              )}

              {mockBanner && !listening && (
                <div className="isearch-mock-banner">
                  <Sparkles size={16} />
                  {mockBanner}
                  <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>Demo</span>
                </div>
              )}

              {!showResults && (
                <>
                  <p className="isearch-label">Suggestions</p>
                  <div className="isearch-rail" role="list">
                    {MOCK_SEARCH_CHIPS.map((s) => (
                      <button key={s} type="button" className="isearch-chip" onClick={() => submit(s)}>
                        {s}
                      </button>
                    ))}
                  </div>

                  <p className="isearch-label">Recent</p>
                  <div className="isearch-rail" role="list">
                    {recent.map((r) => (
                      <button key={r} type="button" className="isearch-chip" onClick={() => submit(r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {showResults && (
                <>
                  <p className="isearch-label" style={{ marginTop: 4 }}>
                    {loading ? 'Searching…' : 'Products'}
                  </p>
                  {loading && (
                    <div className="isearch-results">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="isearch-result pwa-skeleton" style={{ minHeight: 72 }} />
                      ))}
                    </div>
                  )}
                  {!loading && (
                    <div className="isearch-results">
                      {products.map((p, i) => {
                        const img = resolveImg(p.thumbnail || p.images?.[0]);
                        const name = p.title || p.name;
                        return (
                          <motion.div
                            key={p._id || p.id || i}
                            role="button"
                            tabIndex={0}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="isearch-result"
                            onClick={() => {
                              closeSearch();
                              navigate(buyerProductPath(p));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                closeSearch();
                                navigate(buyerProductPath(p));
                              }
                            }}
                          >
                            <div className="isearch-result-media">
                              {img && <img src={img} alt="" />}
                            </div>
                            <div className="isearch-result-body">
                              <p className="isearch-result-title">{name}</p>
                              <p className="isearch-result-price">${Number(p.price || 0).toFixed(2)}</p>
                            </div>
                            <button
                              type="button"
                              className="isearch-cart-btn"
                              aria-label="Add to cart"
                              onClick={(e) => handleQuickAdd(e, p)}
                            >
                              <ShoppingCart size={17} strokeWidth={2} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            <AnimatePresence>
              {cameraOpen && (
                <motion.div
                  className="isearch-camera-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="isearch-camera-frame">
                    Point at a product
                    <br />
                    <span style={{ opacity: 0.65, fontSize: 11 }}>Demo visual search</span>
                  </div>
                  <div className="isearch-camera-actions">
                    <button type="button" className="isearch-camera-scan" onClick={runCameraMock}>
                      Scan
                    </button>
                    <button type="button" className="isearch-camera-cancel" onClick={() => setCameraOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
