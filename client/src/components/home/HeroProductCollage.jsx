import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Images } from 'lucide-react';
import { getProductHeroImage, productImageAltText } from '../../lib/productImage';
import { buyerProductPath } from '../../lib/productUrl';
import { resolveProductPriceUsd } from '../../lib/resolveProductPrice';
import '../../styles/hero-product-collage.css';

const EASE = [0.22, 1, 0.36, 1];

function formatPrice(product) {
  const n = resolveProductPriceUsd(product);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `$${n.toFixed(0)}`;
}

function CollageTile({ product, featured = false, index = 0, reduceMotion, eager = false }) {
  const href = buyerProductPath(product);
  const name = String(product.title || product.name || 'Product').slice(0, 56);
  const alt = productImageAltText(product);
  const img = getProductHeroImage(product);
  const price = formatPrice(product);

  if (!img) return null;

  return (
    <motion.li
      className={`hpc-tile${featured ? ' hpc-tile--featured' : ''}${index >= 3 ? ' hpc-tile--tablet-hide' : ''}`}
      initial={reduceMotion ? false : { opacity: 0, y: featured ? 12 : 8 }}
      animate={reduceMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + index * 0.06, ease: EASE }}
    >
      <Link to={href} className="hpc-tile__link">
        <img
          src={img}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          width={featured ? 560 : 280}
          height={featured ? 700 : 350}
          className="hpc-tile__img"
        />
        <span className="hpc-tile__shine" aria-hidden />
        <span className="hpc-tile__caption">
          <span className="hpc-tile__name">{name}</span>
          {price && (
            <span className="hpc-tile__price">{price}</span>
          )}
        </span>
      </Link>
    </motion.li>
  );
}

function CollageSkeleton({ labelId }) {
  return (
    <div
      className="hpc-panel hpc-panel--loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby={labelId}
    >
      <p className="hpc-loading-msg">Loading product gallery from catalog…</p>
      <ul className="hpc-grid hpc-grid--skeleton" aria-hidden>
        <li className="hpc-tile hpc-tile--featured hpc-skeleton" />
        <li className="hpc-tile hpc-skeleton" />
        <li className="hpc-tile hpc-skeleton" />
        <li className="hpc-tile hpc-skeleton hpc-tile--tablet-hide" />
        <li className="hpc-tile hpc-skeleton hpc-tile--tablet-hide" />
      </ul>
    </div>
  );
}

/**
 * Reusable hero product mosaic — DB images only, lazy-loaded, text captions on every tile.
 */
function SlideTile({ product, index, reduceMotion }) {
  const href = buyerProductPath(product);
  const name = String(product.title || product.name || 'Product').slice(0, 40);
  const alt = productImageAltText(product);
  const img = getProductHeroImage(product);
  const price = formatPrice(product);
  if (!img) return null;

  return (
    <li className="hpc-slide-tile">
      <Link to={href} className="hpc-slide-tile__link">
        <img src={img} alt={alt} loading={index < 3 ? 'eager' : 'lazy'} decoding="async" className="hpc-slide-tile__img" />
        <span className="hpc-slide-tile__meta">
          <span className="hpc-slide-tile__name">{name}</span>
          {price && <span className="hpc-slide-tile__price">{price}</span>}
        </span>
      </Link>
    </li>
  );
}

export default function HeroProductCollage({
  products = [],
  loading = false,
  reduceMotion = false,
  label = 'HD product collection',
  className = '',
  variant = 'grid',
}) {
  const labelId = 'hpc-showcase-label';

  if (loading || products.length < 1) {
    return (
      <div className={`hpc-showcase ${className}`.trim()} aria-labelledby={labelId}>
        <p id={labelId} className="hpc-showcase-label">
          <Images size={12} strokeWidth={2.25} aria-hidden />
          {label}
        </p>
        <CollageSkeleton labelId={labelId} />
      </div>
    );
  }

  const withImages = products.filter((p) => getProductHeroImage(p));

  if (variant === 'slide' && withImages.length > 0) {
    const loop = [...withImages, ...withImages];
    return (
      <motion.div
        className={`hpc-showcase hpc-showcase--slide ${className}`.trim()}
        initial={reduceMotion ? false : { opacity: 0, x: 24 }}
        animate={reduceMotion ? false : { opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
        aria-labelledby={labelId}
      >
        <p id={labelId} className="hpc-showcase-label">
          <Images size={12} strokeWidth={2.25} aria-hidden />
          {label}
        </p>
        <div className="hpc-slide-viewport">
          <ul
            className={`hpc-slide-track${reduceMotion ? ' hpc-slide-track--paused' : ''}`}
            aria-label="Featured products from catalog"
          >
            {loop.map((p, i) => (
              <SlideTile
                key={`${String(p._id || p.id || i)}-${i}`}
                product={p}
                index={i}
                reduceMotion={reduceMotion}
              />
            ))}
          </ul>
        </div>
      </motion.div>
    );
  }

  const featured = withImages[0];
  const thumbs = withImages.slice(1, 5);

  if (!featured) {
    return (
      <div className={`hpc-showcase ${className}`.trim()} aria-labelledby={labelId}>
        <p id={labelId} className="hpc-showcase-label">
          <Images size={12} strokeWidth={2.25} aria-hidden />
          {label}
        </p>
        <CollageSkeleton labelId={labelId} />
      </div>
    );
  }

  return (
    <motion.div
      className={`hpc-showcase ${className}`.trim()}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={reduceMotion ? false : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12, ease: EASE }}
      aria-labelledby={labelId}
    >
      <p id={labelId} className="hpc-showcase-label">
        <Images size={12} strokeWidth={2.25} aria-hidden />
        {label}
      </p>
      <div className="hpc-panel">
        <ul className="hpc-grid" aria-label="Featured products from catalog">
          <CollageTile
            product={featured}
            featured
            index={0}
            reduceMotion={reduceMotion}
            eager
          />
          {thumbs.map((p, i) => (
            <CollageTile
              key={String(p._id || p.id || i)}
              product={p}
              index={i + 1}
              reduceMotion={reduceMotion}
            />
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
