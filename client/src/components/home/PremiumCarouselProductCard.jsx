import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star, ShoppingBag, Box, Scan } from 'lucide-react';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useAuthStore } from '../../stores/authStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useMotionUi } from '../../stores/motionUiStore';
import { SERVER_URL } from '../../lib/config';
import { buyerProductPath } from '../../lib/productUrl';

function resolveImage(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=85';
  let v = src;
  if (Array.isArray(v)) v = v[0];
  if (typeof v === 'object') v = v?.url || v?.src || v?.path;
  if (!v || typeof v !== 'string') return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=85';
  return v.startsWith('http') ? v : `${SERVER_URL}${v}`;
}

export default function PremiumCarouselProductCard({ product, isActive = false, onQuickAdd }) {
  const navigate = useNavigate();
  const addItem = useBuyerCart((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const openAr = useMotionUi((s) => s.openAr);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const currencyPricing = useCurrencyPricing();
  const [added, setAdded] = useState(false);

  const id = product._id || product.id;
  const wishlistProduct = { ...product, id };
  const wishlisted = isInWishlist(String(id));
  const name = product.title || product.name || 'Product';
  const category = product.category || product.subcategory || 'Essentials';
  const price = product.price || 0;
  const rating = Number(product.averageRating || product.rating || 4.8);
  const reviews = product.totalReviews || product.reviewCount || 0;
  const rounded = Math.min(5, Math.max(0, Math.round(rating)));
  const primary = Array.isArray(product.images)
    ? (product.images.find((img) => img?.is_primary) || product.images[0])
    : product.images?.[0];
  const imgSrc = resolveImage(primary || product.image || product.thumbnail);
  const stock = product.stockQuantity ?? product.stock ?? 10;

  const openProduct = () => navigate(buyerProductPath(product));

  const handleAdd = (e) => {
    e.stopPropagation();
    if (stock <= 0) return;
    addItem(product, 1);
    setAdded(true);
    onQuickAdd?.();
    const rect = e.currentTarget.getBoundingClientRect();
    triggerFlyToCart({
      src: imgSrc,
      from: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    });
    window.setTimeout(() => setAdded(false), 600);
  };

  return (
    <motion.article
      className="premium-carousel-card-inner flex h-full flex-col overflow-hidden rounded-[24px] cursor-pointer"
      onClick={openProduct}
      animate={{
        scale: isActive ? 1 : 0.96,
        opacity: isActive ? 1 : 0.82,
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${isActive ? 'color-mix(in srgb, var(--brand-primary) 35%, var(--border-card))' : 'var(--border-card)'}`,
        boxShadow: isActive
          ? '0 22px 52px color-mix(in srgb, var(--brand-primary) 22%, transparent), var(--shadow-card)'
          : 'var(--shadow-sm)',
      }}
    >
      <div className="relative mx-3 mt-3 overflow-hidden rounded-[20px]" style={{ aspectRatio: '1 / 1.02', background: 'var(--bg-tertiary)' }}>
        <img src={imgSrc} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />

        <span
          className="absolute left-2.5 top-2.5 rounded-full px-2 py-1 text-[10px] font-bold tracking-wide text-white"
          style={{ background: 'rgba(17,17,17,0.72)', backdropFilter: 'blur(8px)' }}
        >
          360°
        </span>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            addToWishlist(user?.id, wishlistProduct);
          }}
          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
            border: '1px solid color-mix(in srgb, var(--border-card) 70%, transparent)',
            boxShadow: 'var(--shadow-xs)',
          }}
          aria-label="Wishlist"
        >
          <Heart
            size={16}
            fill={wishlisted ? 'var(--brand-primary)' : 'none'}
            stroke={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
          />
        </motion.button>

        <div className="absolute bottom-2.5 left-2.5 right-14 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openAr(product);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold text-white"
            style={{ background: 'rgba(17,17,17,0.65)', backdropFilter: 'blur(10px)' }}
          >
            <Box size={12} /> AR Try
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openAr(product);
            }}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-card)',
            }}
          >
            <Scan size={12} /> View in room
          </button>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={handleAdd}
          disabled={stock <= 0}
          className="absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full disabled:opacity-40"
          style={{
            background: added ? 'var(--badge-success-text)' : 'var(--brand-primary)',
            color: '#fff',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--brand-primary) 45%, transparent)',
          }}
          aria-label="Add to cart"
        >
          <ShoppingBag size={18} strokeWidth={1.85} />
        </motion.button>
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-4 pt-3">
        <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {name}
        </h3>
        <p className="mt-0.5 text-[12px] capitalize" style={{ color: 'var(--text-muted)' }}>
          {category}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={12}
                className={n <= rounded ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-[var(--border-card)]'}
              />
            ))}
          </div>
          <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {rating.toFixed(1)}
          </span>
          {reviews > 0 && (
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              ({reviews})
            </span>
          )}
        </div>
        <p className="mt-2 text-[17px] font-bold tracking-tight" style={{ color: 'var(--brand-primary)' }}>
          {currencyPricing.formatLocalWithUsd(price)}
        </p>
      </div>
    </motion.article>
  );
}
