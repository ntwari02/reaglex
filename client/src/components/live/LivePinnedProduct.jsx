import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';

export default function LivePinnedProduct({ product, onClose, onBuy }) {
  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="live-pinned-product"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {onClose && (
            <button type="button" className="live-pinned-close" onClick={onClose} aria-label="Close">
              <X size={14} />
            </button>
          )}
          {product.image && (
            <img src={product.image} alt="" className="live-pinned-img" />
          )}
          <div className="live-pinned-copy">
            <p className="live-pinned-label">Pinned</p>
            <p className="live-pinned-title">{product.title}</p>
            {product.price != null && (
              <p className="live-pinned-price">${Number(product.price).toFixed(2)}</p>
            )}
          </div>
          {product.productId && (
            <Link
              to={`/products/${product.productId}`}
              className="live-pinned-cta"
              onClick={onBuy}
            >
              <ShoppingBag size={14} />
              Shop
            </Link>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
