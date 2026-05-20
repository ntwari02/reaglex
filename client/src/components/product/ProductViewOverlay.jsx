import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Heart,
  Play,
  RefreshCw,
  Share2,
  Shield,
  ShoppingBag,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { productKeys } from '../../hooks/queries/productKeys';
import { productAPI } from '../../services/api';
import { useProductOverlay } from '../../stores/productOverlayStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useRecentlyViewed } from '../../stores/recentlyViewedStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useAuthStore } from '../../stores/authStore';
import { productImageLayoutId } from '../../motion/presets';
import { buildProductMediaList, prefetchMediaUrl } from '../../lib/productMedia';
import { resolveProductImage, productDisplayName } from '../home/mobile/productUtils';
import LazyOverlaySection from './overlay/LazyOverlaySection';
import '../../styles/product-overlay.css';

const OPEN_MS = 0.22;
const CLOSE_MS = 0.18;
const EASE = [0.22, 1, 0.36, 1];

const sheetMotion = {
  initial: { y: 40, opacity: 0, scale: 0.98 },
  animate: { y: 0, opacity: 1, scale: 1 },
  exit: { y: 56, opacity: 0, scale: 0.98 },
  transition: { duration: OPEN_MS, ease: EASE },
};

const exitTransition = { duration: CLOSE_MS, ease: EASE };

function Stars({ rating, size = 12 }) {
  const r = Math.round(rating);
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= r ? '#f59e0b' : 'none'}
          stroke={i <= r ? '#f59e0b' : 'rgba(255,255,255,0.25)'}
        />
      ))}
    </span>
  );
}

function OverlayRecommendedRail({ products, onPick }) {
  const currencyPricing = useCurrencyPricing();
  if (!products?.length) return null;

  return (
    <div className="pvo-rail">
      {products.map((p) => {
        const id = p._id || p.id;
        const img = resolveProductImage(p);
        const name = productDisplayName(p);
        const price = p.price || 0;
        return (
          <button
            key={id}
            type="button"
            className="pvo-rail-card"
            onClick={() => onPick(p)}
          >
            <img src={img} alt="" loading="lazy" decoding="async" />
            <h4>{name}</h4>
            <p>{currencyPricing.formatLocalWithUsd(price)}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function ProductViewOverlay() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const currencyPricing = useCurrencyPricing();
  const user = useAuthStore((s) => s.user);
  const addItem = useBuyerCart((s) => s.addItem);
  const addRecent = useRecentlyViewed((s) => s.addProduct);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);

  const product = useProductOverlay((s) => s.product);
  const isOpen = useProductOverlay((s) => s.isOpen);
  const contentKey = useProductOverlay((s) => s.contentKey);
  const close = useProductOverlay((s) => s.close);
  const clearProduct = useProductOverlay((s) => s.clearProduct);
  const switchProduct = useProductOverlay((s) => s.switchProduct);

  const [activeMedia, setActiveMedia] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [hqReady, setHqReady] = useState(true);
  const thumbStripRef = useRef(null);

  const slug = product?.slug?.trim?.() || '';
  const id = String(product?._id || product?.id || '').trim();

  const productQueryKey = slug ? productKeys.detailBySlug(slug) : productKeys.detailById(id);

  const { data: fetched } = useQuery({
    queryKey: productQueryKey,
    queryFn: async () => {
      const data = slug
        ? await productAPI.getProductBySlug(slug)
        : await productAPI.getProductById(id);
      return data?.product || data;
    },
    enabled: isOpen && Boolean(slug || id),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev ?? product ?? undefined,
  });

  const display = fetched || product;
  const mediaList = useMemo(() => buildProductMediaList(display), [display]);
  const layoutId = productImageLayoutId(display);

  const title = productDisplayName(display);
  const price = Number(display?.price || 0);
  const oldPrice =
    display?.compareAtPrice || display?.originalPrice || display?.compare_at_price || null;
  const discount =
    oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const stock = display?.stockQuantity ?? display?.stock ?? 10;
  const inStock = stock > 0;
  const rating = Number(display?.ratingAverage || display?.averageRating || display?.rating || 4.8);
  const reviewsCount = Number(display?.reviewCount || display?.totalReviews || 0);
  const seller =
    display?.seller?.storeName || display?.sellerName || display?.shopName || 'Pixelplex Studio';
  const sellerInitials = seller.slice(0, 2).toUpperCase();
  const description =
    (display?.description || '').trim() ||
    'High quality product — fast shipping, secure checkout, and easy returns on Reaglex.';
  const productIdStr = String(display?._id || display?.id || '');

  const relatedQuery = useQuery({
    queryKey: productKeys.related(productIdStr),
    queryFn: async () => {
      const data = await productAPI.getProducts({ limit: 12 });
      const items = Array.isArray(data) ? data : data?.products || data?.items || [];
      return items.filter((p) => String(p._id || p.id) !== productIdStr).slice(0, 8);
    },
    enabled: isOpen && Boolean(productIdStr),
    staleTime: 3 * 60 * 1000,
  });

  const related = relatedQuery.data || [];

  const activeItem = mediaList[activeMedia] || mediaList[0];
  const heroSrc = activeItem?.url || resolveProductImage(display);

  useEffect(() => {
    if (!isOpen) return undefined;
    setActiveMedia(0);
    setDescOpen(false);
    setThumbProgress(0);
  }, [contentKey, isOpen]);

  useEffect(() => {
    if (!heroSrc) return undefined;
    setHqReady(true);
    prefetchMediaUrl(heroSrc);
    const next = mediaList[activeMedia + 1];
    if (next?.url) prefetchMediaUrl(next.url);
  }, [heroSrc, activeMedia, mediaList]);

  const updateThumbProgress = useCallback(() => {
    const el = thumbStripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setThumbProgress(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    const el = thumbStripRef.current;
    if (!el) return undefined;
    updateThumbProgress();
    el.addEventListener('scroll', updateThumbProgress, { passive: true });
    return () => el.removeEventListener('scroll', updateThumbProgress);
  }, [mediaList.length, updateThumbProgress, isOpen]);

  useEffect(() => {
    if (!isOpen || !isMobile) return undefined;

    document.documentElement.classList.add('rx-layer-open');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.documentElement.classList.remove('rx-layer-open');
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, isMobile, close]);

  useEffect(() => {
    if (!isOpen || !display) return;
    addRecent(display);
    const rid = String(display._id || display.id || '');
    if (rid) {
      productAPI.trackView(rid).catch(() => null);
    }
  }, [isOpen, display, addRecent]);

  const handleClose = useCallback(() => close(), [close]);

  const handleAddToCart = useCallback(() => {
    if (!display || stock <= 0) return;
    addItem(display, 1);
    handleClose();
  }, [addItem, display, stock, handleClose]);

  const handleBuyNow = useCallback(() => {
    if (!display || stock <= 0) return;
    addItem(display, 1);
    navigate('/checkout');
    handleClose();
  }, [addItem, display, stock, navigate, handleClose]);

  const toggleWishlist = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (!display) return;
      addToWishlist(user?.id, { ...display, id: productIdStr });
    },
    [addToWishlist, display, productIdStr, user?.id],
  );

  const wishlisted = isInWishlist(productIdStr);

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* ignore */
    }
  }, [title]);

  const pickRelated = useCallback(
    (p) => {
      switchProduct(p);
      const root = document.querySelector('.pvo-scroll');
      root?.scrollTo?.({ top: 0, behavior: 'smooth' });
    },
    [switchProduct],
  );

  if (!isMobile) return null;

  return (
    <AnimatePresence onExitComplete={clearProduct}>
      {isOpen && product && (
        <div className="pvo-root" role="presentation">
          <motion.button
            type="button"
            className="pvo-backdrop"
            aria-label="Close product view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: OPEN_MS, ease: EASE }}
            onClick={handleClose}
          />

          <motion.div
            className="pvo-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            {...sheetMotion}
            exit={{ ...sheetMotion.exit, transition: exitTransition }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) handleClose();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pvo-handle" aria-hidden />

            <div className="pvo-scroll">
              <motion.div
                key={`media-${contentKey}`}
                className="pvo-media-zone"
                initial={{ opacity: 0.85 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, ease: EASE }}
              >
                <div className="pvo-hero">
                  <AnimatePresence mode="sync">
                    <motion.div
                      key={`hero-${activeMedia}-${contentKey}`}
                      className="pvo-hero-media"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                    >
                      {activeItem?.type === 'video' ? (
                        <video
                          src={heroSrc}
                          poster={activeItem.thumb}
                          controls
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <motion.img
                          layoutId={activeMedia === 0 ? layoutId : undefined}
                          layout={activeMedia === 0}
                          src={heroSrc}
                          alt=""
                          className="h-full w-full object-cover"
                          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                          onLoad={() => setHqReady(true)}
                        />
                      )}
                      {!hqReady && (
                        <motion.div
                          className="pvo-hero-fade"
                          initial={{ opacity: 0.4 }}
                          animate={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <button
                    type="button"
                    className="pvo-float-btn pvo-float-btn--tl"
                    aria-label="Close"
                    onClick={handleClose}
                  >
                    <X size={20} />
                  </button>

                  <div className="pvo-float-group">
                    <button
                      type="button"
                      className="pvo-float-btn"
                      aria-label={wishlisted ? 'Remove from favorites' : 'Add to favorites'}
                      onClick={toggleWishlist}
                    >
                      <Heart
                        size={18}
                        fill={wishlisted ? '#ff6a00' : 'none'}
                        stroke={wishlisted ? '#ff6a00' : 'currentColor'}
                      />
                    </button>
                    <button type="button" className="pvo-float-btn" aria-label="Share" onClick={handleShare}>
                      <Share2 size={18} />
                    </button>
                  </div>

                  {mediaList.length > 1 && (
                    <span className="pvo-media-badge">
                      {activeMedia + 1}/{mediaList.length}
                    </span>
                  )}
                </div>

                {mediaList.length > 1 && (
                  <>
                    <div ref={thumbStripRef} className="pvo-thumb-strip">
                      {mediaList.map((item, idx) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`pvo-thumb${idx === activeMedia ? ' pvo-thumb--active' : ''}${
                            item.type === 'video' ? ' pvo-thumb--video' : ''
                          }`}
                          onClick={() => setActiveMedia(idx)}
                        >
                          <img src={item.thumb} alt="" loading="lazy" decoding="async" />
                          {item.type === 'video' && (
                            <>
                              <span className="pvo-thumb-play">
                                <Play size={18} fill="white" />
                              </span>
                              {item.duration && (
                                <span className="pvo-thumb-dur">{item.duration}</span>
                              )}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="pvo-scroll-progress" aria-hidden>
                      <div
                        className="pvo-scroll-progress__fill"
                        style={{
                          transform: `scaleX(${Math.max(thumbProgress, 0.08)})`,
                        }}
                      />
                    </div>
                  </>
                )}
              </motion.div>

              <motion.div
                key={`body-${contentKey}`}
                className="pvo-body"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: 0.06, ease: EASE }}
              >
                <div className="pvo-title-row">
                  <h1 className="pvo-title">{title}</h1>
                  <span className="pvo-stock">
                    <span className="pvo-stock-dot" style={{ background: inStock ? '#22c55e' : '#ef4444' }} />
                    {inStock ? 'In stock' : 'Out of stock'}
                  </span>
                </div>

                <div className="pvo-price-row">
                  <span className="pvo-price">{currencyPricing.formatLocalWithUsd(price)}</span>
                  {oldPrice && oldPrice > price && (
                    <span className="pvo-price-old">{currencyPricing.formatLocalWithUsd(oldPrice)}</span>
                  )}
                  {discount > 0 && <span className="pvo-discount">-{discount}%</span>}
                </div>

                <div className="pvo-features">
                  {[
                    { icon: Shield, title: 'Secure Payment', desc: 'Encrypted checkout' },
                    { icon: Truck, title: 'Fast Delivery', desc: '2–5 business days' },
                    { icon: RefreshCw, title: 'Easy Returns', desc: '7-day policy' },
                  ].map(({ icon: Icon, title: ft, desc }) => (
                    <div key={ft} className="pvo-feature-card">
                      <Icon size={16} />
                      <div className="pvo-feature-title">{ft}</div>
                      <div className="pvo-feature-desc">{desc}</div>
                    </div>
                  ))}
                </div>

                <div className="pvo-seller">
                  <div className="pvo-seller-avatar">
                    {sellerInitials}
                    <span className="pvo-seller-online" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="pvo-seller-name">
                      {seller}
                      <BadgeCheck size={14} style={{ color: '#ff6a00' }} />
                    </div>
                    <div className="pvo-seller-meta">
                      <Stars rating={rating} />
                      <span>
                        {' '}
                        {rating.toFixed(1)}
                        {reviewsCount ? ` (${reviewsCount} reviews)` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="pvo-seller-link">
                    View Store <ChevronRight size={14} className="inline" />
                  </span>
                </div>

                <div className="pvo-desc">
                  <button
                    type="button"
                    className="pvo-desc-toggle"
                    onClick={() => setDescOpen((v) => !v)}
                    aria-expanded={descOpen}
                  >
                    Description
                    <motion.span animate={{ rotate: descOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={18} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {descOpen && (
                      <motion.div
                        className="pvo-desc-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: EASE }}
                      >
                        <p className="pvo-desc-text">{description}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <LazyOverlaySection className="pvo-section" minHeight={160}>
                  <h2 className="pvo-section-title">Customer Reviews</h2>
                  <div className="pvo-review-card">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black" style={{ color: '#ff6a00' }}>
                        {rating.toFixed(1)}
                      </span>
                      <div>
                        <Stars rating={rating} size={14} />
                        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {reviewsCount ? `${reviewsCount} verified reviews` : 'Be the first to review'}
                        </p>
                      </div>
                    </div>
                  </div>
                </LazyOverlaySection>

                <LazyOverlaySection className="pvo-section" minHeight={200}>
                  <h2 className="pvo-section-title">You May Also Like</h2>
                  <OverlayRecommendedRail products={related} onPick={pickRelated} />
                </LazyOverlaySection>

                <LazyOverlaySection className="pvo-section" minHeight={200}>
                  <h2 className="pvo-section-title">Similar Products</h2>
                  <OverlayRecommendedRail products={related.slice(0, 6)} onPick={pickRelated} />
                </LazyOverlaySection>
              </motion.div>
            </div>

            <div className="pvo-dock-wrap">
              <div className="pvo-dock">
                <button
                  type="button"
                  className="pvo-btn-cart"
                  disabled={!inStock}
                  onClick={handleAddToCart}
                >
                  <ShoppingBag size={18} />
                  Add to Cart
                </button>
                <button
                  type="button"
                  className="pvo-btn-buy"
                  disabled={!inStock}
                  onClick={handleBuyNow}
                >
                  Buy Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
