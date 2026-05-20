import { motion } from 'framer-motion';
import { Star, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { openProductExperience } from '../../lib/productNavigation';
import { productImageLayoutId } from '../../motion/presets';
import { SERVER_URL } from '../../lib/config';
import { EASE_OUT_EXPO } from '../../motion/presets';

function resolveImg(src) {
  if (!src) return null;
  let v = src;
  if (Array.isArray(v)) v = v[0];
  if (typeof v === 'object') v = v?.url || v?.src;
  if (!v || typeof v !== 'string') return null;
  return v.startsWith('http') ? v : `${SERVER_URL}${v}`;
}

function formatReviews(n) {
  if (!n) return '';
  if (n >= 1000) return `(${(n / 1000).toFixed(1)}k)`;
  return `(${n})`;
}

/** Premium compact row — immersive search + full search page (mobile) */
export default function SearchResultRow({ product, index = 0, onNavigate }) {
  const navigate = useNavigate();
  const addItem = useBuyerCart((s) => s.addItem);
  const currencyPricing = useCurrencyPricing();

  const img = resolveImg(product.thumbnail || product.images?.[0]);
  const name = product.title || product.name;
  const rating = Number(product.averageRating || product.rating || 4.7);
  const reviews = product.totalReviews || product.reviewCount || 0;

  const open = () => {
    if (onNavigate) onNavigate(product);
    else openProductExperience(navigate, product);
  };

  const imageLayoutId = productImageLayoutId(product);

  return (
    <motion.button
      type="button"
      className="isearch-product"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.28, ease: EASE_OUT_EXPO }}
      whileTap={{ scale: 0.99 }}
      onClick={open}
    >
      <div className="isearch-product-img">
        {img && (
          <motion.img
            layoutId={imageLayoutId}
            layout
            src={img}
            alt=""
            loading="lazy"
            decoding="async"
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          />
        )}
      </div>
      <div className="isearch-product-info">
        <p className="isearch-product-name">{name}</p>
        <p className="isearch-product-price">
          {currencyPricing.formatLocalWithUsd(product.price || 0)}
        </p>
        <div className="isearch-product-rating">
          <Star size={12} fill="var(--brand-primary)" stroke="var(--brand-primary)" />
          <strong>{rating.toFixed(1)}</strong>
          {reviews > 0 && <span>{formatReviews(reviews)}</span>}
        </div>
      </div>
      <span
        className="isearch-add isearch-add--outline"
        role="presentation"
        onClick={(e) => {
          e.stopPropagation();
          addItem(product, 1);
        }}
      >
        <ShoppingBag size={18} strokeWidth={2} />
      </span>
    </motion.button>
  );
}
