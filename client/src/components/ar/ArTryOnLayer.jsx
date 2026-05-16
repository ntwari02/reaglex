import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { useMotionUi } from '../../stores/motionUiStore';
import { SERVER_URL } from '../../lib/config';
import { EASE_OUT_EXPO } from '../../motion/presets';

function resolveImage(product) {
  const raw = product?.images?.[0] || product?.image || product?.thumbnail;
  if (!raw) return null;
  const v = typeof raw === 'string' ? raw : raw?.url || raw?.src;
  if (!v) return null;
  return v.startsWith('http') ? v : `${SERVER_URL}${v}`;
}

const COLOR_SWATCHES = ['#111111', '#f1f5f9', 'var(--brand-primary)', '#1e3a5f'];

export default function ArTryOnLayer() {
  const product = useMotionUi((s) => s.arProduct);
  const closeAr = useMotionUi((s) => s.closeAr);
  const videoRef = useRef(null);
  const [colorIdx, setColorIdx] = useState(0);
  const open = Boolean(product);
  const img = resolveImage(product);

  useEffect(() => {
    if (!open) return undefined;
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        /* fallback gradient only */
      }
    })();
    return () => stream?.getTracks?.().forEach((t) => t.stop());
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[215] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
        >
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: 'linear-gradient(180deg, rgba(15,17,21,0.35), rgba(15,17,21,0.75))' }}
          />

          <div className="relative z-[2] flex justify-between px-4 pt-[calc(12px+env(safe-area-inset-top))]">
            <p className="text-[15px] font-semibold text-white">AR preview</p>
            <button
              type="button"
              onClick={closeAr}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          <motion.div
            className="pointer-events-none absolute left-1/2 top-[38%] w-[58%] -translate-x-1/2"
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 0.92, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {img && (
              <img
                src={img}
                alt=""
                className="w-full object-contain drop-shadow-2xl"
                style={{ filter: `hue-rotate(${colorIdx * 18}deg)` }}
              />
            )}
            <motion.div
              className="mx-auto mt-3 h-[3px] w-[70%] rounded-full"
              style={{ background: COLOR_SWATCHES[colorIdx] }}
              layoutId="ar-color-bar"
            />
          </motion.div>

          <div className="absolute bottom-0 left-0 right-0 z-[3] px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
            <p className="mb-3 text-center text-[12px] text-white/70">Swipe colors · tilt device to inspect</p>
            <div className="flex justify-center gap-3">
              {COLOR_SWATCHES.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorIdx(i)}
                  className="h-10 w-10 rounded-full border-2 transition-transform active:scale-95"
                  style={{
                    background: c,
                    borderColor: i === colorIdx ? '#fff' : 'transparent',
                  }}
                />
              ))}
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={closeAr}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-semibold text-white"
              style={{ background: 'var(--brand-primary)' }}
            >
              <RotateCcw size={16} /> Done
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
