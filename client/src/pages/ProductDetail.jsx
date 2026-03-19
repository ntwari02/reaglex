import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ShoppingBag, Heart, Star, ChevronLeft, Truck, Shield, RefreshCcw,
  Plus, Minus, Share2, ZoomIn, Check, X, Link2,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import ProductCard from '../components/ProductCard';
import { productAPI } from '../services/api';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useRecentlyViewed } from '../stores/recentlyViewedStore';
import { useSeo } from '../utils/useSeo';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const PRIMARY = '#f97316';
const ease = [0.25, 0.46, 0.45, 0.94];

function resolveImage(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
}

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Black', hex: '#111827' },
  { name: 'White', hex: '#f9fafb' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Orange', hex: '#f97316' },
];

const TABS = [
  { id: 'description', label: 'Description' },
  { id: 'specifications', label: 'Specifications' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'qa', label: 'Q&A' },
];

const TRUST_BADGES = [
  { icon: Truck, label: 'Free Shipping', sub: 'On orders $30+', color: '#2563eb' },
  { icon: Shield, label: 'Secure Pay', sub: 'Encrypted', color: '#10b981' },
  { icon: RefreshCcw, label: 'Easy Returns', sub: '30-day', color: PRIMARY },
  { icon: Shield, label: 'Buyer Protection', sub: 'Full refund guaranteed', color: '#8b5cf6' },
];

const STAGGER = {
  breadcrumb: 0,
  image: 0.1,
  category: 0.2,
  title: 0.3,
  rating: 0.4,
  price: 0.5,
  seller: 0.6,
  selectors: 0.7,
  addButton: 0.8,
  trust: 0.9,
  tabs: 1,
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useBuyerCart((s) => s.addItem);
  const addRecent = useRecentlyViewed((s) => s.addProduct);
  const recentItems = useRecentlyViewed((s) => s.items);
  const addToCartRef = useRef(null);
  const addToCartInView = useInView(addToCartRef, { margin: '-80px', amount: 0.1 });
  const [showStickyBar, setShowStickyBar] = useState(false);

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [addState, setAddState] = useState('idle'); // idle | adding | added
  const [lightbox, setLightbox] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [quantityShake, setQuantityShake] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [expandedQa, setExpandedQa] = useState(null);
  const [relatedOffset, setRelatedOffset] = useState(0);

  useEffect(() => {
    setShowStickyBar(!addToCartInView);
  }, [addToCartInView]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    setError(null);
    setActiveImage(0);
    productAPI.getProductById(id)
      .then((data) => {
        const p = data.product || data;
        setProduct(p);
        addRecent(p);
        productAPI.trackView(id).catch(() => null);
      })
      .catch((err) => {
        console.error(err);
        setError('Product not found.');
      })
      .finally(() => setLoading(false));

    productAPI.getProducts({ limit: 8 })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.products || data.items || [];
        setRelated(items.filter((p) => (p._id || p.id) !== id).slice(0, 8));
      })
      .catch(() => {});
  }, [id]);

  const handleAddToCart = () => {
    if (!product || addState !== 'idle') return;
    setAddState('adding');
    addItem(product, quantity);
    setTimeout(() => setAddState('added'), 500);
    setTimeout(() => setAddState('idle'), 2500);
  };

  const handleShare = async (method) => {
    const url = encodeURIComponent(window.location.href);
    const name = product?.title || product?.name || 'Product';
    const text = encodeURIComponent(`Check out "${name}" on Reaglex!`);
    if (method === 'copy') {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } else if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${text}%20${url}`, '_blank', 'noopener,noreferrer');
    } else if (method === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
    } else if (method === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
    }
    setShowSharePanel(false);
  };

  const decrementQty = () => {
    if (quantity <= 1) {
      setQuantityShake(true);
      setTimeout(() => setQuantityShake(false), 400);
      return;
    }
    setQuantity((q) => q - 1);
  };

  if (loading)
    return (
      <BuyerLayout>
        <div
          className="min-h-[70vh] flex items-center justify-center"
          style={{ background: 'var(--bg-page)' }}
        >
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            className="w-14 h-14 rounded-full border-4 border-orange-200 border-t-orange-500" />
        </div>
      </BuyerLayout>
    );

  if (error)
    return (
      <BuyerLayout>
        <div
          className="flex flex-col items-center justify-center min-h-[70vh] gap-4"
          style={{ background: 'var(--bg-page)' }}
        >
          <span className="text-5xl">😕</span>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {error}
          </p>
          <button onClick={() => navigate(-1)} className="px-6 py-3 rounded-2xl text-white font-semibold" style={{ background: PRIMARY }}>
            Go Back
          </button>
        </div>
      </BuyerLayout>
    );

  const images = (product.images?.length ? product.images : [product.image]).filter(Boolean);
  const price = product.price || 0;
  const oldPrice = product.compareAtPrice || product.originalPrice || null;
  const discount = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const rating = Number(product.averageRating || product.rating || 4.8);
  const reviewsCount = product.totalReviews || product.reviewCount || 124;
  const stock = product.stockQuantity ?? product.stock ?? 10;
  const seller = product.seller?.storeName || product.sellerName || 'Premium Store';
  const category = product.category || 'Clothing';
  const title = product.title || product.name || 'Product';

  const productId = product?._id || id;
  const canonicalUrl = `${window.location.origin}/products/${productId}`;

  const primaryImage = images?.[0] ? resolveImage(images[0]) : undefined;

  useSeo({
    title: product?.seoTitle || `${title} | Reaglex`,
    description: product?.seoDescription || product?.description || `Buy ${title} at REAGLE-X.`,
    keywords: product?.seoKeywords,
    canonicalUrl,
    openGraph: {
      title: product?.seoTitle || `${title} | Reaglex`,
      description: product?.seoDescription || product?.description || `Buy ${title} at REAGLE-X.`,
      image: primaryImage,
    },
    twitter: {
      card: 'summary_large_image',
      title: product?.seoTitle || `${title} | Reaglex`,
      description: product?.seoDescription || product?.description || `Buy ${title} at REAGLE-X.`,
      image: primaryImage,
    },
    noIndex: false,
    jsonLdScriptId: 'reaglex-jsonld-product',
    jsonLd: product
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: title,
          description: product?.seoDescription || product?.description || `Buy ${title} at REAGLE-X.`,
          sku: product?.sku || product?._id || id,
          category,
          image: (images || []).slice(0, 6).map((img) => resolveImage(img)).filter(Boolean),
          brand: { '@type': 'Brand', name: product?.brand || 'Reaglex' },
          offers: {
            '@type': 'Offer',
            price: Number(price) || 0,
            priceCurrency: product?.currency || 'USD',
            availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: canonicalUrl,
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(rating) || 0,
            reviewCount: Number(reviewsCount) || 0,
          },
        }
      : null,
  });

  const installment = (price / 3).toFixed(2);
  const reviewBars = [
    { stars: 5, pct: 78 },
    { stars: 4, pct: 15 },
    { stars: 3, pct: 5 },
    { stars: 2, pct: 2 },
    { stars: 1, pct: 0 },
  ];
  const qaList = [
    { q: 'What material is this made of?', a: 'Premium cotton blend for comfort and durability.' },
    { q: 'How do I choose the right size?', a: 'Refer to our size guide. We recommend sizing up for a relaxed fit.' },
  ];
  const specs = [
    { prop: 'Brand', value: product.brand || 'Reaglex' },
    { prop: 'Model', value: product.sku || 'N/A' },
    { prop: 'Category', value: category },
    { prop: 'Material', value: product.material || 'Cotton blend' },
    { prop: 'Sizes Available', value: SIZES.join(', ') },
    { prop: 'Weight', value: product.weight || '200g' },
    { prop: 'Origin', value: product.origin || 'Imported' },
    { prop: 'SKU', value: product.sku || product._id || id },
  ];

  const visibleRelated = related.slice(relatedOffset, relatedOffset + 4);
  const recentFiltered = recentItems.filter((p) => (p._id || p.id) !== id).slice(0, 6);

  return (
    <BuyerLayout>
      <div
        className="min-h-screen w-full px-4 sm:px-6 lg:px-10 xl:px-16 pt-6 pb-24"
        style={{ background: 'var(--bg-page)', fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        {/* ═══ TIER 1: Breadcrumb + Back to Results ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          className="flex flex-wrap items-center justify-between gap-3 mb-6"
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Link to="/" className="hover:text-orange-500 transition-colors duration-200 border-b border-transparent hover:border-orange-500">Home</Link>
            <span>›</span>
            <Link to="/search" className="hover:text-orange-500 transition-colors duration-200 border-b border-transparent hover:border-orange-500">{category}</Link>
            <span>›</span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </span>
          </div>
          <Link
            to="/search"
            className="text-sm font-medium flex items-center gap-1 hover:text-orange-500 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft className="w-4 h-4" /> Back to Results
          </Link>
        </motion.div>

        {/* ═══ Main: Image + Info ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 mb-16">
          {/* ═══ TIER 2: Image section ═══ */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: STAGGER.image, ease }}
            className="space-y-4"
          >
            <div
              className="relative rounded-2xl overflow-hidden bg-[var(--card-bg)] cursor-zoom-in product-image-wrapper"
              style={{ height: 480, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
              onClick={() => setLightbox(true)}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={resolveImage(images[activeImage])}
                  alt={title}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onError={(e) => { e.target.src = resolveImage(null); }}
                />
              </AnimatePresence>

              {/* Badges - staggered slide-in */}
              <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.3 }} className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#10b981' }}>NEW</motion.span>
              <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6, duration: 0.3 }} className="absolute top-4 left-16 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#2563eb' }}>FREE SHIP</motion.span>
              <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, duration: 0.3 }} className="absolute top-4 left-36 px-2.5 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1" style={{ background: PRIMARY }}><Star className="w-3 h-3" /> Top Rated</motion.span>
              {discount > 0 && (
                <motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }} className="absolute top-4 left-52 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#ef4444' }}>-{discount}%</motion.span>
              )}

              <button type="button" className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-[var(--card-bg)]/90 shadow flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setLightbox(true); }}>
                <ZoomIn className="w-5 h-5" style={{ color: '#374151' }} />
              </button>

              {/* Share - top right with dropdown */}
              <div className="absolute top-4 right-4 z-10">
                <motion.button
                  type="button"
                  onClick={() => setShowSharePanel(!showSharePanel)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card-bg)]/95 shadow text-sm font-medium"
                  style={{ color: '#6b7280' }}
                >
                  <Share2 className="w-4 h-4" /> Share
                </motion.button>
                <AnimatePresence>
                  {showSharePanel && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-full mt-2 py-2 rounded-xl bg-[var(--card-bg)] shadow-lg min-w-[180px] z-20">
                      <button type="button" onClick={() => handleShare('whatsapp')} className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 flex items-center gap-2">WhatsApp</button>
                      <button type="button" onClick={() => handleShare('facebook')} className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 flex items-center gap-2">Facebook</button>
                      <button type="button" onClick={() => handleShare('twitter')} className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 flex items-center gap-2">Twitter</button>
                      <button type="button" onClick={() => handleShare('copy')} className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 flex items-center gap-2">{shared ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />} {shared ? 'Copied!' : 'Copy Link'}</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Thumbnails 80x80 */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.slice(0, 5).map((img, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className="flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200"
                    style={{
                      width: 80,
                      height: 80,
                      borderColor: i === activeImage ? PRIMARY : 'transparent',
                      boxShadow: i === activeImage ? '0 4px 12px rgba(249,115,22,0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
                      scale: i === activeImage ? 1.05 : 1,
                    }}
                    whileHover={{ scale: 1.08 }}
                  >
                    <img src={resolveImage(img)} alt="" className="w-full h-full object-cover" />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ═══ TIER 3: Product info ═══ */}
          <div className="flex flex-col gap-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.category, duration: 0.4, ease }}>
              <Link to={`/search?category=${encodeURIComponent(category)}`} className="inline-block px-3 py-1.5 rounded-full text-sm font-semibold transition-transform hover:scale-105" style={{ background: '#fff7ed', color: PRIMARY }}>
                {category}
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.title, duration: 0.4, ease }} className="flex flex-wrap items-center gap-2">
              <h1
                className="font-bold leading-tight product-title"
                style={{ color: 'var(--text-primary)', fontSize: 32 }}
              >
                {title}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-green-700 bg-green-50">Verified Product ✓</span>
            </motion.div>

            {/* Rating */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.rating, duration: 0.4, ease }} className="flex flex-wrap items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.span key={i} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: STAGGER.rating + i * 0.08 }}>
                    <Star className="w-5 h-5" fill={i <= Math.round(rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" />
                  </motion.span>
                ))}
              </div>
              <span className="font-bold" style={{ color: PRIMARY }}>{rating.toFixed(1)}</span>
              <button type="button" onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm hover:underline" style={{ color: '#6b7280' }}>({reviewsCount} reviews)</button>
              <Link to="#reviews" className="text-sm font-medium hover:underline" style={{ color: PRIMARY }}>Write a Review</Link>
            </motion.div>

            {/* Price - count-up effect */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.price, duration: 0.4, ease }}>
              <div className="flex flex-wrap items-baseline gap-3">
                <PriceCountUp value={price} duration={0.8} delay={STAGGER.price} />
                {oldPrice && <span className="text-lg line-through" style={{ color: '#9ca3af' }}>${oldPrice.toFixed(2)}</span>}
                {discount > 0 && <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ background: '#ef4444' }}>-{discount}%</span>}
              </div>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>or 3 payments of ${installment}</p>
            </motion.div>

            {/* Seller card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: STAGGER.seller, duration: 0.4, ease }}
              className="p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--divider)] hover:shadow-md transition-shadow product-overview-card"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: '#7c3aed' }}>P</div>
                  <div>
                    <p className="font-bold text-sm product-overview-seller" style={{ color: '#111827' }}>{seller}</p>
                    <p className="text-xs product-overview-sub" style={{ color: '#6b7280' }}>⭐ 4.9 seller · 247 sales</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" title="Online" />
                  <span className="text-xs" style={{ color: '#6b7280' }}>Online Now</span>
                </div>
              </div>
              <Link to="/search" className="inline-block mt-2 text-sm font-semibold" style={{ color: PRIMARY }}>Visit Store →</Link>
            </motion.div>

            {/* Stock */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.seller + 0.05 }}>
              {stock < 10 && stock > 0 ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-50 text-amber-800 animate-pulse">⚠️ Only {stock} left!</span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-800">● {stock} in stock</span>
              )}
            </motion.div>

            {/* Size */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.selectors, duration: 0.4, ease }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold" style={{ color: '#374151' }}>Size</span>
                <button type="button" className="text-xs" style={{ color: '#9ca3af' }}>Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <motion.button key={s} type="button" onClick={() => setSelectedSize(s)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                    style={{ borderColor: selectedSize === s ? PRIMARY : '#e5e7eb', background: selectedSize === s ? PRIMARY : 'white', color: selectedSize === s ? 'white' : '#374151' }}>
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Color */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.selectors + 0.05 }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#374151' }}>Color: {selectedColor.name}</p>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <motion.button key={c.name} type="button" onClick={() => setSelectedColor(c)} whileHover={{ scale: 1.08 }} className="w-10 h-10 rounded-full border-2 transition-all" style={{ background: c.hex, borderColor: selectedColor.name === c.name ? PRIMARY : 'transparent', boxShadow: selectedColor.name === c.name ? '0 0 0 2px white, 0 0 0 4px ' + PRIMARY : 'none' }} title={c.name} />
                ))}
              </div>
            </motion.div>

            {/* Quantity */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.selectors + 0.1 }} className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: '#374151' }}>Quantity</span>
              <motion.div
                animate={quantityShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center rounded-xl border-2 border-[var(--divider)] overflow-hidden bg-[var(--card-bg)] quantity-control"
              >
                <button
                  type="button"
                  onClick={decrementQty}
                  className="w-12 h-12 flex items-center justify-center hover:bg-orange-50 transition-colors quantity-btn"
                  style={{ color: '#374151' }}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span
                  className="w-14 text-center font-bold text-lg quantity-value"
                  style={{ color: '#111827' }}
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))}
                  disabled={quantity >= (stock || 99)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-orange-50 transition-colors disabled:opacity-40 quantity-btn"
                  style={{ color: '#374151' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </motion.div>
            </motion.div>

            {/* Add to Cart + Wishlist */}
            <motion.div ref={addToCartRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.addButton, type: 'spring', stiffness: 300 }} className="flex gap-3">
              <motion.button
                type="button"
                onClick={handleAddToCart}
                disabled={stock === 0 || addState === 'adding'}
                className="flex-1 h-14 rounded-xl font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50"
                style={{ background: addState === 'added' ? '#10b981' : PRIMARY, boxShadow: addState === 'idle' ? '0 4px 20px rgba(249,115,22,0.35)' : 'none' }}
                whileHover={addState === 'idle' ? { scale: 1.01 } : {}}
                whileTap={{ scale: 0.97 }}
              >
                {addState === 'adding' && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {addState === 'idle' && <ShoppingBag className="w-5 h-5" />}
                {addState === 'idle' && 'Add to Cart'}
                {addState === 'adding' && 'Adding...'}
                {addState === 'added' && 'Added to Cart ✓'}
              </motion.button>
              <motion.button type="button" onClick={() => setWishlisted(!wishlisted)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-14 h-14 rounded-xl flex items-center justify-center border-2 bg-[var(--card-bg)] wishlist-btn" style={{ borderColor: wishlisted ? '#ef4444' : '#e5e7eb' }} title="Save to Wishlist">
                <Heart className="w-5 h-5" fill={wishlisted ? '#ef4444' : 'none'} stroke={wishlisted ? '#ef4444' : '#374151'} />
              </motion.button>
            </motion.div>

            {/* Buy Now - hover: slide-in orange from right */}
            <motion.button
              type="button"
              onClick={() => { addItem(product, quantity); navigate('/checkout'); }}
              className="relative w-full h-14 rounded-xl font-semibold text-white flex items-center justify-center gap-2 overflow-hidden"
              style={{ background: '#111827' }}
              whileHover="hover"
              initial="idle"
              variants={{ idle: {}, hover: {} }}
            >
              <motion.span className="absolute inset-0 z-0" style={{ background: PRIMARY }} variants={{ idle: { x: '100%' }, hover: { x: 0 } }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }} />
              <span className="relative z-10">Buy Now →</span>
            </motion.button>

            {/* ═══ TIER 4: Trust badges ═══ */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAGGER.trust, duration: 0.4, ease }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--divider)]" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              {TRUST_BADGES.map(({ icon: Icon, label, sub, color }, idx) => (
                <motion.div key={label} className="flex flex-col items-center text-center gap-1 p-2 rounded-xl hover:shadow-md transition-shadow" whileHover={{ y: -2 }}>
                  <motion.span whileHover={idx === 0 ? { x: [0, 4, 0] } : idx === 1 ? { scale: [1, 1.15, 1] } : idx === 2 ? { rotate: 180 } : { scale: [1, 1.1, 1] }} transition={{ duration: 0.4 }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </motion.span>
                  <span className="text-xs font-semibold" style={{ color: '#111827' }}>{label}</span>
                  <span className="text-[10px]" style={{ color: '#6b7280' }}>{sub}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* ═══ TIER 5: Tabs ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGGER.tabs, duration: 0.4, ease }}
          className="rounded-2xl overflow-hidden bg-[var(--card-bg)] mb-16 product-tabs"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          <div className="relative flex border-b border-[var(--divider)] product-tabs-header">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTabIndex(i)}
                className={`flex-1 py-4 text-sm font-semibold transition-colors product-tab-btn ${
                  tabIndex === i ? 'product-tab-btn--active' : ''
                }`}
                style={{ color: tabIndex === i ? PRIMARY : '#6b7280' }}
              >
                {t.id === 'reviews' ? `${t.label} (${reviewsCount})` : t.label}
              </button>
            ))}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 rounded-full product-tabs-header-indicator"
              style={{ width: '25%', background: PRIMARY }}
              animate={{ x: `${tabIndex * 100}%` }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
          <div className="p-6 min-h-[200px]">
            <AnimatePresence mode="wait">
              {tabIndex === 0 && (
                <motion.div key="desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <p className="text-sm leading-relaxed mb-4 product-desc" style={{ color: '#374151' }}>{product.description || 'No description available.'}</p>
                  <h4 className="font-bold text-sm mb-2" style={{ color: '#111827' }}>Key Features</h4>
                  <ul className="space-y-2">
                    {['Premium quality materials', 'Fast shipping', '30-day returns'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm" style={{ color: '#6b7280' }}><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
              {tabIndex === 1 && (
                <motion.div key="specs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {specs.map((row, i) => (
                        <motion.tr key={row.prop} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={i % 2 === 0 ? 'bg-[var(--bg-secondary)]' : ''}>
                          <td className="py-3 px-4 font-semibold w-1/3" style={{ color: '#374151' }}>{row.prop}</td>
                          <td className="py-3 px-4" style={{ color: '#6b7280' }}>{row.value}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
              {tabIndex === 2 && (
                <motion.div key="reviews" id="reviews-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <div className="flex flex-wrap items-center gap-6 mb-6 p-4 rounded-xl bg-[var(--bg-secondary)]">
                    <span className="text-4xl font-black" style={{ color: PRIMARY }}>{rating.toFixed(1)}</span>
                    <div>
                      <div className="flex gap-0.5 mb-1">
                        {[1,2,3,4,5].map((i) => <Star key={i} className="w-4 h-4" fill={i <= Math.round(rating) ? '#f59e0b' : 'none'} stroke="#f59e0b" />)}
                      </div>
                      <p className="text-sm" style={{ color: '#6b7280' }}>{reviewsCount} reviews</p>
                    </div>
                    <button type="button" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: PRIMARY }}>Write a Review</button>
                  </div>
                  <div className="space-y-2 mb-4">
                    {reviewBars.map((r, i) => (
                      <div key={r.stars} className="flex items-center gap-2">
                        <span className="text-xs w-8">{r.stars}★</span>
                        <motion.div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 0.3 + i * 0.1 }}>
                          <motion.div className="h-full rounded-full bg-amber-400" initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }} />
                        </motion.div>
                        <span className="text-xs w-10" style={{ color: '#6b7280' }}>{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm" style={{ color: '#6b7280' }}>Review cards placeholder. Load More Reviews button.</p>
                  </div>
                </motion.div>
              )}
              {tabIndex === 3 && (
                <motion.div key="qa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <button type="button" className="mb-4 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: PRIMARY }}>Ask a Question</button>
                  <div className="space-y-2">
                    {qaList.map((qa, i) => (
                      <div key={i} className="border rounded-xl overflow-hidden">
                        <button type="button" onClick={() => setExpandedQa(expandedQa === i ? null : i)} className="w-full px-4 py-3 text-left font-semibold text-sm flex items-center justify-between" style={{ color: '#111827' }}>
                          {qa.q}
                          <span className="text-lg">{expandedQa === i ? '−' : '+'}</span>
                        </button>
                        <AnimatePresence>
                          {expandedQa === i && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                              <p className="px-4 pb-3 text-sm" style={{ color: '#6b7280' }}>{qa.a}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ═══ TIER 6: You Might Also Like + Recently Viewed ═══ */}
        {related.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-7 rounded-full" style={{ background: PRIMARY }} />
                <h2 className="text-xl font-bold" style={{ color: '#111827' }}>You Might Also Like</h2>
              </div>
              <Link to="/search" className="text-sm font-semibold hover:underline" style={{ color: PRIMARY }}>View All →</Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {visibleRelated.map((p, idx) => (
                <motion.div key={p._id || p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1, duration: 0.4 }} className="flex-shrink-0 w-[280px]">
                  <ProductCard product={p} index={idx} compact={false} />
                </motion.div>
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {related.length > 4 && [...Array(Math.ceil(related.length / 4))].map((_, i) => (
                <button key={i} type="button" onClick={() => setRelatedOffset(i * 4)} className={`w-2.5 h-2.5 rounded-full transition ${i * 4 === relatedOffset ? 'bg-orange-500 scale-125' : 'bg-gray-300'}`} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        {recentFiltered.length > 0 && (
        <section>
            <h2
              className="text-lg font-bold mb-4 product-title"
              style={{ color: 'var(--text-primary)' }}
            >
              Recently Viewed 👁️
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recentFiltered.map((p, idx) => (
                <motion.div key={p._id || p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="flex-shrink-0 w-[200px]">
                  <ProductCard product={p} index={idx} compact />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ TIER 7: Sticky Add to Cart bar ═══ */}
        <AnimatePresence>
          {showStickyBar && product && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 py-3 bg-[var(--card-bg)] border-t-2 border-orange-500"
              style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', height: 64 }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <img src={resolveImage(images[0])} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#111827' }}>{title}</p>
                  <p className="font-bold text-sm" style={{ color: PRIMARY }}>${price.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-[var(--divider)] quantity-control">
                  <button type="button" onClick={decrementQty} className="w-9 h-9 flex items-center justify-center quantity-btn">−</button>
                  <span className="w-8 text-center font-bold text-sm quantity-value">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))} className="w-9 h-9 flex items-center justify-center quantity-btn">+</button>
                </div>
                <button type="button" onClick={handleAddToCart} disabled={stock === 0} className="h-10 px-5 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: PRIMARY }}>Add to Cart</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox with arrows */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8" onClick={() => setLightbox(false)}>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.25, ease }}
              src={resolveImage(images[activeImage])}
              alt={title}
              className="max-w-full max-h-full object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(false); }} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[var(--card-bg)]/20 flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
            {images.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i - 1 + images.length) % images.length); }} className="absolute left-4 w-12 h-12 rounded-full bg-[var(--card-bg)]/20 flex items-center justify-center text-white"><ChevronLeft className="w-6 h-6" /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i + 1) % images.length); }} className="absolute right-4 w-12 h-12 rounded-full bg-[var(--card-bg)]/20 flex items-center justify-center text-white rotate-180"><ChevronLeft className="w-6 h-6" /></button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </BuyerLayout>
  );
}

// Price count-up component
function PriceCountUp({ value, duration = 0.8, delay = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value == null) return;
    setDisplay(0);
    const end = Number(value);
    let start = 0;
    const startTime = Date.now() + delay * 1000;
    const tick = () => {
      const now = Date.now();
      if (now < startTime) {
        requestAnimationFrame(tick);
        return;
      }
      const t = Math.min((now - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 2);
      setDisplay(start + (end - start) * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration, delay]);
  return (
    <span className="font-black text-4xl product-price" style={{ color: 'var(--text-primary)' }}>
      ${display.toFixed(2)}
    </span>
  );
}
