import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const AUTO_SLIDE_INTERVAL = 3000; // ms

function resolveImage(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
}

export default function ProductCarousel({ products = [], activeId, onSelect, compact = false }) {
  const scrollRef = useRef(null);
  const autoRef  = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Keep activeIdx in sync with parent activeId
  useEffect(() => {
    const idx = products.findIndex(
      (p) => (p._id || p.id) === activeId
    );
    if (idx !== -1) setActiveIdx(idx);
  }, [activeId, products]);

  // Scroll track horizontally to bring card[idx] into center — never touches page scroll
  const scrollCardIntoTrack = useCallback((idx) => {
    const track = scrollRef.current;
    if (!track) return;
    const card = track.children[idx];
    if (!card) return;
    const trackLeft   = track.getBoundingClientRect().left;
    const cardLeft    = card.getBoundingClientRect().left;
    const trackCenter = track.clientWidth / 2;
    const cardCenter  = card.clientWidth  / 2;
    track.scrollBy({ left: cardLeft - trackLeft - trackCenter + cardCenter, behavior: 'smooth' });
  }, []);

  const goTo = useCallback(
    (idx) => {
      const clamped = (idx + products.length) % products.length;
      setActiveIdx(clamped);
      onSelect?.(products[clamped]);
      scrollCardIntoTrack(clamped);
    },
    [products, onSelect, scrollCardIntoTrack]
  );

  // Auto-slide
  useEffect(() => {
    if (products.length < 2) return;
    autoRef.current = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % products.length;
        onSelect?.(products[next]);
        scrollCardIntoTrack(next);
        return next;
      });
    }, AUTO_SLIDE_INTERVAL);

    return () => clearInterval(autoRef.current);
  }, [products, onSelect, scrollCardIntoTrack]);

  // Pause auto-slide on user interaction then resume
  const pauseAndResume = useCallback(() => {
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % products.length;
        onSelect?.(products[next]);
        scrollCardIntoTrack(next);
        return next;
      });
    }, AUTO_SLIDE_INTERVAL);
  }, [products, onSelect, scrollCardIntoTrack]);

  if (products.length === 0) return null;

  // Sizes change based on compact mode
  const activeSize  = compact ? 52 : 88;
  const normalSize  = compact ? 44 : 76;
  const gap         = compact ? 'gap-3' : 'gap-5';
  const py          = compact ? 'py-2' : 'py-4';
  const arrowSize   = compact ? 'w-7 h-7' : 'w-9 h-9';
  const arrowOffset = compact ? '-translate-x-3 translate-x-3' : '-translate-x-4 translate-x-4';
  const fontSize    = compact ? '9px' : '10px';
  const nameWidth   = compact ? '50px' : '80px';

  return (
    <motion.div
      initial={{ opacity: 0, y: compact ? -8 : 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative"
    >
      {/* ── Left Arrow ── */}
      <motion.button
        whileHover={{ scale: 1.1, x: -2 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { goTo(activeIdx - 1); pauseAndResume(); }}
        className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 ${arrowSize} rounded-full flex items-center justify-center`}
        style={{ background: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
      >
        <ChevronLeft className={compact ? 'w-3 h-3' : 'w-4 h-4'} style={{ color: '#1a1a1a' }} />
      </motion.button>

      {/* ── Cards Track ── */}
      <div
        ref={scrollRef}
        className={`flex items-end ${gap} overflow-x-auto px-6 ${py}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product, idx) => {
          const id = product._id || product.id;
          const isActive = idx === activeIdx;
          const imgSrc = resolveImage(product.images?.[0] || product.image);
          const name = product.title || product.name || '';
          const cardSize = isActive ? activeSize : normalSize;
          const radius = compact ? 14 : 20;

          return (
            <motion.button
              key={id || idx}
              initial={{ opacity: 0, y: 20, borderRadius: 8 }}
              animate={{
                opacity: 1,
                y: isActive ? (compact ? -4 : -8) : 0,
                borderRadius: radius,
                scale: isActive ? 1.08 : 1,
              }}
              transition={{
                opacity:      { duration: 0.4, delay: idx * 0.05 },
                borderRadius: { duration: 0.5, delay: idx * 0.04, ease: 'easeOut' },
                y:            { duration: 0.35, ease: 'easeOut' },
                scale:        { duration: 0.35, ease: 'easeOut' },
              }}
              whileHover={!isActive ? { y: compact ? -3 : -6, scale: 1.04 } : {}}
              whileTap={{ scale: 0.96 }}
              onClick={() => { goTo(idx); pauseAndResume(); }}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 focus:outline-none"
              style={{ cursor: 'pointer' }}
            >
              {/* Individual floating card */}
              <motion.div
                animate={{
                  boxShadow: isActive
                    ? `0 0 0 2.5px #ff8c42, 0 ${compact ? 6 : 12}px ${compact ? 16 : 32}px rgba(255,140,66,0.3)`
                    : `0 ${compact ? 4 : 8}px ${compact ? 12 : 24}px rgba(0,0,0,0.09)`,
                }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
                style={{
                  width: cardSize,
                  height: cardSize,
                  borderRadius: radius,
                  border: `2px solid ${isActive ? '#ff8c42' : 'transparent'}`,
                  background: 'white',
                  transition: 'width 0.3s ease, height 0.3s ease',
                  flexShrink: 0,
                }}
              >
                <img
                  src={imgSrc}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80';
                  }}
                />
              </motion.div>

              {/* Name label */}
              <span
                className="text-center font-medium leading-tight transition-colors duration-200"
                style={{
                  color: isActive ? '#ff8c42' : '#6b7280',
                  fontSize: fontSize,
                  maxWidth: nameWidth,
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Right Arrow ── */}
      <motion.button
        whileHover={{ scale: 1.1, x: 2 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { goTo(activeIdx + 1); pauseAndResume(); }}
        className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 ${arrowSize} rounded-full flex items-center justify-center`}
        style={{ background: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
      >
        <ChevronRight className={compact ? 'w-3 h-3' : 'w-4 h-4'} style={{ color: '#1a1a1a' }} />
      </motion.button>

      {/* Dot indicators — only in full mode */}
      {!compact && (
        <div className="flex justify-center gap-1.5 mt-3">
          {products.map((_, idx) => (
            <motion.button
              key={idx}
              onClick={() => { goTo(idx); pauseAndResume(); }}
              animate={{
                width: idx === activeIdx ? 20 : 6,
                background: idx === activeIdx ? '#ff8c42' : '#d1d5db',
              }}
              transition={{ duration: 0.3 }}
              className="h-1.5 rounded-full focus:outline-none"
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
