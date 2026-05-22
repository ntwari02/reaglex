import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import MobileAddCta from './MobileAddCta';
import { useBuyerCart } from '../../../stores/buyerCartStore';
import { useAuthStore } from '../../../stores/authStore';
import { useWishlistStore } from '../../../stores/wishlistStore';
import { useCurrencyPricing } from '../../../hooks/useCurrencyPricing';
import { useMotionUi } from '../../../stores/motionUiStore';
import { navigateToProduct } from '../../../lib/productNavigation';
import { productDisplayName, productId, resolveProductImage } from './productUtils';

export default function CompactGridProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const addItem = useBuyerCart((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const currencyPricing = useCurrencyPricing();

  const id = productId(product);
  const name = productDisplayName(product);
  const price = product.price || 0;
  const imgSrc = resolveProductImage(product);
  const stock = product.stockQuantity ?? product.stock ?? 10;
  const wishlisted = isInWishlist(String(id));

  const flyFromCard = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    triggerFlyToCart({
      src: imgSrc,
      from: rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  }, [imgSrc, triggerFlyToCart]);

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="mob-card-surface min-w-0 overflow-hidden"
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => navigateToProduct(navigate, product)}
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
          <img src={imgSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addToWishlist(user?.id, { ...product, id });
            }}
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)' }}
            aria-label="Wishlist"
          >
            <Heart
              size={12}
              fill={wishlisted ? 'var(--brand-primary)' : 'none'}
              stroke={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
            />
          </button>
          {product.aiMeta?.badges?.freshArrival && (
            <span
              className="absolute left-1 top-1 rounded px-1 py-0.5 text-[9px] font-bold uppercase"
              style={{ background: 'var(--brand-primary)', color: '#fff' }}
            >
              New
            </span>
          )}
        </div>
        <div className="space-y-0.5 px-2 pb-2 pt-1.5">
          <h3
            className="line-clamp-2 text-[12px] font-medium leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {name}
          </h3>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[13px] font-bold leading-none" style={{ color: 'var(--brand-primary)' }}>
              {currencyPricing.formatLocalWithUsd(price)}
            </p>
            <MobileAddCta
              disabled={stock <= 0}
              onClick={(e) => {
                e.stopPropagation();
                if (stock <= 0) return;
                addItem(product, 1);
                flyFromCard();
              }}
            />
          </div>
        </div>
      </button>
    </motion.article>
  );
}
