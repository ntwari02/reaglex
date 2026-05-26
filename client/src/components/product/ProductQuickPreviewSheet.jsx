import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sheet } from 'react-modal-sheet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShoppingBag,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  Minus,
  Plus,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useMotionUi } from '../../stores/motionUiStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useAuthStore } from '../../stores/authStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { buyerProductPath } from '../../lib/productUrl';
import { productAPI } from '../../services/api';
import { productDisplayName } from '../home/mobile/productUtils';
import { springSheet, EASE_OUT_EXPO } from '../../motion/presets';
import {
  previewGalleryImages,
  stripHtml,
  productOldPrice,
  PREVIEW_SIZES,
  PREVIEW_TRUST,
  resolvePreviewImage,
} from './productPreviewUtils';
import '../../styles/product-quick-preview.css';

function PreviewRelatedCard({ item, onSelect, formatPrice }) {
  const img = resolvePreviewImage(
    item?.images?.[0] || item?.image || item?.thumbnail,
  );
  const title = productDisplayName(item);
  const price = item?.price || 0;

  return (
    <button type="button" className="pqp-related-card" onClick={() => onSelect(item)}>
      <div className="pqp-related-media">
        <img src={img} alt="" loading="lazy" />
      </div>
      <div className="pqp-related-body">
        <p className="pqp-related-title">{title}</p>
        <p className="pqp-related-price">{formatPrice(price)}</p>
      </div>
    </button>
  );
}

export default function ProductQuickPreviewSheet() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const seedProduct = useMotionUi((s) => s.quickPreviewProduct);
  const closeQuickPreview = useMotionUi((s) => s.closeQuickPreview);
  const openQuickPreview = useMotionUi((s) => s.openQuickPreview);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const openAr = useMotionUi((s) => s.openAr);
  const addItem = useBuyerCart((s) => s.addItem);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const currencyPricing = useCurrencyPricing();

  const open = Boolean(seedProduct);
  const seedId = String(seedProduct?._id || seedProduct?.id || '');
  const seedSlug = typeof seedProduct?.slug === 'string' ? seedProduct.slug.trim() : '';

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('M');
  const [descExpanded, setDescExpanded] = useState(false);
  const [addState, setAddState] = useState('idle');

  const {
    data: detail,
    isLoading: detailLoading,
  } = useQuery({
    queryKey: ['quick-preview-product', seedId, seedSlug],
    queryFn: async () => {
      const data = seedSlug
        ? await productAPI.getProductBySlug(seedSlug)
        : await productAPI.getProductById(seedId);
      return data?.product || data;
    },
    enabled: open && !!(seedId || seedSlug),
    staleTime: 60_000,
    initialData: seedProduct || undefined,
  });

  const product = detail || seedProduct;

  const { data: related = [] } = useQuery({
    queryKey: ['quick-preview-related', seedId, product?.category],
    queryFn: async () => {
      const data = await productAPI.getProducts({
        limit: 14,
        ...(product?.category ? { category: product.category } : {}),
      });
      const items = Array.isArray(data) ? data : data?.products || data?.items || [];
      const exclude = String(product?._id || product?.id || seedId);
      return items
        .filter((p) => p && String(p._id || p.id) !== exclude)
        .slice(0, 10);
    },
    enabled: open && !!product,
    staleTime: 120_000,
  });

  const gallery = useMemo(() => previewGalleryImages(product), [product]);
  const id = String(product?._id || product?.id || '');
  const name = productDisplayName(product) || 'Product';
  const price = Number(product?.price || 0);
  const oldPrice = productOldPrice(product);
  const rating = Number(product?.rating || product?.averageRating || product?.ratingAverage || 4.6);
  const reviewCount = Number(product?.reviewCount || product?.totalReviews || 0);
  const stock = Math.max(0, product?.stockQuantity ?? product?.stock ?? 99);
  const wishlisted = isInWishlist(id);
  const img = gallery[activeImage] || gallery[0];
  const description = useMemo(() => {
    const raw =
      product?.shortDescription ||
      product?.description ||
      product?.seoDescription ||
      '';
    const text = typeof raw === 'string' ? stripHtml(raw) : '';
    return (
      text ||
      'Premium quality item from a verified seller. Add to cart or buy now — open the full page for reviews, specs, and delivery details.'
    );
  }, [product]);

  const sizes = useMemo(() => {
    const fromProduct = Array.isArray(product?.sizes) ? product.sizes.filter(Boolean) : [];
    return fromProduct.length ? fromProduct.map(String) : PREVIEW_SIZES;
  }, [product?.sizes]);

  useEffect(() => {
    if (!open) return undefined;
    setActiveImage(0);
    setQuantity(1);
    setSize(sizes[2] || sizes[0] || 'M');
    setDescExpanded(false);
    setAddState('idle');
    window.history.pushState({ productPreviewSheet: true }, '');
    const onPop = () => closeQuickPreview();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open, seedId, seedSlug, closeQuickPreview, sizes]);

  useEffect(() => {
    setActiveImage((i) => Math.min(i, Math.max(0, gallery.length - 1)));
  }, [gallery.length]);

  useEffect(() => {
    if (!open || !id) return;
    productAPI.trackView(id).catch(() => null);
  }, [open, id]);

  const closeSheet = useCallback(() => {
    if (window.history.state?.productPreviewSheet) {
      window.history.back();
      return;
    }
    closeQuickPreview();
  }, [closeQuickPreview]);

  const handleAdd = useCallback(() => {
    if (!product || addState !== 'idle' || stock <= 0) return;
    setAddState('adding');
    addItem({ ...product, selectedSize: size }, quantity);
    triggerFlyToCart({
      src: img,
      from: { x: window.innerWidth / 2, y: window.innerHeight * 0.72 },
    });
    window.setTimeout(() => setAddState('added'), 450);
    window.setTimeout(() => setAddState('idle'), 2200);
  }, [addItem, addState, img, product, quantity, size, stock, triggerFlyToCart]);

  const handleBuyNow = useCallback(() => {
    if (!product || stock <= 0) return;
    addItem({ ...product, selectedSize: size }, quantity);
    closeSheet();
    navigate('/checkout');
  }, [addItem, closeSheet, navigate, product, quantity, size, stock]);

  const openFullPage = useCallback(() => {
    if (!product) return;
    closeSheet();
    window.setTimeout(() => navigate(buyerProductPath(product)), 80);
  }, [closeSheet, navigate, product]);

  const selectRelated = useCallback(
    (p) => {
      setDescExpanded(false);
      openQuickPreview(p);
    },
    [openQuickPreview],
  );

  const lineTotal = price * quantity;

  return (
    <Sheet isOpen={open} onClose={closeSheet} detent="large" className="pqp-sheet">
      <Sheet.Container
        className="pqp-shell"
        style={{
          maxHeight: 'min(94dvh, 860px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Sheet.Header>
          <div className="pqp-drag-pill" aria-hidden />
          <div className="pqp-topbar">
            <span className="pqp-topbar-title">Product view</span>
            <button type="button" className="pqp-icon-btn" onClick={closeSheet} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </Sheet.Header>

        <Sheet.Content style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <AnimatePresence mode="wait">
            {product && (
              <motion.div
                key={id || seedSlug}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="pqp-scroll">
                  <div className="pqp-gallery">
                    <div className="pqp-gallery-main">
                      {detailLoading && !gallery[0] ? (
                        <div className="pqp-skeleton h-full w-full" />
                      ) : (
                        <img src={gallery[activeImage] || gallery[0]} alt="" />
                      )}
                      {gallery.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="pqp-gallery-nav pqp-gallery-nav--prev"
                            onClick={() =>
                              setActiveImage((i) => (i - 1 + gallery.length) % gallery.length)
                            }
                            aria-label="Previous image"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            type="button"
                            className="pqp-gallery-nav pqp-gallery-nav--next"
                            onClick={() => setActiveImage((i) => (i + 1) % gallery.length)}
                            aria-label="Next image"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <div className="pqp-gallery-dots">
                            {gallery.map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className={`pqp-gallery-dot${idx === activeImage ? ' is-active' : ''}`}
                                onClick={() => setActiveImage(idx)}
                                aria-label={`Image ${idx + 1}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                      <div className="pqp-price-float">
                        <strong>{currencyPricing.formatLocalWithUsd(price)}</strong>
                        {oldPrice && oldPrice > price && (
                          <span>{currencyPricing.formatLocalWithUsd(oldPrice)}</span>
                        )}
                      </div>
                    </div>
                    {gallery.length > 1 && (
                      <div className="pqp-thumbs">
                        {gallery.map((src, idx) => (
                          <button
                            key={src + idx}
                            type="button"
                            className={`pqp-thumb${idx === activeImage ? ' is-active' : ''}`}
                            onClick={() => setActiveImage(idx)}
                          >
                            <img src={src} alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pqp-body">
                    <h2 className="pqp-title">{name}</h2>
                    <div className="pqp-meta">
                      <span className="pqp-rating-pill">
                        <Star size={13} className="fill-current" />
                        {rating.toFixed(1)}
                        {reviewCount > 0 && ` · ${reviewCount}`}
                      </span>
                      {(product?.sellerName || product?.brand) && (
                        <span className="pqp-seller">
                          {product.sellerName || product.brand}
                        </span>
                      )}
                      {stock <= 0 && (
                        <span className="pqp-seller" style={{ color: '#ef4444' }}>
                          Out of stock
                        </span>
                      )}
                    </div>

                    <p className="pqp-section-label">Quantity</p>
                    <div className="pqp-qty-row">
                      <div className="pqp-qty-control">
                        <button
                          type="button"
                          className="pqp-qty-btn"
                          disabled={quantity <= 1}
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="pqp-qty-val">{quantity}</span>
                        <button
                          type="button"
                          className="pqp-qty-btn"
                          disabled={quantity >= stock}
                          onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                          aria-label="Increase quantity"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <p className="pqp-section-label">Size</p>
                    <div className="pqp-sizes">
                      {sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`pqp-size-chip${size === s ? ' is-active' : ''}`}
                          onClick={() => setSize(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div className="pqp-trust-grid">
                      {PREVIEW_TRUST.map((t) => (
                        <div key={t.key} className="pqp-trust-card">
                          <strong>{t.label}</strong>
                          <span>{t.sub}</span>
                        </div>
                      ))}
                    </div>

                    <p className="pqp-section-label">About this item</p>
                    <p className={`pqp-desc${descExpanded ? '' : ' is-clamped'}`}>{description}</p>
                    {description.length > 160 && (
                      <button
                        type="button"
                        className="pqp-read-more"
                        onClick={() => setDescExpanded((v) => !v)}
                      >
                        {descExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>

                  {related.length > 0 && (
                    <section className="pqp-related" aria-label="You may also like">
                      <div className="pqp-related-head">
                        <h3>You may also like</h3>
                        <span>{related.length} picks</span>
                      </div>
                      <div className="pqp-related-track">
                        {related.map((p) => (
                          <PreviewRelatedCard
                            key={String(p._id || p.id)}
                            item={p}
                            onSelect={selectRelated}
                            formatPrice={(v) => currencyPricing.formatLocalWithUsd(v)}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                <footer className="pqp-footer">
                  <div className="pqp-footer-summary">
                    <span>
                      {quantity} × {size}
                    </span>
                    <strong>{currencyPricing.formatLocalWithUsd(lineTotal)}</strong>
                  </div>
                  <div className="pqp-cta-row">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      transition={springSheet}
                      className="pqp-cta-buy"
                      disabled={stock <= 0}
                      onClick={handleBuyNow}
                    >
                      <Zap size={18} />
                      Buy now
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      transition={springSheet}
                      className="pqp-cta-cart"
                      disabled={stock <= 0 || addState === 'adding'}
                      onClick={handleAdd}
                    >
                      {addState === 'adding' ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <ShoppingBag size={18} />
                      )}
                      {addState === 'added'
                        ? 'Added ✓'
                        : addState === 'adding'
                          ? 'Adding…'
                          : 'Add to cart'}
                    </motion.button>
                  </div>
                  <div className="pqp-footer-tools">
                    <button
                      type="button"
                      className="pqp-tool-btn"
                      onClick={() => addToWishlist(user?.id, { ...product, id })}
                    >
                      <Heart
                        size={16}
                        fill={wishlisted ? 'var(--brand-primary)' : 'none'}
                        color={wishlisted ? 'var(--brand-primary)' : 'currentColor'}
                      />
                      {wishlisted ? 'Saved' : 'Wishlist'}
                    </button>
                    <button type="button" className="pqp-tool-btn" onClick={openFullPage}>
                      <ExternalLink size={15} />
                      Full page
                    </button>
                    <button
                      type="button"
                      className="pqp-tool-btn pqp-tool-icon"
                      aria-label="Open AR preview"
                      onClick={() => openAr?.(product)}
                    >
                      <Sparkles size={16} />
                    </button>
                  </div>
                </footer>
              </motion.div>
            )}
          </AnimatePresence>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={closeSheet}
        style={{
          background: 'color-mix(in srgb, var(--bg-page) 40%, rgba(8, 12, 22, 0.62))',
          backdropFilter: 'blur(16px) saturate(1.2)',
        }}
      />
    </Sheet>
  );
}
