import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Scan, Sparkles, Camera, ImagePlus, ShoppingCart, Heart, Glasses, ChevronRight,
} from 'lucide-react';
import { useMotionUi } from '../../stores/motionUiStore';
import { productAPI } from '../../services/api';
import { buyerProductPath } from '../../lib/productUrl';
import { SERVER_URL } from '../../lib/config';
import { EASE_OUT_EXPO } from '../../motion/presets';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useAuthStore } from '../../stores/authStore';

const DETECTIONS = [
  { id: 'shoes', label: 'Footwear', category: 'Sports', x: '14%', y: '44%', w: '38%', h: '30%', confidence: 0.94 },
  { id: 'clothes', label: 'Apparel', category: 'Clothing', x: '52%', y: '36%', w: '32%', h: '34%', confidence: 0.89 },
  { id: 'electronics', label: 'Electronics', category: 'Electronics', x: '22%', y: '58%', w: '28%', h: '22%', confidence: 0.86 },
  { id: 'accessories', label: 'Accessories', category: 'Accessories', x: '58%', y: '52%', w: '26%', h: '24%', confidence: 0.91 },
];

function resolveImg(p) {
  const v = p?.thumbnail || p?.images?.[0];
  if (!v) return null;
  const s = typeof v === 'string' ? v : v?.url;
  return s?.startsWith('http') ? s : `${SERVER_URL}${s}`;
}

function ViewfinderCorners() {
  const arm = { position: 'absolute', width: 28, height: 28, borderColor: 'rgba(255,255,255,0.92)' };
  return (
    <>
      <span style={{ ...arm, top: '22%', left: '12%', borderTop: '2.5px solid', borderLeft: '2.5px solid', borderRadius: '4px 0 0 0' }} />
      <span style={{ ...arm, top: '22%', right: '12%', borderTop: '2.5px solid', borderRight: '2.5px solid', borderRadius: '0 4px 0 0' }} />
      <span style={{ ...arm, bottom: '28%', left: '12%', borderBottom: '2.5px solid', borderLeft: '2.5px solid', borderRadius: '0 0 0 4px' }} />
      <span style={{ ...arm, bottom: '28%', right: '12%', borderBottom: '2.5px solid', borderRight: '2.5px solid', borderRadius: '0 0 4px 0' }} />
    </>
  );
}

function FloatingMatchCard({ product, confidence, index, onOpen, onQuickAdd, onAr, onSave }) {
  const img = resolveImg(product);
  const dragX = useRef(0);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -40, right: 40 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        dragX.current = info.offset.x;
      }}
      initial={{ opacity: 0, y: 36, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: EASE_OUT_EXPO }}
      className="pointer-events-auto w-[min(92vw,320px)] shrink-0 snap-center"
      style={{
        background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid color-mix(in srgb, var(--brand-primary) 35%, rgba(255,255,255,0.12))',
        borderRadius: 20,
        boxShadow: '0 0 32px color-mix(in srgb, var(--brand-primary) 18%, transparent), 0 12px 40px rgba(0,0,0,0.35)',
      }}
    >
      <button type="button" onClick={() => onOpen(product)} className="flex w-full items-center gap-3 p-3 text-left">
        <div
          className="relative h-16 w-16 overflow-hidden rounded-2xl"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          {img && <img src={img} alt="" className="h-full w-full object-cover" />}
          <span
            className="absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
            style={{ background: 'var(--brand-primary)' }}
          >
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-white">{product.title || product.name}</p>
          <p className="text-[13px] font-bold" style={{ color: 'var(--brand-primary)' }}>
            ${Number(product.price || 0).toFixed(2)}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/50">
            <Sparkles size={10} /> AI match
          </p>
        </div>
        <ChevronRight size={18} className="text-white/40" />
      </button>
      <div className="flex gap-2 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={() => onQuickAdd(product)}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-white"
          style={{ background: 'var(--brand-primary)' }}
        >
          <ShoppingCart size={14} /> Add
        </button>
        <button
          type="button"
          onClick={() => onAr(product)}
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: 'rgba(124,58,237,0.35)', color: '#e9d5ff' }}
          aria-label="AR try-on"
        >
          <Glasses size={16} />
        </button>
        <button
          type="button"
          onClick={() => onSave(product)}
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          aria-label="Save"
        >
          <Heart size={16} />
        </button>
      </div>
    </motion.div>
  );
}

export default function VisualSearchLayer() {
  const navigate = useNavigate();
  const open = useMotionUi((s) => s.visualSearchOpen);
  const closeVisualSearch = useMotionUi((s) => s.closeVisualSearch);
  const openAr = useMotionUi((s) => s.openAr);
  const openQuickPreview = useMotionUi((s) => s.openQuickPreview);
  const addToCart = useBuyerCart((s) => s.addItem);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const user = useAuthStore((s) => s.user);

  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const [streamError, setStreamError] = useState(false);
  const [phase, setPhase] = useState('enter');
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState([]);
  const [activeDet, setActiveDet] = useState(null);
  const [confidence, setConfidence] = useState(0);

  const fetchMatches = useCallback(async (category) => {
    try {
      const data = await productAPI.getProducts({
        limit: 6,
        sort: '-rating',
        ...(category ? { category } : {}),
      });
      const list = Array.isArray(data) ? data : data?.products || data?.data || [];
      setMatches(list.slice(0, 4));
    } catch {
      setMatches([]);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setPhase('enter');
      setScanning(false);
      setMatches([]);
      setActiveDet(null);
      setConfidence(0);
      return undefined;
    }

    setPhase('camera');
    let stream;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStreamError(false);
        window.setTimeout(() => {
          setPhase('scan');
          setScanning(true);
        }, 520);
      } catch {
        setStreamError(true);
        window.setTimeout(() => {
          setPhase('scan');
          setScanning(true);
        }, 400);
      }
    };

    start();
    return () => {
      stream?.getTracks?.().forEach((t) => t.stop());
    };
  }, [open]);

  useEffect(() => {
    if (!scanning || !open) return undefined;
    const det = DETECTIONS[Math.floor(Math.random() * DETECTIONS.length)];
    const t = window.setTimeout(async () => {
      setActiveDet(det.id);
      setConfidence(det.confidence);
      await fetchMatches(det.category);
      setPhase('results');
    }, 1600);
    return () => window.clearTimeout(t);
  }, [scanning, open, fetchMatches]);

  const onSelectMatch = (p) => {
    closeVisualSearch();
    openQuickPreview(p);
    navigate(buyerProductPath(p));
  };

  const onGallery = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.play?.();
    }
    setStreamError(false);
    setScanning(true);
    setPhase('scan');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[210]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        <motion.div
          className="absolute inset-0 bg-[#050608]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {!streamError ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--brand-primary) 18%, #0f1115), #050608)',
            }}
          />
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(5,6,8,0.72) 0%, rgba(5,6,8,0.2) 38%, rgba(5,6,8,0.88) 100%)',
          }}
        />

        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: phase !== 'enter' ? 1 : 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <ViewfinderCorners />
        </motion.div>

        {scanning && (
          <motion.div
            className="pointer-events-none absolute inset-x-[12%] h-[2px] z-[2]"
            style={{ background: 'linear-gradient(90deg, transparent, var(--brand-primary), transparent)' }}
            animate={{ top: ['24%', '72%', '24%'] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {scanning &&
          DETECTIONS.map((box, i) => (
            <motion.button
              key={box.id}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: activeDet === box.id || !activeDet ? 1 : 0.35,
                scale: 1,
              }}
              transition={{ delay: 0.35 + i * 0.12, duration: 0.4, ease: EASE_OUT_EXPO }}
              onClick={() => {
                setActiveDet(box.id);
                setConfidence(box.confidence);
                fetchMatches(box.category);
              }}
              className="absolute rounded-2xl z-[3]"
              style={{
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
                border:
                  activeDet === box.id
                    ? '2px solid var(--brand-primary)'
                    : '1.5px solid rgba(255,255,255,0.55)',
                boxShadow:
                  activeDet === box.id
                    ? '0 0 28px color-mix(in srgb, var(--brand-primary) 55%, transparent)'
                    : 'none',
              }}
            >
              <span
                className="absolute -top-8 left-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                style={{ background: 'var(--brand-primary)' }}
              >
                <Scan size={11} />
                {box.label}
                <span className="opacity-75">{Math.round(box.confidence * 100)}%</span>
              </span>
            </motion.button>
          ))}

        <div className="relative z-[5] flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            <Camera size={18} style={{ color: 'var(--brand-primary)' }} />
            <span className="text-[14px] font-semibold text-white">AI Visual Search</span>
          </div>
          <button
            type="button"
            onClick={closeVisualSearch}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="relative z-[5] px-4 pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/50">
            {phase === 'results' ? 'Matches found' : 'Scanning scene'}
          </p>
          <p className="mt-1 text-[22px] font-bold text-white">
            {phase === 'results' ? 'Tap a product to explore' : 'Point at any item…'}
          </p>
          {confidence > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-[12px] font-medium"
              style={{ color: 'var(--brand-primary)' }}
            >
              AI confidence {Math.round(confidence * 100)}%
            </motion.p>
          )}
        </div>

        <motion.div
          className="absolute inset-x-0 bottom-0 z-[6] flex flex-col gap-3 pb-[max(20px,env(safe-area-inset-bottom))]"
          initial={{ y: 120 }}
          animate={{ y: phase === 'results' ? 0 : 80 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          {phase === 'results' && matches.length > 0 && (
            <motion.div
              className="flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {matches.map((p, i) => (
                <FloatingMatchCard
                  key={p._id || p.id || i}
                  product={p}
                  confidence={confidence - i * 0.04}
                  index={i}
                  onOpen={onSelectMatch}
                  onQuickAdd={(prod) => addToCart(prod, 1)}
                  onAr={(prod) => openAr(prod)}
                  onSave={(prod) => addToWishlist(user?.id, prod)}
                />
              ))}
            </motion.div>
          )}

          <div className="flex flex-col items-center gap-3 px-4">
            {phase !== 'results' && (
              <button
                type="button"
                className="h-16 w-16 rounded-full border-4 border-white/90 bg-white/10 backdrop-blur-md"
                aria-label="Capture"
                onClick={() => fetchMatches(activeDet ? DETECTIONS.find((d) => d.id === activeDet)?.category : undefined)}
              />
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)' }}
            >
              <ImagePlus size={16} /> Upload from gallery
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onGallery} />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
