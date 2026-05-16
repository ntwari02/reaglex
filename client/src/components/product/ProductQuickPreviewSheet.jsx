import { useNavigate } from 'react-router-dom';
import { Sheet } from 'react-modal-sheet';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Truck, Star, Sparkles } from 'lucide-react';
import { useMotionUi } from '../../stores/motionUiStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { buyerProductPath } from '../../lib/productUrl';
import { SERVER_URL } from '../../lib/config';
import { springSheet, EASE_OUT_EXPO } from '../../motion/presets';

function resolveImage(product) {
  const raw = product?.images?.[0] || product?.image || product?.thumbnail;
  if (!raw) return null;
  const v = typeof raw === 'string' ? raw : raw?.url || raw?.src;
  if (!v) return null;
  return v.startsWith('http') ? v : `${SERVER_URL}${v}`;
}

export default function ProductQuickPreviewSheet() {
  const navigate = useNavigate();
  const product = useMotionUi((s) => s.quickPreviewProduct);
  const closeQuickPreview = useMotionUi((s) => s.closeQuickPreview);
  const openAr = useMotionUi((s) => s.openAr);
  const addItem = useBuyerCart((s) => s.addItem);
  const currencyPricing = useCurrencyPricing();

  const open = Boolean(product);
  const name = product?.title || product?.name || 'Product';
  const price = product?.price || 0;
  const img = resolveImage(product);
  const rating = Number(product?.rating || product?.averageRating || 4.6);

  return (
    <Sheet isOpen={open} onClose={closeQuickPreview} detent="content-height">
      <Sheet.Container
        style={{
          background: 'var(--card-bg)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <Sheet.Header />
        <Sheet.Content style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: EASE_OUT_EXPO }}
            className="px-5 pb-2"
          >
            <motion.div
              className="mx-auto mb-4 h-1 w-10 rounded-full"
              style={{ background: 'var(--border-card)' }}
            />

            <motion.div className="flex gap-4">
              <motion.div
                className="h-[120px] w-[120px] shrink-0 overflow-hidden rounded-[20px]"
                style={{ background: 'var(--bg-tertiary)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openAr(product)}
              >
                {img && <img src={img} alt="" className="h-full w-full object-cover" />}
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                  Quick preview
                </p>
                <h3 className="mt-1 line-clamp-2 text-[17px] font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {name}
                </h3>
                <motion.div className="mt-2 flex items-center gap-1">
                  <Star size={14} className="fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {rating.toFixed(1)}
                  </span>
                </motion.div>
                <p className="mt-2 text-[18px] font-bold" style={{ color: 'var(--brand-primary)' }}>
                  {currencyPricing.formatLocalWithUsd(price)}
                </p>
              </div>
            </motion.div>

            <motion.div className="mt-4 grid grid-cols-2 gap-2">
              {['M', 'L', 'XL'].map((size) => (
                <button
                  key={size}
                  type="button"
                  className="rounded-xl border px-3 py-2.5 text-[13px] font-medium"
                  style={{
                    borderColor: size === 'L' ? 'var(--brand-primary)' : 'var(--border-card)',
                    background: size === 'L' ? 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' : 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Size {size}
                </button>
              ))}
              <button
                type="button"
                className="rounded-xl border px-3 py-2.5 text-[13px] font-medium"
                style={{ borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}
              >
                More sizes
              </button>
            </motion.div>

            <motion.div
              className="mt-4 flex items-center gap-2 rounded-2xl px-3 py-3"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}
            >
              <Truck size={16} style={{ color: 'var(--brand-primary)' }} />
              <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Free delivery over $35 · 2–4 day dispatch
              </span>
            </motion.div>

            <motion.div className="mt-5 flex gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={springSheet}
                onClick={() => {
                  addItem(product, 1);
                  closeQuickPreview();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-white"
                style={{ background: 'var(--brand-primary)', boxShadow: 'var(--shadow-cta)' }}
              >
                <ShoppingBag size={18} /> Add to cart
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                transition={springSheet}
                className="flex h-[50px] w-[50px] items-center justify-center rounded-full"
                style={{ border: '1px solid var(--border-card)', background: 'var(--card-bg)' }}
                aria-label="Save"
              >
                <Heart size={18} style={{ color: 'var(--brand-primary)' }} />
              </motion.button>
            </motion.div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[13px] font-semibold"
              style={{
                border: '1px dashed color-mix(in srgb, var(--brand-primary) 45%, var(--border-card))',
                color: 'var(--brand-primary)',
              }}
              onClick={() => {
                closeQuickPreview();
                navigate(buyerProductPath(product));
              }}
            >
              <Sparkles size={16} /> View full experience
            </motion.button>
          </motion.div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop
        onTap={closeQuickPreview}
        style={{
          background: 'color-mix(in srgb, var(--bg-page) 55%, rgba(0,0,0,0.5))',
          backdropFilter: 'blur(10px)',
        }}
      />
    </Sheet>
  );
}
