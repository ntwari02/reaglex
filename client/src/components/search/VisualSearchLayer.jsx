import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scan, Sparkles } from 'lucide-react';
import { Sheet } from 'react-modal-sheet';
import { useMotionUi } from '../../stores/motionUiStore';
import { productAPI } from '../../services/api';
import { buyerProductPath } from '../../lib/productUrl';
import { SERVER_URL } from '../../lib/config';
import { EASE_OUT_EXPO } from '../../motion/presets';

const MOCK_BOXES = [
  { id: 'b1', label: 'Sneakers', x: '18%', y: '42%', w: '34%', h: '28%' },
  { id: 'b2', label: 'Watch', x: '58%', y: '38%', w: '28%', h: '22%' },
];

function resolveImg(p) {
  const v = p?.thumbnail || p?.images?.[0];
  if (!v) return null;
  const s = typeof v === 'string' ? v : v?.url;
  return s?.startsWith('http') ? s : `${SERVER_URL}${s}`;
}

export default function VisualSearchLayer() {
  const navigate = useNavigate();
  const open = useMotionUi((s) => s.visualSearchOpen);
  const closeVisualSearch = useMotionUi((s) => s.closeVisualSearch);
  const videoRef = useRef(null);
  const [streamError, setStreamError] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState([]);
  const [activeBox, setActiveBox] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setScanning(false);
      setMatches([]);
      setActiveBox(null);
      setSheetOpen(false);
      return undefined;
    }

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
        window.setTimeout(() => setScanning(true), 400);
      } catch {
        setStreamError(true);
        window.setTimeout(() => setScanning(true), 300);
      }
    };

    start();
    return () => {
      stream?.getTracks?.().forEach((t) => t.stop());
    };
  }, [open]);

  useEffect(() => {
    if (!scanning || !open) return undefined;
    const t = window.setTimeout(async () => {
      try {
        const data = await productAPI.getProducts({ limit: 4, sort: '-rating' });
        const list = Array.isArray(data) ? data : data?.products || data?.data || [];
        setMatches(list.slice(0, 4));
        setSheetOpen(true);
      } catch {
        setMatches([]);
      }
    }, 1400);
    return () => window.clearTimeout(t);
  }, [scanning, open]);

  const onSelectMatch = (p) => {
    closeVisualSearch();
    navigate(buyerProductPath(p));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[210] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[#050608]" />

          {!streamError ? (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              playsInline
              muted
            />
          ) : (
            <motion.div
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
                'linear-gradient(180deg, rgba(5,6,8,0.55) 0%, rgba(5,6,8,0.15) 40%, rgba(5,6,8,0.85) 100%)',
            }}
          />

          {scanning && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, var(--brand-primary), transparent)' }}
              animate={{ top: ['12%', '78%', '12%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          <div className="relative z-[2] flex items-center justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))]">
            <div className="flex items-center gap-2">
              <Scan size={18} style={{ color: 'var(--brand-primary)' }} />
              <span className="text-[14px] font-semibold text-white">Visual search</span>
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

          <div className="relative z-[2] px-4 pt-6">
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-white/55">
              AI object lock
            </p>
            <p className="mt-1 text-[22px] font-bold text-white">Scanning scene…</p>
          </div>

          {scanning &&
            MOCK_BOXES.map((box, i) => (
              <motion.button
                key={box.id}
                type="button"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.4, ease: EASE_OUT_EXPO }}
                onClick={() => setActiveBox(box.id)}
                className="absolute rounded-2xl"
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.w,
                  height: box.h,
                  border:
                    activeBox === box.id
                      ? '2px solid var(--brand-primary)'
                      : '1.5px solid rgba(255,255,255,0.65)',
                  boxShadow:
                    activeBox === box.id
                      ? '0 0 24px color-mix(in srgb, var(--brand-primary) 50%, transparent)'
                      : 'none',
                }}
              >
                <span
                  className="absolute -top-7 left-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  {box.label}
                </span>
              </motion.button>
            ))}

          <Sheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} detent="content-height">
            <Sheet.Container style={{ background: 'var(--card-bg)', borderRadius: '24px 24px 0 0' }}>
              <Sheet.Header />
              <Sheet.Content style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <div className="px-4 pb-4">
                  <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                    <Sparkles size={14} style={{ color: 'var(--brand-primary)' }} /> Matches
                  </p>
                  <div className="space-y-2">
                    {matches.map((p, i) => {
                      const img = resolveImg(p);
                      return (
                        <motion.button
                          key={p._id || p.id || i}
                          type="button"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          onClick={() => onSelectMatch(p)}
                          className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left"
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}
                        >
                          <motion.div className="h-14 w-14 overflow-hidden rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                            {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                              {p.title || p.name}
                            </p>
                            <p className="text-[13px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
                              ${Number(p.price || 0).toFixed(2)}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={() => setSheetOpen(false)} />
          </Sheet>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
