import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBuyerCart } from '../../stores/buyerCartStore';

gsap.registerPlugin(ScrollTrigger);

/* ─── Scene definitions ──────────────────────────────────────────────────── */
const SCENES = [
  {
    id: 'welcome',
    bgLight: '#f2f3f7', bgDark: '#0d0f1c',
    label: 'WELCOME', title: 'THE EVOLUTION OF\nSHOPPING',
    sub: 'Discover premium products from verified sellers around the world. Fast, secure, and built for the future.',
    cta: 'EXPLORE NOW', ctaHref: '/search',
    imgUrl: '/hero-headphones.png', imgAlt: 'Premium headphones', imgPos: 'bottom',
    titleColor: 'light', subColor: 'secondary', labelColor: 'muted', btnStyle: 'light',
    guideColor: 'rgba(255,255,255,0.05)', crossColor: 'rgba(255,255,255,0.22)',
    glowColor: 'rgba(249,115,22,0.38)', glowColor2: 'rgba(139,92,246,0.22)',
  },
  {
    id: 'feature',
    bgLight: '#f4f1eb', bgDark: '#100e0a',
    label: 'PRECISION CRAFTED', title: 'LUXURY\nREDEFINED',
    sub: 'Iconic design meets engineering excellence. Each piece carries decades of innovation in its DNA.',
    cta: 'SHOP WATCHES', ctaHref: '/search?q=watches',
    imgUrl: '/hero-watch.png', imgAlt: 'Luxury watch', imgPos: 'center',
    titleColor: 'light', subColor: 'secondary', labelColor: 'muted', btnStyle: 'dark',
    guideColor: 'rgba(180,140,60,0.10)', crossColor: 'rgba(180,140,60,0.30)',
    glowColor: 'rgba(234,179,8,0.42)', glowColor2: 'rgba(249,115,22,0.22)',
  },
  {
    id: 'innovation',
    bgLight: '#f2f3f7', bgDark: '#0d0f1c',
    label: 'INNOVATION', title: 'ENGINEERED\nFOR SPEED',
    sub: 'Performance footwear reimagined with cutting-edge materials and aerodynamic construction.',
    cta: 'SHOP FOOTWEAR', ctaHref: '/search?q=sneakers',
    imgUrl: '/hero-shoes.png', imgAlt: 'Nike premium sneakers', imgPos: 'center-right',
    titleColor: 'light', subColor: 'secondary', labelColor: 'muted', btnStyle: 'dark',
    guideColor: 'rgba(0,0,0,0.06)', crossColor: 'rgba(0,0,0,0.16)',
    glowColor: 'rgba(59,130,246,0.36)', glowColor2: 'rgba(249,115,22,0.18)',
  },
];

const SIDE_LABELS = ['01  WELCOME', '02  PRECISION', '03  INNOVATION'];

/* ─── Crosshair ───────────────────────────────────────────────────────────── */
function Crosshair({ className = '', color = 'rgba(0,0,0,0.25)' }) {
  return (
    <span className={`absolute text-lg select-none pointer-events-none ${className}`}
      style={{ color, fontWeight: 300, lineHeight: 1 }} aria-hidden="true">+</span>
  );
}

/* ─── SVG guide rings ─────────────────────────────────────────────────────── */
function GuideRings({ color = 'rgba(0,0,0,0.07)' }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {[320, 240, 155].map((r, i) => (
        <circle key={i} cx="400" cy="400" r={r} fill="none" stroke={color} strokeWidth="1" />
      ))}
    </svg>
  );
}

/* ─── Scene Panel ─────────────────────────────────────────────────────────
   IMPORTANT: This component intentionally has NO opacity or CSS transitions
   on its root element.  All scene-to-scene crossfading is handled by GSAP
   acting directly on wrapper-div refs, so there is zero CSS-vs-GSAP fighting
   that would cause the visible shaking/stuttering on scroll.
─────────────────────────────────────────────────────────────────────────── */
function ScenePanel({ scene, active, isDark }) {
  const bg       = isDark ? scene.bgDark : scene.bgLight;
  const isRight  = scene.imgPos === 'center-right';
  const isBtm    = scene.imgPos === 'bottom';
  const isCenter = scene.imgPos === 'center';
  const isShoe   = scene.id === 'innovation';

  const titleColor = scene.titleColor === 'light'
    ? (isDark ? '#e2e4ed' : '#0f172a') : scene.titleColor;
  const subColor = scene.subColor === 'secondary'
    ? (isDark ? '#9da3be' : '#4b5563') : scene.subColor;
  const labelColor = scene.labelColor === 'muted'
    ? (isDark ? '#7a6840' : '#8b7040') : scene.labelColor;

  const btnStyle = scene.btnStyle === 'light'
    ? {
        background: isDark ? '#e2e4ed' : '#0f172a',
        color:      isDark ? '#0d0f1c' : '#ffffff',
        border:     `1px solid ${isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.2)'}`,
        boxShadow:  isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(15,23,42,0.18)',
      }
    : {
        background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.85)',
        color:      isDark ? '#e2e4ed' : '#ffffff',
        border:     isDark ? '1px solid rgba(255,255,255,0.15)' : 'none',
        boxShadow:  '0 4px 20px rgba(0,0,0,0.18)',
      };

  return (
    /*
     * No opacity or transition here — the parent wrapper div (in ReimaginedHero)
     * has its opacity driven by GSAP directly via a ref.
     */
    <div className="absolute inset-0" style={{ background: bg, pointerEvents: active ? 'auto' : 'none' }}>

      {/* ══════════════════════════════════════════════════════
          MOBILE layout  (<md)  — stacked: text top, image bottom
          No absolute positioning, no overlapping, no overflow.
      ══════════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col h-full overflow-hidden">

        {/* Text block — upper ~46% */}
        <div className="flex flex-col justify-center px-6 pt-14 pb-2 z-10 relative" style={{ flex: '0 0 46%' }}>
          <motion.p
            className="text-[9px] font-bold tracking-[0.22em] uppercase mb-2"
            style={{ color: labelColor }}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }}
            transition={{ duration: 0.45, delay: active ? 0.08 : 0 }}>
            {scene.label}
          </motion.p>

          <motion.h2
            className="font-black whitespace-pre-line leading-[0.93] mb-3"
            style={{
              color: titleColor,
              fontFamily: "'Times New Roman', Georgia, serif",
              fontSize: 'clamp(1.85rem, 8vw, 2.6rem)',
              letterSpacing: '-0.02em',
            }}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 14 }}
            transition={{ duration: 0.5, delay: active ? 0.14 : 0 }}>
            {scene.title}
          </motion.h2>

          <motion.p
            className="text-[12px] leading-relaxed mb-4"
            style={{ color: subColor, maxWidth: '32ch' }}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }}
            transition={{ duration: 0.45, delay: active ? 0.22 : 0 }}>
            {scene.sub}
          </motion.p>

          <motion.div
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }}
            transition={{ duration: 0.45, delay: active ? 0.28 : 0 }}>
            <Link
              to={scene.ctaHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold tracking-[0.13em] uppercase"
              style={btnStyle}>
              {scene.cta}
              <ArrowRight size={11} />
            </Link>
          </motion.div>
        </div>

        {/* Image block — lower ~54% */}
        <div className="relative flex items-end justify-center overflow-hidden" style={{ flex: '0 0 54%' }}>
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(ellipse 85% 70% at 50% 65%, ${scene.glowColor} 0%, ${scene.glowColor2} 45%, transparent 72%)`,
            filter: 'blur(22px)',
          }} />
          <motion.img
            src={scene.imgUrl}
            alt={scene.imgAlt}
            draggable={false}
            className="relative z-10 select-none"
            style={{
              /* On mobile use viewport-aware widths so nothing overflows */
              width: isBtm ? '78vw' : isShoe ? '88vw' : '70vw',
              maxWidth: 320,
              maxHeight: '48vw',
              objectFit: 'contain',
              objectPosition: isBtm ? 'bottom center' : isShoe ? 'center right' : 'center',
              filter: `drop-shadow(0 14px 32px rgba(0,0,0,${isDark ? '0.50' : '0.20'}))`,
            }}
            initial={{ scale: 0.84, y: 20 }}
            animate={active ? { scale: 1, y: 0 } : { scale: 0.86, y: 16 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          DESKTOP layout  (≥md)  — original absolute positioning
      ══════════════════════════════════════════════════════ */}
      <div className="hidden md:block absolute inset-0">
        {/* Guide rings */}
        <div
          className={`absolute pointer-events-none ${isCenter ? 'left-1/2 w-4/5 -translate-x-1/2' : isRight ? 'right-0 w-3/5' : 'left-0 w-3/5'}`}
          style={{ top: '50%', transform: isCenter ? 'translate(-50%,-50%)' : 'translateY(-50%)', aspectRatio: '1' }}
        >
          <GuideRings color={scene.guideColor} />
        </div>

        <Crosshair className="top-8 left-8"     color={scene.crossColor} />
        <Crosshair className="top-8 right-8"    color={scene.crossColor} />
        <Crosshair className="bottom-8 left-8"  color={scene.crossColor} />
        <Crosshair className="bottom-8 right-8" color={scene.crossColor} />

        {/* Product image block */}
        <div
          className="absolute pointer-events-none"
          style={{
            ...(isCenter ? {
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'clamp(340px, 68vmin, 860px)',
            } : isBtm ? {
              left: '50%', transform: 'translateX(-50%)',
              bottom: 0, width: 'clamp(320px, 62vmin, 780px)',
            } : isRight ? {
              right: '-16px', top: '50%', transform: 'translateY(-50%)',
              width: isShoe ? 'clamp(340px, 58vw, 720px)' : 'clamp(300px, 52vmin, 680px)',
            } : {
              left: '-16px', top: '50%', transform: 'translateY(-50%)',
              width: 'clamp(300px, 52vmin, 680px)',
            }),
            perspective: '900px',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 70% 60% at 50% 55%, ${scene.glowColor} 0%, ${scene.glowColor2} 40%, transparent 72%)`,
              filter: 'blur(28px)',
            }}
          />
          <motion.img
            src={scene.imgUrl}
            alt={scene.imgAlt}
            draggable={false}
            className="w-full select-none relative z-10"
            style={{
              objectFit: 'contain',
              objectPosition: isBtm ? 'bottom center' : isShoe ? 'center right' : 'center',
              maxHeight: isCenter ? '88vh' : isBtm ? '84vh' : isShoe ? '42vh' : '78vh',
              filter: `drop-shadow(0 24px 52px rgba(0,0,0,${isDark ? '0.52' : '0.22'})) drop-shadow(0 4px 16px rgba(0,0,0,0.14))`,
            }}
            initial={{ scale: isCenter ? 0.78 : 0.86, rotateY: isCenter ? 0 : isRight ? 18 : -18, y: isCenter ? 60 : 30 }}
            animate={active
              ? { scale: 1, rotateY: 0, y: 0 }
              : { scale: isCenter ? 0.80 : 0.88, rotateY: isCenter ? 0 : isRight ? 14 : -14, y: isCenter ? 50 : 24 }
            }
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
          {active && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-20"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* Text content */}
        <div
          className={`absolute z-20 max-w-sm ${
            isCenter ? 'left-[6%] bottom-[12%] text-left'
            : isBtm  ? 'top-[20%] left-1/2 -translate-x-1/2 text-center'
            : isRight ? 'left-[6%] top-1/2 -translate-y-1/2'
            : 'right-[6%] top-1/2 -translate-y-1/2 text-left'
          }`}
        >
          <motion.p className="text-xs font-semibold tracking-[0.22em] uppercase mb-4"
            style={{ color: labelColor }}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 14 }}
            transition={{ duration: 0.55, delay: active ? 0.1 : 0 }}>
            {scene.label}
          </motion.p>

          <motion.h2
            className="font-black whitespace-pre-line leading-[0.95] mb-6"
            style={{ color: titleColor, fontFamily: "'Times New Roman', Georgia, serif", fontSize: 'clamp(2.4rem, 5vw, 4.5rem)', letterSpacing: '-0.02em' }}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 24 }}
            transition={{ duration: 0.6, delay: active ? 0.17 : 0 }}>
            {scene.title}
          </motion.h2>

          <motion.p className="text-sm leading-relaxed mb-8 max-w-[28ch]"
            style={{ color: subColor }}
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 16 }}
            transition={{ duration: 0.55, delay: active ? 0.25 : 0 }}>
            {scene.sub}
          </motion.p>

          <motion.div
            animate={{ opacity: active ? 1 : 0, y: active ? 0 : 12 }}
            transition={{ duration: 0.55, delay: active ? 0.32 : 0 }}>
            <Link
              to={scene.ctaHref}
              className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300 hover:gap-5"
              style={btnStyle}>
              {scene.cta}
              <ArrowRight size={13} />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main hero component ─────────────────────────────────────────────────── */
export default function ReimaginedHero() {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';

  const containerRef = useRef(null);
  const stickyRef    = useRef(null);
  const progressRef  = useRef(null);

  /*
   * Use window.innerHeight (not 100vh) for the pinned section height.
   * On iOS Safari the address bar resizes the viewport during scroll,
   * which causes 100vh-based pinned elements to jitter.
   * We snapshot innerHeight on mount (after layout) and only update it
   * on resize so GSAP never sees mid-scroll height changes.
   */
  const [vpH, setVpH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  useEffect(() => {
    let tid;
    const onResize = () => {
      clearTimeout(tid);
      tid = setTimeout(() => {
        setVpH(window.innerHeight);
        ScrollTrigger.refresh();
      }, 200);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => { window.removeEventListener('resize', onResize); clearTimeout(tid); };
  }, []);

  /*
   * sceneWrappers: refs to each scene's wrapper div.
   * GSAP reads/writes these directly on every scroll frame (no React setState),
   * which is the key to eliminating jitter.
   */
  const sceneWrappers = useRef([]);

  /*
   * activeScene React state is used ONLY for the dot indicators and nav labels.
   * It is updated at most once per scene change (not every scroll frame), so
   * it does not contribute to jitter.
   */
  const [activeScene, setActiveScene] = useState(0);
  const lastSceneRef = useRef(0);

  const cartOpen = useBuyerCart((s) => s.cartOpen);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Re-sync GSAP after the cart push spring settles ── */
  useEffect(() => {
    const id = setTimeout(() => ScrollTrigger.refresh(), 640);
    return () => clearTimeout(id);
  }, [cartOpen]);

  /* ── Main GSAP scroll setup ── */
  useEffect(() => {
    if (prefersReducedMotion) return;

    const total = SCENES.length;

    /* Set correct initial opacity on each wrapper div so there is never
       a flash-of-all-scenes before GSAP initialises. */
    sceneWrappers.current.forEach((el, i) => {
      if (el) el.style.opacity = i === 0 ? '1' : '0';
    });

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start:   'top top',
        /* Use pixel-based end so it matches the section height we computed from vpH */
        end:     () => `+=${total * vpH}`,
        pin:     stickyRef.current,
        pinSpacing:     true,
        anticipatePin:  0.5,
        pinType:        'fixed',
        scrub:          1.6,
        invalidateOnRefresh: true,
        fastScrollEnd:  true,

        onUpdate(self) {
          const progress  = Math.max(0, Math.min(1, self.progress));
          const floatIdx  = progress * (total - 1);
          const prevIdx   = Math.floor(floatIdx);
          const nextIdx   = Math.min(total - 1, prevIdx + 1);
          const blend     = floatIdx - prevIdx; // 0 → 1 transition factor

          /* ── Direct DOM opacity crossfade (zero React involvement) ──────
             prevScene fades out, nextScene fades in.
             Sum of opacities always equals 1 so the container background
             is never visible during the crossfade.
          ─────────────────────────────────────────────────────────────── */
          sceneWrappers.current.forEach((el, i) => {
            if (!el) return;
            if (prevIdx === nextIdx) {
              el.style.opacity = i === prevIdx ? '1' : '0';
            } else if (i === prevIdx) {
              el.style.opacity = String(1 - blend);
            } else if (i === nextIdx) {
              el.style.opacity = String(blend);
            } else {
              el.style.opacity = '0';
            }
          });

          /* ── Continuous progress bar (no stepped jitter) ── */
          if (progressRef.current) {
            progressRef.current.style.transform = `scaleX(${progress})`;
          }

          /* ── React state only once per scene change ── */
          const snapIdx = Math.max(0, Math.min(total - 1, Math.round(floatIdx)));
          if (snapIdx !== lastSceneRef.current) {
            lastSceneRef.current = snapIdx;
            setActiveScene(snapIdx);
          }
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReducedMotion, vpH]);

  /* ─── Reduced-motion fallback ── */
  if (prefersReducedMotion) {
    return (
      <section style={{ background: SCENES[0].bgDark }}>
        {SCENES.map((s) => (
          <div key={s.id} className="min-h-screen flex items-center justify-center p-8">
            <div className="text-center">
              <p style={{ color: '#6b7280', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '1rem' }}>{s.label}</p>
              <h2 style={{ color: '#f9fafb', fontSize: '3rem', fontFamily: 'serif', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
                {s.title.replace('\n', ' ')}
              </h2>
              <Link to={s.ctaHref} style={{ background: '#f97316', color: '#fff', padding: '1rem 2rem', borderRadius: '999px', display: 'inline-block', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.15em' }}>
                {s.cta}
              </Link>
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      className="relative"
      /* Use pixel height derived from window.innerHeight to avoid iOS 100vh jitter */
      style={{ height: `${SCENES.length * vpH + vpH}px` }}
    >
      {/*
       * Pinned viewport.
       * – No CSS `sticky`: conflicts with pinType:"transform".
       * – Height is set explicitly in pixels (vpH) so iOS Safari's
       *   shrinking address bar cannot cause mid-scroll size changes.
       */}
      <div
        ref={stickyRef}
        className="overflow-hidden"
        style={{
          height: vpH,
          background: isDark ? SCENES[0].bgDark : SCENES[0].bgLight,
          width: '100%',
        }}
      >
        {/*
         * Each scene is wrapped in a plain div whose opacity is driven
         * entirely by GSAP (via sceneWrappers refs).  No CSS transition
         * is applied to these wrappers — any CSS transition on these
         * elements would fight GSAP's per-frame updates and cause shaking.
         */}
        {SCENES.map((scene, i) => (
          <div
            key={scene.id}
            ref={(el) => { sceneWrappers.current[i] = el; }}
            style={{
              position: 'absolute', inset: 0,
              /* Initial opacity set here avoids flash-before-GSAP-init */
              opacity: i === 0 ? 1 : 0,
              /* NO transition property — GSAP owns this */
            }}
          >
            <ScenePanel scene={scene} active={i === activeScene} isDark={isDark} />
          </div>
        ))}

        {/* Left scene labels */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-8 z-20">
          {SIDE_LABELS.map((label, i) => (
            <button key={label} onClick={() => setActiveScene(i)}
              className="text-left transition-all duration-300"
              style={{
                fontSize: '9px', letterSpacing: '0.15em', fontWeight: 700,
                color: i === activeScene
                  ? (SCENES[activeScene].id === 'welcome' ? 'rgba(255,255,255,1)' : (isDark ? '#e2e4ed' : '#0f172a'))
                  : (SCENES[activeScene].id === 'welcome' ? 'rgba(255,255,255,0.45)' : (isDark ? '#9da3be' : 'rgba(0,0,0,0.38)')),
                lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none', padding: 0,
              }}>
              {label.split('  ').map((part, j) => (
                <span key={j} style={{ display: 'block', lineHeight: j === 0 ? '1.2' : '1.6' }}>{part}</span>
              ))}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'rgba(127,127,127,0.15)' }}>
          <div
            ref={progressRef}
            className="h-full origin-left"
            style={{
              /* transition-none is critical — GSAP sets scaleX every frame */
              transition: 'none',
              background: SCENES[activeScene].id === 'welcome' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)',
              transform: `scaleX(${1 / SCENES.length})`,
            }}
          />
        </div>

        {/* Scroll hint — nudge on mobile too, but smaller */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-20 pointer-events-none"
          style={{
            bottom: '6%',
            color: SCENES[activeScene].id === 'welcome' ? 'rgba(255,255,255,0.32)' : (isDark ? '#3d4159' : 'rgba(0,0,0,0.25)'),
          }}
        >
          <span style={{ fontSize: '8px', letterSpacing: '0.2em', fontWeight: 700 }}>SCROLL</span>
          <div className="w-px h-5" style={{
            background: SCENES[activeScene].id === 'welcome'
              ? 'linear-gradient(to bottom, rgba(255,255,255,0.38), transparent)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.22), transparent)',
          }} />
        </motion.div>
      </div>
    </section>
  );
}
