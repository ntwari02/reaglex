import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import { productAPI } from '../../services/api';
import { useBuyerCart } from '../../stores/buyerCartStore';

import { SERVER_URL } from '../lib/config';

function resolveImage(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
  const value = Array.isArray(src)
    ? src[0]
    : (typeof src === 'object'
        ? (src.url || src.secure_url || src.path || src.src || null)
        : src);
  if (!value) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
  return String(value).startsWith('http') ? String(value) : `${SERVER_URL}${String(value)}`;
}

// Pastel placeholder colors for color-variant dots
const PLACEHOLDER_COLORS = ['#c8c8c8', '#4b5563', '#6b8f5e', '#6b4b3e', '#e8dcc8'];

export default function RecommendedProducts({ excludeIds = [] }) {
  const [products, setProducts] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const addItem = useBuyerCart((s) => s.addItem);

  useEffect(() => {
    productAPI
      .getProducts({ limit: 6, page: 1 })
      .then((data) => {
        const items = Array.isArray(data)
          ? data
          : data.products || data.items || [];
        setProducts(
          items.filter((p) => !excludeIds.includes(p._id || p.id)).slice(0, 5)
        );
      })
      .catch(() => {});
  }, []);

  if (products.length === 0) return null;

  return (
    <div>
      <h3
        className="text-xs font-bold uppercase tracking-widest mb-4"
        style={{ color: '#6b7280', letterSpacing: '0.1em' }}
      >
        You might also like
      </h3>

      <div className="space-y-1">
        {products.map((product, idx) => {
          const id   = product._id || product.id;
          const name = product.title || product.name || 'Product';
          const price = product.price || 0;
          const primary = Array.isArray(product.images)
            ? (product.images.find((img) => img?.is_primary) || product.images[0])
            : product.images?.[0];
          const img  = resolveImage(primary || product.image || product.imageUrl || product.thumbnail || product.thumbnailUrl);
          const isOpen = expanded === id;

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
              whileHover={{ y: -2 }}
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'white',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                border: '1px solid #f3f4f6',
              }}
            >
              {/* Main row */}
              <div className="flex items-center gap-3 p-3">
                {/* Image */}
                <motion.div
                  whileHover={{ scale: 1.06 }}
                  className="flex-shrink-0 rounded-xl overflow-hidden"
                  style={{ width: 52, height: 52, background: '#f9fafb' }}
                >
                  <img
                    src={img}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';
                    }}
                  />
                </motion.div>

                {/* Name + colors */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#111827' }}>
                    {name}
                  </p>
                  {/* Color dots */}
                  <div className="flex gap-1 mt-1.5">
                    {PLACEHOLDER_COLORS.map((c, i) => (
                      <div
                        key={i}
                        className="w-3.5 h-3.5 rounded-full border border-white"
                        style={{
                          background: c,
                          boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Price + expand */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className="text-sm font-bold" style={{ color: '#111827' }}>
                    ${price.toFixed(2)}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setExpanded(isOpen ? null : id)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: isOpen ? '#111827' : '#f3f4f6',
                      transition: 'background 0.2s',
                    }}
                  >
                    <motion.span
                      animate={{ rotate: isOpen ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight
                        className="w-3.5 h-3.5"
                        style={{ color: isOpen ? 'white' : '#374151' }}
                      />
                    </motion.span>
                  </motion.button>
                </div>
              </div>

              {/* Expandable: size selector */}
              <motion.div
                initial={false}
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  className="px-3 pb-3"
                  style={{ borderTop: '1px solid #f3f4f6' }}
                >
                  <p className="text-xs font-semibold mt-2 mb-2" style={{ color: '#6b7280' }}>
                    Select a size
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
                      <button
                        key={s}
                        className="px-3 py-1 rounded-lg text-xs font-medium border transition-colors hover:border-gray-800 hover:text-gray-800"
                        style={{ borderColor: '#e5e7eb', color: '#374151' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { addItem(product, 1); setExpanded(null); }}
                    className="w-full py-2 rounded-xl text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                    style={{
                      background: 'linear-gradient(135deg, #ff8c42, #ff5f00)',
                      boxShadow: '0 4px 14px rgba(255,140,66,0.3)',
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add to cart
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
