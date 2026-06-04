import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Star } from 'lucide-react';
import MobileAddCta from './MobileAddCta';
import { useBuyerCart } from '../../../stores/buyerCartStore';
import { useCurrencyPricing } from '../../../hooks/useCurrencyPricing';
import { useMotionUi } from '../../../stores/motionUiStore';
import { navigateToProduct } from '../../../lib/productNavigation';
import { productDisplayName, resolveProductImage } from './productUtils';

const CARD_W = 156;

export default function BestSellerCarouselCard({ product, rank = 0, index = 0 }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const addItem = useBuyerCart((s) => s.addItem);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const currencyPricing = useCurrencyPricing();

  const name = productDisplayName(product);
  const price = product.price || 0;
  const rating = Number(product.averageRating || product.rating || 4.6);
  const imgSrc = resolveProductImage(product);
  const discount =
    product.discount ||
    (product.compareAtPrice
      ? Math.round((1 - price / product.compareAtPrice) * 100)
      : product.originalPrice
        ? Math.round((1 - price / product.originalPrice) * 100)
        : 0);
  const stock = product.stockQuantity ?? product.stock ?? 10;

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
      style={{ width: CARD_W }}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.34, delay: index * 0.05 }}
      whileTap={{ scale: 0.98 }}
      className="mob-card-surface overflow-hidden"
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => navigateToProduct(navigate, product)}
      >
        <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
          <img src={imgSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
          <span
            className="absolute left-1.5 top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-md px-1 text-[9px] font-bold text-white"
            style={{ background: 'var(--brand-primary)' }}
          >
            #{rank + 1}
          </span>
          {discount > 0 && (
            <span
              className="absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold"
              style={{
                background: 'var(--badge-error-bg)',
                color: 'var(--badge-error-text)',
              }}
            >
              -{discount}%
            </span>
          )}
          <span
            className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            <Award size={10} />
            Best
          </span>
        </div>
        <div className="space-y-1 px-2.5 pb-2.5 pt-2">
          <h3
            className="line-clamp-2 text-[12px] font-semibold leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {name}
          </h3>
          <div className="flex items-center gap-1">
            <Star size={10} className="fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {rating.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <p className="text-[14px] font-bold" style={{ color: 'var(--brand-primary)' }}>
              {currencyPricing.formatLocalWithUsd(price)}
            </p>
            <MobileAddCta
              variant="pill"
              label="Add"
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
