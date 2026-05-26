import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from 'react-modal-sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Truck, Star, Sparkles, X } from 'lucide-react';
import { useMotionUi } from '../../stores/motionUiStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useAuthStore } from '../../stores/authStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { buyerProductPath } from '../../lib/productUrl';
import { SERVER_URL } from '../../lib/config';
import { springSheet, EASE_OUT_EXPO } from '../../motion/presets';
import { productDisplayName } from '../home/mobile/productUtils';
import '../../styles/product-quick-preview.css';

function resolveImage(product) {
  const raw = product?.images?.[0] || product?.image || product?.thumbnail;
  if (!raw) return null;
  const v = typeof raw === 'string' ? raw : raw?.url || raw?.src;
  if (!v) return null;
  return v.startsWith('http') ? v : `${SERVER_URL}${v}`;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export default function ProductQuickPreviewSheet() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const product = useMotionUi((s) => s.quickPreviewProduct);
  const closeQuickPreview = useMotionUi((s) => s.closeQuickPreview);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const openAr = useMotionUi((s) => s.openAr);
  const addItem = useBuyerCart((s) => s.addItem);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const currencyPricing = useCurrencyPricing();
  const [size, setSize] = useState('M');
  const [adding, setAdding] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);

  const open = Boolean(product);
  const id = String(product?._id || product?.id || '');
  const name = productDisplayName(product) || 'Product';
  const price = product?.price || 0;
  const img = resolveImage(product);
  const rating = Number(product?.rating || product?.averageRating || 4.6);
  const descRaw = product?.shortDescription || product?.description;
  const desc =
    (typeof descRaw === 'string' ? descRaw.slice(0, 200) : null) ||
    'Choose a size, add to cart, or open the full page for reviews and delivery.';
  const wishlisted = isInWishlist(id);

  useEffect(() => {
    if (!open) return undefined;
    setSize('M');
    setAddedFlash(false);
    window.history.pushState({ productPreviewSheet: true }, '');
    const onPop = () => closeQuickPreview();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open, closeQuickPreview]);

  const closeSheet = useCallback(() => {
    if (window.history.state?.productPreviewSheet) {
      window.history.back();
      return;
    }
    closeQuickPreview();
  }, [closeQuickPreview]);

  const handleAdd = useCallback(() => {
    if (!product || adding) return;
    setAdding(true);
    addItem(product, 1);
    triggerFlyToCart({
      src: img,
      from: { x: window.innerWidth / 2, y: window.innerHeight * 0.55 },
    });
    setAddedFlash(true);
    window.setTimeout(() => {
      setAdding(false);
      setAddedFlash(false);
    }, 900);
  }, [addItem, adding, img, product, triggerFlyToCart]);

  return (
    <Sheet isOpen={open} onClose={closeSheet} detent="large" className="pqp-sheet">
      <Sheet.Container
        style={{
          background: 'var(--card-bg)',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          boxShadow: 'var(--shadow-lg)',
          maxHeight: 'min(92dvh, 720px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Sheet.Header>
          <div className="flex items-center justify-center pt-2 pb-1">
            <div
              className="h-1 w-10 rounded-full"
              style={{ background: 'var(--border-card)' }}
              aria-hidden
            />
          </div>
        </Sheet.Header>

        <Sheet.Content style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <AnimatePresence mode="wait">
            {product && (
              <motion.div
                key={id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="pqp-scroll">
                  <motion.button
                    type="button"
                    className="pqp-hero w-full text-left"
                    whileTap={{ scale: 0.995 }}
                    onClick={() => openAr(product)}
                    aria-label="Try in AR"
                  >
                    {img ? <img src={img} alt="" /> : null}
                    <span className="pqp-hero-badge">Quick view</span>
                    <button
                      type="button"
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--card-bg) 90%, transparent)',
                        border: '1px solid var(--border-card)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeSheet();
                      }}
                      aria-label="Close"
                    >
                      <X size={18} style={{ color: 'var(--text-primary)' }} />
                    </button>
                  </motion.button>

                  <div className="pqp-body">
                    <h2 className="pqp-title">{name}</h2>
                    <p className="pqp-price">{currencyPricing.formatLocalWithUsd(price)}</p>
                    <div className="pqp-meta-row">
                      <span className="inline-flex items-center gap-1 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        <Star size={14} className="fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                        {rating.toFixed(1)}
                      </span>
                      {product?.sellerName && (
                        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {product.sellerName}
                        </span>
                      )}
                    </div>
                    <p className="pqp-desc">{desc}</p>

                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Size
                    </p>
                    <div className="pqp-sizes">
                      {SIZES.map((s) => (
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

                    <div className="pqp-trust">
                      <Truck size={18} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                      <span>Free delivery on eligible orders · dispatch in 2–4 days</span>
                    </div>
                  </div>
                </div>

                <footer className="pqp-footer">
                  <div className="pqp-cta-row">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      transition={springSheet}
                      disabled={adding}
                      onClick={handleAdd}
                      className="pqp-cta-primary"
                    >
                      <ShoppingBag size={20} />
                      {addedFlash ? 'Added ✓' : adding ? 'Adding…' : 'Add to cart'}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      transition={springSheet}
                      className="pqp-cta-icon"
                      aria-label={wishlisted ? 'Saved' : 'Save'}
                      onClick={() => addToWishlist(user?.id, { ...product, id })}
                    >
                      <Heart
                        size={20}
                        fill={wishlisted ? 'var(--brand-primary)' : 'none'}
                        color={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
                      />
                    </motion.button>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    className="pqp-cta-secondary"
                    onClick={() => {
                      closeSheet();
                      navigate(buyerProductPath(product));
                    }}
                  >
                    <Sparkles size={16} className="inline mr-1.5 align-[-2px]" />
                    View full product page
                  </motion.button>
                </footer>
              </motion.div>
            )}
          </AnimatePresence>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={closeSheet}
        style={{
          background: 'color-mix(in srgb, var(--bg-page) 55%, rgba(0,0,0,0.52))',
          backdropFilter: 'blur(12px)',
        }}
      />
    </Sheet>
  );
}
