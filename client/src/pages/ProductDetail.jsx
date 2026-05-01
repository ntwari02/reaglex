import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Heart, Star, ChevronLeft, ChevronRight, ChevronDown,
  Truck, Shield, Plus, Minus, Share2, ZoomIn, Check,
  X, Link2, ThumbsUp, BadgeCheck, Package, RefreshCw,
  Zap, MessageCircle,
} from 'lucide-react';
import './ProductDetail.css';
import BuyerLayout from '../components/buyer/BuyerLayout';
import ProductCard from '../components/ProductCard';
import { productAPI } from '../services/api';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useRecentlyViewed } from '../stores/recentlyViewedStore';
import { useCurrencyPricing } from '../hooks/useCurrencyPricing';
import { useSeo } from '../utils/useSeo';
import { SERVER_URL } from '../lib/config';

const PRIMARY = 'var(--brand-primary)';
const ease = [0.25, 0.46, 0.45, 0.94];

/* ─── helpers ────────────────────────────────────────────────────────────── */
function resolveImage(src) {
  const fallback = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
  if (!src) return fallback;
  let c = src;
  if (typeof c === 'object') c = c?.src || c?.url || c?.image || c?.imageUrl || c?.path;
  if (typeof c !== 'string') return fallback;
  const t = c.trim();
  if (!t) return fallback;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  return `${SERVER_URL}${t.startsWith('/') ? t : `/${t}`}`;
}

/* ─── static data ────────────────────────────────────────────────────────── */
const SIZES  = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Midnight', hex: '#111827' },
  { name: 'Cloud',    hex: '#f1f5f9' },
  { name: 'Navy',     hex: '#1e3a5f' },
  { name: 'Ember',    hex: 'var(--brand-primary)' },
  { name: 'Sage',     hex: '#4ade80' },
];

const TABS = [
  { id: 'description',    label: 'Description'    },
  { id: 'specifications', label: 'Specifications' },
  { id: 'reviews',        label: 'Reviews'        },
  { id: 'qa',             label: 'Q & A'          },
];

const HIGHLIGHTS = [
  { icon: Package,   title: 'Free Shipping',    desc: 'On orders over $35',    color: 'var(--brand-primary)' },
  { icon: RefreshCw, title: '30-Day Returns',   desc: 'No questions asked',     color: '#10b981' },
  { icon: Shield,    title: 'Buyer Protection', desc: 'Your money is safe',     color: '#6366f1' },
  { icon: Zap,       title: 'Fast Dispatch',    desc: 'Ships within 24 hours', color: '#f59e0b' },
];

/* ─── sub-components ─────────────────────────────────────────────────────── */

/** SVG grid mesh */
function GridMesh() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <defs>
        <pattern id="pd2-grid" width="52" height="52" patternUnits="userSpaceOnUse">
          <path d="M 52 0 L 0 0 0 52" fill="none" stroke="color-mix(in srgb, var(--brand-primary) 5.5%, transparent)" strokeWidth="1" />
        </pattern>
        <radialGradient id="pd2-fade" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="var(--bg-page)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--bg-page)" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#pd2-grid)" />
      <rect width="100%" height="100%" fill="url(#pd2-fade)" />
    </svg>
  );
}

/** Star row */
function Stars({ rating, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i} size={size}
          fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
          stroke={i <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
export default function ProductDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const addItem      = useBuyerCart((s) => s.addItem);
  const currencyPricing = useCurrencyPricing();
  const addRecent    = useRecentlyViewed((s) => s.addProduct);
  const recentItems  = useRecentlyViewed((s) => s.items);

  /* ── state ── */
  const [product,      setProduct]      = useState(null);
  const [related,      setRelated]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeImage,  setActiveImage]  = useState(0);
  const [quantity,     setQuantity]     = useState(1);
  const [wishlisted,   setWishlisted]   = useState(false);
  const [addState,     setAddState]     = useState('idle');
  const [lightbox,     setLightbox]     = useState(false);
  const [tabIndex,     setTabIndex]     = useState(0);
  const [shared,       setShared]       = useState(false);
  const [shareOpen,    setShareOpen]    = useState(false);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor,setSelectedColor]= useState(COLORS[0]);
  const [qtyShake,     setQtyShake]     = useState(false);
  const [expandedQa,   setExpandedQa]   = useState(null);
  const [reviewPage,   setReviewPage]   = useState(0);
  const [voteUp,       setVoteUp]       = useState(187);
  const [relatedPaused, setRelatedPaused] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [inventoryRefreshTick, setInventoryRefreshTick] = useState(0);
  /** Mobile stacked sections: which detail accordion is open (null = all collapsed) */
  const [mobileDetailOpen, setMobileDetailOpen] = useState('description');

  /* ── refs ── */
  const ctaRef = useRef(null);
  const relatedScrollRef = useRef(null);

  /* ── SEO ── */
  const productId   = product?._id || product?.id || id;
  const title       = product?.title || product?.name || 'Product';
  const category    = product?.category || 'General';
  const images      = useMemo(() => {
    const list = (product?.images?.length ? product.images : [product?.image]).filter(Boolean);
    return list;
  }, [product?.images, product?.image]);
  const canonicalUrl = useMemo(() => {
    try { return `${window.location.origin}/products/${productId}`; }
    catch { return `/products/${productId}`; }
  }, [productId]);
  const primaryImage = useMemo(() => (images?.[0] ? resolveImage(images[0]) : undefined), [images]);
  const seoConfig = useMemo(() => {
    if (!product) return { title: 'Product | Reaglex', description: 'View product on Reaglex.', canonicalUrl };
    const price = product?.price || 0;
    const stock = product?.stockQuantity ?? product?.stock ?? 0;
    const rating = Number(product?.averageRating || product?.rating || 0);
    const reviewsCount = Number(product?.totalReviews || product?.reviewCount || 0);
    return {
      title: product?.seoTitle || `${title} | Reaglex`,
      description: product?.seoDescription || product?.description || `Buy ${title} on Reaglex.`,
      keywords: product?.seoKeywords,
      canonicalUrl,
      openGraph: { title: `${title} | Reaglex`, description: product?.description || '', image: primaryImage },
      noIndex: false,
      jsonLdScriptId: 'reaglex-jsonld-product',
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'Product',
        name: title, description: product?.description || '',
        sku: product?.sku || id, category,
        image: images.slice(0, 6).map(resolveImage),
        brand: { '@type': 'Brand', name: product?.brand || 'Reaglex' },
        offers: {
          '@type': 'Offer', price, priceCurrency: product?.currency || 'USD',
          availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: canonicalUrl,
        },
        ...(rating || reviewsCount ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating, reviewCount: reviewsCount } } : {}),
      },
    };
  }, [product, title, category, images, primaryImage, canonicalUrl, id]);
  useSeo(seoConfig);

  /* ── data fetch ── */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true); setError(null); setActiveImage(0);
    productAPI.getProductById(id)
      .then((data) => {
        const p = data.product || data;
        setProduct(p);
        addRecent(p);
        productAPI.trackView(id).catch(() => null);
      })
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
    productAPI.getProducts({ limit: 8 })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.products || data.items || [];
        setRelated(items.filter((p) => (p._id || p.id) !== id).slice(0, 8));
      })
      .catch(() => {});
  }, [id, inventoryRefreshTick]);

  useEffect(() => {
    const onInventoryUpdated = (e) => {
      const updatedId = e?.detail?.productId;
      if (updatedId && String(updatedId) === String(id)) {
        setInventoryRefreshTick((v) => v + 1);
      }
    };
    window.addEventListener('inventoryUpdated', onInventoryUpdated);
    return () => window.removeEventListener('inventoryUpdated', onInventoryUpdated);
  }, [id]);

  /* ── actions ── */
  const handleAddToCart = () => {
    if (!product || addState !== 'idle') return;
    setAddState('adding');
    addItem(product, quantity);
    setTimeout(() => setAddState('added'), 500);
    setTimeout(() => setAddState('idle'), 2500);
  };

  const handleShare = async (method) => {
    const url  = encodeURIComponent(window.location.href);
    const name = product?.title || product?.name || 'Product';
    const text = encodeURIComponent(`Check out "${name}" on Reaglex!`);
    if (method === 'copy') {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true); setTimeout(() => setShared(false), 2000);
    } else if (method === 'whatsapp') window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
    else if (method === 'facebook')  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    else if (method === 'twitter')   window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    setShareOpen(false);
  };

  const decrementQty = () => {
    if (quantity <= 1) { setQtyShake(true); setTimeout(() => setQtyShake(false), 400); return; }
    setQuantity((q) => q - 1);
  };

  /* ── related products auto-slide strip ── */
  useEffect(() => {
    if (related.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      const el = relatedScrollRef.current;
      if (!el || relatedPaused) return;
      el.scrollLeft += 0.7;
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half) el.scrollLeft -= half;
    }, 16);
    return () => window.clearInterval(id);
  }, [related.length, relatedPaused]);

  /* ── loading / error ── */
  if (loading) return (
    <BuyerLayout>
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-page)' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 rounded-full border-4 border-[color-mix(in_srgb,var(--brand-primary)_22%,var(--card-bg))] border-t-[var(--brand-primary)]"
        />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading product…</p>
      </div>
    </BuyerLayout>
  );

  if (error) return (
    <BuyerLayout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6" style={{ background: 'var(--bg-page)' }}>
        <span className="text-6xl">😕</span>
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{error}</p>
        <button onClick={() => navigate(-1)}
          className="px-7 py-3 rounded-full text-white font-bold text-sm"
          style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
          Go Back
        </button>
      </div>
    </BuyerLayout>
  );

  /* ── derived values ── */
  const price        = product.price || 0;
  const oldPrice     = product.compareAtPrice || product.originalPrice || null;
  const discount     = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const rating       = Number(product.averageRating || product.rating || 4.8);
  const reviewsCount = product.totalReviews || product.reviewCount || 124;
  const stock        = product.stockQuantity ?? product.stock ?? 10;
  const verificationStatus = product.verificationSummary?.status || 'unverified';
  const verificationScore = Number(product.verificationSummary?.score || 0);
  const seller       = product.seller?.storeName || product.sellerName || 'Premium Store';
  const sellerRating = Math.min(5, Number(product.seller?.rating ?? rating) || rating);
  const installment  = currencyPricing.formatLocalWithUsd(price / 3);
  const shortDesc    = (product.description || '').trim().slice(0, 180) || 'Premium quality — see full description below.';

  const specs = [
    { prop: 'Brand',          value: product.brand    || 'Reaglex'     },
    { prop: 'SKU',            value: product.sku      || id            },
    { prop: 'Category',       value: category                          },
    { prop: 'Material',       value: product.material || 'Cotton blend'},
    { prop: 'Sizes',          value: SIZES.join(', ')                  },
    { prop: 'Weight',         value: product.weight   || '200g'        },
    { prop: 'Origin',         value: product.origin   || 'Imported'    },
    { prop: 'Warranty',       value: '1 year limited'                  },
  ];

  const reviewBars = [
    { stars: 5, pct: 78 }, { stars: 4, pct: 15 },
    { stars: 3, pct: 5  }, { stars: 2, pct: 2  }, { stars: 1, pct: 0 },
  ];

  const qaList = [
    { q: 'What material is this made of?',     a: 'Premium cotton blend for comfort and durability.' },
    { q: 'How do I choose the right size?',    a: 'Refer to our size guide — we recommend sizing up for a relaxed fit.' },
    { q: 'Is international shipping available?', a: 'Yes! We ship to 180+ countries via tracked courier services.' },
  ];

  const recentFiltered = recentItems.filter((p) => (p._id || p.id) !== id).slice(0, 6);

  const renderDetailPanel = (panelIndex, opts = { dense: false }) => {
    const { dense } = opts;
    switch (panelIndex) {
      case 0:
        return (
          <div className="pt-3">
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              {product.description || 'No description available.'}
            </p>
            <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Key Features</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Premium quality materials', 'Fast shipping worldwide', '30-day hassle-free returns', 'Verified seller guarantee'].map((f) => (
                <div key={f} className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
                    <Check size={13} className="text-green-600" />
                  </div>
                  <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="pt-3 overflow-x-auto">
            <table className="w-full text-sm min-w-0">
              <tbody>
                {specs.map((row, i) => (
                  <tr key={row.prop} className="border-b last:border-0" style={{ borderColor: 'var(--divider)' }}>
                    <td className="py-2.5 pr-3 font-semibold align-top w-[36%] max-w-[120px]" style={{ color: 'var(--text-primary)' }}>{row.prop}</td>
                    <td className="py-2.5 break-words" style={{ color: 'var(--text-secondary)' }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 2:
        return (
          <div className={dense ? 'pt-3 space-y-4' : 'pt-0 space-y-4'} id="reviews-section">
            <div className={`flex flex-col gap-4 p-4 sm:p-6 rounded-2xl ${dense ? '' : 'lg:flex-row lg:items-stretch'}`} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}>
              <div className={`text-center ${dense ? '' : 'lg:text-left lg:flex-shrink-0'}`}>
                <p className={`font-black mb-1 ${dense ? 'text-4xl' : 'text-4xl sm:text-5xl'}`} style={{ color: PRIMARY }}>{rating.toFixed(1)}</p>
                <Stars rating={rating} />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{reviewsCount} reviews</p>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {reviewBars.map((r, i) => (
                  <div key={r.stars} className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs font-medium w-5 sm:w-6 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{r.stars}★</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <motion.div className="h-full rounded-full" style={{ background: PRIMARY }} initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.6, delay: 0.2 + i * 0.06 }} />
                    </div>
                    <span className="text-xs w-7 sm:w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{r.pct}%</span>
                  </div>
                ))}
              </div>
              <div className={`flex flex-col gap-2 ${dense ? '' : 'lg:justify-center lg:items-end'}`}>
                <button type="button" className="w-full lg:w-auto px-5 py-3 rounded-xl sm:rounded-full text-sm font-bold text-white min-h-[48px]" style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
                  <MessageCircle size={14} className="inline mr-1.5" />Write a Review
                </button>
                <button type="button" onClick={() => setVoteUp((v) => v + 1)} className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl sm:rounded-full text-sm font-semibold min-h-[44px]" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                  <ThumbsUp size={13} /> {voteUp} Helpful
                </button>
              </div>
            </div>
            {[
              { author: 'Alex M.', rating: 5, text: 'Absolutely love this product! Quality exceeded my expectations.', date: '2 days ago' },
              { author: 'Sarah K.', rating: 4, text: 'Great quality, fast shipping. Would definitely buy again.', date: '1 week ago' },
            ].map((rev, i) => (
              <div key={i} className="flex gap-3 sm:gap-4 py-4 sm:py-5 border-b last:border-0" style={{ borderColor: 'var(--divider)' }}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm" style={{ background: 'var(--gradient-brand-cta)' }}>{rev.author.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{rev.author}</span>
                    <Stars rating={rev.rating} size={12} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{rev.date}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rev.text}</p>
                </div>
              </div>
            ))}
          </div>
        );
      case 3:
        return (
          <div className="pt-3 space-y-3">
            <button type="button" className="w-full py-3 rounded-xl text-sm font-bold text-white min-h-[48px]" style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
              Ask a Question
            </button>
            <div className="space-y-2">
              {qaList.map((qa, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}>
                  <button type="button" onClick={() => setExpandedQa(expandedQa === i ? null : i)} className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 min-h-[48px] touch-manipulation">
                    <span className="font-semibold text-sm pr-2" style={{ color: 'var(--text-primary)' }}>{qa.q}</span>
                    <span className="text-lg font-light flex-shrink-0" style={{ color: PRIMARY }}>{expandedQa === i ? '−' : '+'}</span>
                  </button>
                  <AnimatePresence>
                    {expandedQa === i && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{qa.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  /* ════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════ */
  return (
    <BuyerLayout>
      <div className="pd2-page relative min-h-screen" style={{ background: 'var(--bg-page)', fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* ── Background decoration ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <GridMesh />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 7%, transparent) 0%, transparent 65%)' }} />
          <div className="absolute bottom-40 left-0 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 5%, transparent) 0%, transparent 65%)' }} />
        </div>

        <div className="relative z-10 w-full pd2-fluid-wrap pt-2 sm:pt-4 pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))] md:pb-12 lg:pb-12 max-w-[100vw]">

          {/* ── Breadcrumb ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease }}
            className="flex items-center justify-between gap-2 mb-4 md:mb-8 flex-wrap min-w-0"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0 flex-1" style={{ color: 'var(--text-muted)' }}>
              <Link to="/" className="hover:text-[var(--brand-primary)] transition-colors shrink-0">Home</Link>
              <span className="shrink-0">›</span>
              <Link to="/search" className="hover:text-[var(--brand-primary)] transition-colors truncate">{category}</Link>
              <span className="shrink-0">›</span>
              <span className="font-semibold truncate min-w-0" style={{ color: 'var(--text-primary)' }}>{title}</span>
            </div>
            <button type="button" onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-xs sm:text-sm font-medium hover:text-[var(--brand-primary)] transition-colors shrink-0 touch-manipulation py-2"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Back</span>
            </button>
          </motion.div>

          {/* ════════════════════════════════════════════════
              HERO: Gallery + Purchase Panel
          ════════════════════════════════════════════════ */}
          <div className="pd2-hero-grid gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-10 min-w-0">

            {/* ── Gallery ── */}
            <motion.div
              className="pd2-gallery-col"
              initial={{ opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              {/* Main image */}
              <div
                className="pd2-main-img group relative overflow-hidden rounded-3xl cursor-zoom-in mb-2 md:mb-4"
                style={{
                  background: 'var(--bg-secondary)',
                }}
                onClick={() => setLightbox(true)}
                onTouchStart={(e) => setTouchStartX(e.changedTouches?.[0]?.clientX ?? null)}
                onTouchEnd={(e) => {
                  const endX = e.changedTouches?.[0]?.clientX;
                  if (touchStartX == null || typeof endX !== 'number' || images.length < 2) return;
                  const delta = endX - touchStartX;
                  if (Math.abs(delta) < 40) return;
                  if (delta < 0) setActiveImage((i) => (i + 1) % images.length);
                  else setActiveImage((i) => (i - 1 + images.length) % images.length);
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImage}
                    src={resolveImage(images[activeImage])}
                    alt={title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onError={(e) => { e.target.src = resolveImage(null); }}
                    draggable={false}
                  />
                </AnimatePresence>

                {/* Floating badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className="pd2-badge pd2-badge--green">NEW</span>
                  {discount > 0 && <span className="pd2-badge pd2-badge--red">-{discount}%</span>}
                  <span className="pd2-badge pd2-badge--blue">FREE SHIP</span>
                </div>

                {/* Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {/* Share */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShareOpen(!shareOpen); }}
                      className="pd2-img-btn"
                      aria-label="Share"
                    >
                      <Share2 size={16} />
                    </button>
                    <AnimatePresence>
                      {shareOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute right-0 top-full mt-2 py-2 rounded-2xl z-20 min-w-[160px]"
                          style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-card)',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                          }}
                        >
                          {[['whatsapp','WhatsApp'],['facebook','Facebook'],['twitter','Twitter']].map(([k,l]) => (
                            <button key={k} type="button"
                              onClick={(e) => { e.stopPropagation(); handleShare(k); }}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] transition-colors"
                              style={{ color: 'var(--text-secondary)' }}>
                              {l}
                            </button>
                          ))}
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); handleShare('copy'); }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] transition-colors flex items-center gap-2"
                            style={{ color: 'var(--text-secondary)' }}>
                            {shared ? <Check size={14} className="text-green-500" /> : <Link2 size={14} />}
                            {shared ? 'Copied!' : 'Copy Link'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Zoom */}
                  <button type="button" className="pd2-img-btn" onClick={(e) => { e.stopPropagation(); setLightbox(true); }} aria-label="Zoom">
                    <ZoomIn size={16} />
                  </button>

                  {/* Wishlist */}
                  <motion.button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setWishlisted(!wishlisted); }}
                    className="pd2-img-btn"
                    whileTap={{ scale: 0.88 }}
                    aria-label="Wishlist"
                  >
                    <Heart size={16} fill={wishlisted ? '#ef4444' : 'none'} stroke={wishlisted ? '#ef4444' : 'currentColor'} />
                  </motion.button>
                </div>

                {/* Arrow nav for multi-image */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i - 1 + images.length) % images.length); }}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 pd2-arrow-btn opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                      aria-label="Previous image"
                    ><ChevronLeft size={18} /></button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i + 1) % images.length); }}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 pd2-arrow-btn opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                      aria-label="Next image"
                    ><ChevronRight size={18} /></button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="pd2-thumbs-row flex gap-2 md:gap-2.5 overflow-x-auto pb-1 scroll-touch" style={{ scrollSnapType: 'x mandatory' }}>
                  {images.slice(0, 6).map((img, i) => (
                    <motion.button
                      key={i} type="button"
                      onClick={() => setActiveImage(i)}
                      className="pd2-thumb-btn flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200 touch-manipulation"
                      style={{
                        width: 72, height: 72,
                        border: `2px solid ${i === activeImage ? PRIMARY : 'transparent'}`,
                        boxShadow: 'none',
                        background: 'var(--card-bg)',
                        opacity: i === activeImage ? 1 : 0.65,
                        scrollSnapAlign: 'start',
                      }}
                      whileHover={{ scale: 1.07, opacity: 1 }}
                    >
                      <img src={resolveImage(img)} alt="" className="w-full h-full object-cover" draggable={false} />
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ── Purchase Panel ── */}
            <motion.div
              className="pd2-purchase-col"
              initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease }}
            >
              <div className="pd2-purchase-flow min-w-0">

                {/* Price + stock — mobile-first scan */}
                <div className="order-1 lg:order-5 w-full min-w-0 mb-3 lg:mb-0 space-y-2">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-1">
                      <span className="pd2-price-num tabular-nums">{currencyPricing.formatLocalWithUsd(price)}</span>
                      {oldPrice && <span className="text-sm sm:text-base line-through" style={{ color: 'var(--text-faint)' }}>{currencyPricing.formatLocalWithUsd(oldPrice)}</span>}
                      {discount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black text-white"
                          style={{ background: '#ef4444' }}>SAVE {discount}%</span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                      {stock > 0 ? `${stock} available` : 'Unavailable'}
                      {stock > 0 ? ` · 3 × ${installment}` : ''}
                    </p>
                  </div>
                  <div>
                    {stock === 0 ? (
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold"
                        style={{ background: '#fef2f2', color: '#dc2626' }}>Out of stock</span>
                    ) : stock < 10 ? (
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold"
                        style={{ background: '#fffbeb', color: '#d97706' }}>Only {stock} left</span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs sm:text-sm font-semibold"
                        style={{ background: '#f0fdf4', color: '#15803d' }}>In stock</span>
                    )}
                  </div>
                </div>

                <h1 className="pd2-title mb-2 lg:mb-3 order-2 lg:order-2 w-full min-w-0">{title}</h1>

                {/* Category + badge */}
                <div className="flex flex-wrap items-center gap-2 mb-3 lg:mb-4 order-3 lg:order-1 lg:-mt-1">
                  <Link
                    to={`/search?category=${encodeURIComponent(category)}`}
                    className="px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all hover:scale-105 touch-manipulation"
                    style={{ background: 'var(--brand-tint)', color: PRIMARY }}
                  >
                    {category}
                  </Link>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold"
                    style={{ background: 'var(--brand-tint)', color: PRIMARY, border: '1px solid var(--brand-border-subtle)' }}>
                    <Star size={10} fill={PRIMARY} stroke={PRIMARY} className="shrink-0" /> Top rated
                  </span>
                </div>

                {/* Short desc */}
                <div className="mb-3 lg:mb-4 order-4 lg:order-3">
                  <p
                    className={`text-xs sm:text-sm leading-relaxed ${!descExpanded ? 'line-clamp-3 lg:line-clamp-none' : ''}`}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {descExpanded ? (product.description || shortDesc) : shortDesc}
                  </p>
                  {(product.description || '').length > 180 && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-1.5 text-xs font-semibold hover:underline py-1 touch-manipulation"
                      style={{ color: PRIMARY }}
                    >
                      {descExpanded ? 'Read less' : 'Read more'}
                    </button>
                  )}
                </div>

                {/* Rating row */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 lg:mb-5 pb-3 lg:pb-4 border-b order-5 lg:order-4 w-full min-w-0" style={{ borderColor: 'var(--divider)' }}>
                  <Stars rating={rating} />
                  <span className="font-bold text-sm" style={{ color: PRIMARY }}>{rating.toFixed(1)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTabIndex(2);
                      setMobileDetailOpen('reviews');
                      document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs sm:text-sm hover:underline touch-manipulation py-1"
                    style={{ color: 'var(--text-muted)' }}>
                    {reviewsCount} reviews
                  </button>
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded"
                    style={{ background: '#f0fdf4', color: '#15803d' }}>
                    <BadgeCheck size={12} /> Verified
                  </span>
                  <span
                    className="hidden lg:inline text-[11px] font-semibold px-2 py-0.5 rounded border"
                    style={{
                      color:
                        verificationStatus === 'verified' ? '#15803d' :
                        verificationStatus === 'flagged' || verificationStatus === 'rejected' ? '#dc2626' :
                        '#b45309',
                      background:
                        verificationStatus === 'verified' ? '#f0fdf4' :
                        verificationStatus === 'flagged' || verificationStatus === 'rejected' ? '#fef2f2' :
                        '#fffbeb',
                      borderColor:
                        verificationStatus === 'verified' ? '#bbf7d0' :
                        verificationStatus === 'flagged' || verificationStatus === 'rejected' ? '#fecaca' :
                        '#fde68a',
                    }}
                  >
                    {verificationStatus === 'verified' ? 'Verified by Reaglex' : verificationStatus === 'pending' ? 'Verification Pending' : verificationStatus === 'flagged' ? 'Verification Flagged' : 'Unverified Listing'} · {verificationScore}%
                  </span>
                  <span className="lg:hidden text-[10px] font-medium w-full sm:w-auto" style={{ color: 'var(--text-muted)' }}>
                    Listing verification: {verificationScore}%
                  </span>
                </div>

                <div className="hidden lg:block pd2-divider mb-5 order-6 lg:order-7" />

                {/* Size */}
                <div className="mb-4 lg:mb-5 order-7 lg:order-8">
                  <div className="flex items-center justify-between mb-2 lg:mb-3 gap-2">
                    <span className="text-xs sm:text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Size: <span style={{ color: PRIMARY }}>{selectedSize}</span>
                    </span>
                    <button type="button" className="text-xs font-medium hover:underline touch-manipulation py-2 shrink-0" style={{ color: PRIMARY }}>
                      Guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <motion.button key={s} type="button"
                        onClick={() => setSelectedSize(s)}
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }}
                        className="pd2-size-btn-mobile min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:w-10 lg:h-8 rounded-xl lg:rounded-lg text-xs font-bold transition-all duration-200 touch-manipulation"
                        style={{
                          background: selectedSize === s ? PRIMARY : 'var(--bg-secondary)',
                          color: selectedSize === s ? '#fff' : 'var(--text-secondary)',
                          border: `1.5px solid ${selectedSize === s ? PRIMARY : 'var(--border-card)'}`,
                          boxShadow: selectedSize === s ? 'var(--shadow-cta)' : 'none',
                        }}>
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="mb-4 lg:mb-5 order-8 lg:order-9">
                  <p className="text-xs sm:text-sm font-bold mb-2 lg:mb-3" style={{ color: 'var(--text-primary)' }}>
                    Color: <span style={{ color: PRIMARY }}>{selectedColor.name}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <motion.button key={c.name} type="button"
                        onClick={() => setSelectedColor(c)}
                        whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-full transition-all touch-manipulation shrink-0"
                        style={{
                          background: c.hex,
                          border: `2px solid ${selectedColor.name === c.name ? PRIMARY : 'transparent'}`,
                          boxShadow: selectedColor.name === c.name
                            ? `0 0 0 3px var(--brand-border-subtle), var(--shadow-sm)`
                            : '0 2px 6px rgba(0,0,0,0.12)',
                        }}
                        title={c.name}
                        aria-label={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="pd2-divider mb-4 lg:mb-5 order-9 lg:order-10" />

                {/* Quantity */}
                <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6 order-10 lg:order-11">
                  <span className="text-xs sm:text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>Qty</span>
                  <motion.div
                    animate={qtyShake ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="pd2-qty-control flex items-center rounded-xl overflow-hidden"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}
                  >
                    <button type="button" onClick={decrementQty}
                      className="min-w-[48px] min-h-[48px] lg:w-10 lg:h-10 flex items-center justify-center transition-colors hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] text-lg font-light touch-manipulation"
                      style={{ color: 'var(--text-secondary)' }}>
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[44px] text-center font-bold tabular-nums text-sm" style={{ color: 'var(--text-primary)' }}>
                      {quantity}
                    </span>
                    <button type="button"
                      onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))}
                      disabled={quantity >= (stock || 99)}
                      className="min-w-[48px] min-h-[48px] lg:w-10 lg:h-10 flex items-center justify-center transition-colors hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] disabled:opacity-40 touch-manipulation"
                      style={{ color: 'var(--text-secondary)' }}>
                      <Plus size={14} />
                    </button>
                  </motion.div>
                </div>

                {/* CTAs desktop */}
                <div ref={ctaRef} className="hidden md:grid md:grid-cols-2 gap-3 mb-6 order-11 lg:order-12">
                  {/* Add to Cart */}
                  <motion.button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={stock === 0 || addState === 'adding'}
                    whileHover={addState === 'idle' ? { y: -2 } : {}}
                    whileTap={{ scale: 0.98 }}
                    className="pd2-btn-primary w-full h-14 flex items-center justify-center gap-3 text-sm font-bold"
                    style={addState === 'added' ? { background: '#16a34a', boxShadow: '0 8px 24px rgba(22,163,74,0.35)' } : {}}
                  >
                    {addState === 'adding' && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {addState === 'idle'   && <ShoppingBag size={18} />}
                    {addState === 'idle'   && 'Add to Cart'}
                    {addState === 'adding' && 'Adding…'}
                    {addState === 'added'  && <><Check size={18} /> Added to Cart</>}
                  </motion.button>

                  {/* Buy Now */}
                  <motion.button
                    type="button"
                    onClick={() => { addItem(product, quantity); navigate('/checkout'); }}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                    className="pd2-btn-secondary w-full h-12 flex items-center justify-center gap-2 text-sm font-bold"
                  >
                    <Zap size={16} /> Buy Now
                  </motion.button>
                </div>

                {/* Compact trust icon bar */}
                <div className="flex items-center justify-between gap-1 pt-3 lg:pt-4 mt-1 flex-wrap pd2-divider-top order-12 lg:order-13">
                  {[
                    { icon: Shield,     label: 'Protected',   color: PRIMARY      },
                    { icon: Truck,      label: 'Free Ship',   color: '#6366f1'    },
                    { icon: RefreshCw,  label: '30-day',      color: '#10b981'    },
                    { icon: BadgeCheck, label: 'Verified',    color: '#f59e0b'    },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex flex-col items-center gap-1 flex-1 min-w-[52px]">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>

              </div>{/* end pd2-purchase-flow */}
            </motion.div>
          </div>{/* end hero grid */}

          {/* ════════════════════════════════════════════════
              META STRIP — Seller info + full trust badges
              (moved out of purchase card for a cleaner
               equal-height hero and better organisation)
          ════════════════════════════════════════════════ */}
          <motion.div
            className="pd2-meta-strip !mb-6 md:!mb-14"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            {/* Seller card */}
            <div className="pd2-seller-card max-w-[100vw] overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-white text-xl"
                  style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
                  {seller.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm break-words" style={{ color: 'var(--text-primary)' }}>{seller}</p>
                    <span className="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: '#f0fdf4', color: '#15803d' }}>✓ Verified</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Stars rating={sellerRating} size={11} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{reviewsCount} reviews</span>
                  </div>
                </div>
                <Link to="/search" className="text-xs font-bold sm:flex-shrink-0 hover:underline px-3 py-2.5 sm:py-1.5 rounded-full transition-all text-center sm:text-left touch-manipulation w-full sm:w-auto"
                  style={{ color: PRIMARY, background: 'var(--brand-tint)', border: '1px solid var(--brand-border-subtle)' }}>
                  Visit Store →
                </Link>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Responds within 1 hour · 98% positive ratings</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Shield,     label: 'Buyer Protection', sub: 'Your money is safe',     color: PRIMARY      },
                { icon: Truck,      label: 'Free Shipping',     sub: 'On orders over $35',     color: '#6366f1'    },
                { icon: RefreshCw,  label: '30-Day Returns',    sub: 'No questions asked',     color: '#10b981'    },
                { icon: BadgeCheck, label: 'Verified Seller',   sub: 'Identity confirmed',     color: '#f59e0b'    },
              ].map(({ icon: Icon, label, sub, color }) => (
                <div key={label}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════════
              HIGHLIGHTS STRIP
          ════════════════════════════════════════════════ */}
          <motion.div
            className="flex lg:grid lg:grid-cols-4 gap-3 mb-8 md:mb-10 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 snap-x snap-mandatory lg:snap-none scrollbar-hide -mx-0.5 px-0.5 lg:mx-0 lg:px-0"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            {HIGHLIGHTS.map((h, i) => {
              const Icon = h.icon;
              return (
                <motion.div key={h.title}
                  className="pd2-highlight-card flex items-center gap-3 p-3 sm:p-4 rounded-2xl min-w-[min(85vw,280px)] lg:min-w-0 flex-shrink-0 lg:flex-shrink snap-center lg:snap-none"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.07 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${h.color}14`, border: `1px solid ${h.color}25` }}>
                    <Icon size={18} style={{ color: h.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{h.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ════════════════════════════════════════════════
              Product details — mobile accordions / desktop tabs
          ════════════════════════════════════════════════ */}
          <div className="lg:hidden space-y-2 mb-8">
            {TABS.map((t, i) => (
              <div
                key={t.id}
                className="rounded-2xl overflow-hidden max-w-[100vw]"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}
              >
                <button
                  type="button"
                  className="pd2-mobile-accordion-btn w-full flex items-center justify-between gap-3 px-4 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                  aria-expanded={mobileDetailOpen === t.id}
                  id={`pd2-acc-trigger-${t.id}`}
                  onClick={() => {
                    setMobileDetailOpen((cur) => (cur === t.id ? null : t.id));
                    setTabIndex(i);
                  }}
                >
                  <span className="text-left">
                    {t.id === 'reviews' ? `${t.label} (${reviewsCount})` : t.label}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-200 ${mobileDetailOpen === t.id ? 'rotate-180' : ''}`}
                    style={{ color: PRIMARY }}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {mobileDetailOpen === t.id && (
                    <motion.div
                      role="region"
                      aria-labelledby={`pd2-acc-trigger-${t.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t"
                      style={{ borderColor: 'var(--divider)' }}
                    >
                      <div className="px-3 py-3 sm:px-4 min-w-0">
                        {renderDetailPanel(i, { dense: true })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <motion.div
            className="hidden lg:block rounded-3xl overflow-hidden mb-10 lg:mb-12"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            <div className="relative flex overflow-x-auto scrollbar-hide border-b" style={{ borderColor: 'var(--divider)' }}>
              {TABS.map((t, i) => (
                <button key={t.id} type="button"
                  onClick={() => setTabIndex(i)}
                  className="flex-shrink-0 flex-1 min-w-[90px] min-h-[52px] py-4 px-5 text-sm font-semibold transition-colors whitespace-nowrap touch-manipulation"
                  style={{ color: tabIndex === i ? PRIMARY : 'var(--text-muted)' }}>
                  {t.id === 'reviews' ? `${t.label} (${reviewsCount})` : t.label}
                </button>
              ))}
              <motion.div
                className="absolute bottom-0 h-0.5 rounded-full"
                style={{ background: PRIMARY, width: `${100 / TABS.length}%` }}
                animate={{ left: `${(tabIndex / TABS.length) * 100}%` }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>

            <div className="p-6 md:p-8 min-h-[220px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tabIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderDetailPanel(tabIndex, { dense: false })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════════
              RELATED PRODUCTS
          ════════════════════════════════════════════════ */}
          {related.length > 0 && (
            <section className="mb-14 pd2-homeish-block">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>
                    Recommended For You
                  </p>
                  <h2 className="text-2xl sm:text-[2rem] font-black leading-none" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    YOU MIGHT ALSO LIKE
                  </h2>
                </div>
                <Link to="/search" className="text-xs font-semibold tracking-wide hidden sm:inline-flex" style={{ color: PRIMARY }}>
                  View all →
                </Link>
              </div>
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute left-0 top-0 bottom-4 w-8 z-[2] pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, var(--pd2-strip-bg), transparent)' }}
                />
                <div
                  aria-hidden
                  className="absolute right-0 top-0 bottom-4 w-8 z-[2] pointer-events-none"
                  style={{ background: 'linear-gradient(270deg, var(--pd2-strip-bg), transparent)' }}
                />
                <div
                  ref={relatedScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scroll-touch"
                  onMouseEnter={() => setRelatedPaused(true)}
                  onMouseLeave={() => setRelatedPaused(false)}
                  onTouchStart={() => setRelatedPaused(true)}
                  onTouchEnd={() => setTimeout(() => setRelatedPaused(false), 1100)}
                  style={{
                    scrollbarWidth: 'none',
                    paddingLeft: 'max(0.2rem, calc((100vw - 1280px) / 2 + 0.2rem))',
                    paddingRight: 'max(0.2rem, calc((100vw - 1280px) / 2 + 0.2rem))',
                  }}
                >
                  {[...related.slice(0, 6), ...related.slice(0, 6)].map((p, idx) => (
                    <motion.div key={`${p._id || p.id}-${idx}`}
                      className="flex-shrink-0 w-[240px] sm:w-[255px]"
                      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: (idx % 6) * 0.07, duration: 0.4 }}
                    >
                      <div className="pd2-homeish-card">
                        <ProductCard product={p} index={idx % 6} compact={false} ctaStyle="home" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════════
              RECENTLY VIEWED
          ════════════════════════════════════════════════ */}
          {recentFiltered.length > 0 && (
            <section className="mb-8 pd2-homeish-block">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>
                    Continue Shopping
                  </p>
                  <h2 className="text-2xl sm:text-[2rem] font-black leading-none" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    RECENTLY VIEWED
                  </h2>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scroll-touch" style={{
                scrollbarWidth: 'none',
                paddingLeft: 'max(0.2rem, calc((100vw - 1280px) / 2 + 0.2rem))',
                paddingRight: 'max(0.2rem, calc((100vw - 1280px) / 2 + 0.2rem))',
              }}>
                {recentFiltered.map((p, idx) => (
                  <motion.div key={p._id || p.id}
                    className="flex-shrink-0 w-[200px] sm:w-[220px]"
                    initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: idx * 0.06 }}
                  >
                    <div className="pd2-homeish-card">
                      <ProductCard product={p} index={idx} compact ctaStyle="home" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>

      </div>

      {/* Mobile sticky CTAs — above bottom nav, thumb-sized */}
      <div className="md:hidden fixed left-0 right-0 z-[95] px-2 sm:px-3 pb-2 pt-1.5 bottom-[calc(60px+env(safe-area-inset-bottom,0px))] pointer-events-none">
        <div
          className="pd2-sticky-cta-inner pointer-events-auto grid grid-cols-2 gap-2 p-2 rounded-2xl max-w-[100vw] mx-auto"
          style={{
            background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
            border: '1px solid var(--border-card)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={stock === 0 || addState === 'adding'}
            className="min-h-[48px] rounded-xl text-sm font-bold touch-manipulation flex items-center justify-center gap-2"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--divider)' }}
          >
            {addState === 'adding' && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {addState === 'added' ? 'Added' : 'Add to Cart'}
          </button>
          <button
            type="button"
            onClick={() => { addItem(product, quantity); navigate('/checkout'); }}
            disabled={stock === 0}
            className="min-h-[48px] rounded-xl text-sm font-bold text-white touch-manipulation flex items-center justify-center gap-1.5 disabled:opacity-45"
            style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
          >
            <Zap size={16} /> Buy Now
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          LIGHTBOX
      ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
            onClick={() => setLightbox(false)}
          >
            <motion.img
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }} transition={{ duration: 0.3, ease }}
              src={resolveImage(images[activeImage])}
              alt={title}
              className="max-w-full max-h-full object-contain rounded-2xl"
              style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button type="button" onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              <X size={18} />
            </button>
            {images.length > 1 && (
              <>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i - 1 + images.length) % images.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <ChevronLeft size={22} />
                </button>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i + 1) % images.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </BuyerLayout>
  );
}
