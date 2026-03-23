import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import QuantitySelector from './QuantitySelector';

import { SERVER_URL } from '../lib/config';

function resolveImage(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
}

export default function CartItem({ item, onRemove, onUpdateQty, index = 0 }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.32, delay: index * 0.06, ease: 'easeOut' }}
      className="flex items-start gap-4 py-5"
      style={{ borderBottom: '1px solid #f3f4f6' }}
    >
      {/* Thumbnail */}
      <motion.div
        whileHover={{ scale: 1.04 }}
        transition={{ duration: 0.2 }}
        className="flex-shrink-0 rounded-2xl overflow-hidden"
        style={{
          width: 72,
          height: 72,
          background: '#f9fafb',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <img
          src={resolveImage(item.image)}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
          }}
        />
      </motion.div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4
              className="font-semibold text-sm truncate"
              style={{ color: '#111827' }}
            >
              {item.title}
            </h4>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#9ca3af' }}>
              {item.seller}
            </p>
            {item.variant && (
              <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                {item.variant}
              </p>
            )}
          </div>

          {/* Remove */}
          <motion.button
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.18 }}
            onClick={() => onRemove(item.id)}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
          </motion.button>
        </div>

        {/* Qty + Price row */}
        <div className="flex items-center justify-between mt-3">
          <QuantitySelector
            quantity={item.quantity}
            onDecrease={() => onUpdateQty(item.id, item.quantity - 1)}
            onIncrease={() => onUpdateQty(item.id, item.quantity + 1)}
          />
          <span className="font-bold text-sm" style={{ color: '#111827' }}>
            ${(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
