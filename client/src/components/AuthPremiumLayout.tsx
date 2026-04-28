import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

/* ─── View type ──────────────────────────────────────────────────────────── */
export type AuthView =
  | 'login'
  | 'signup'
  | 'forgot'
  | 'otp'
  | 'reset'
  | 'success'
  | 'verify'
  | 'pending'
  | 'role';

interface AuthPremiumLayoutProps {
  children: ReactNode;
  currentView?: AuthView;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Layout
═══════════════════════════════════════════════════════════════════════════ */
export default function AuthPremiumLayout({
  children,
  currentView = 'login',
}: AuthPremiumLayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const currentImage = '/auth-3d.png';

  const rightBg = isDark
    ? 'linear-gradient(160deg, #0a0c15 0%, #0d0f1c 60%, #090b13 100%)'
    : 'linear-gradient(160deg, #f8f9fc 0%, #f2f4f8 60%, #eef0f5 100%)';

  return (
    <div
      className="auth-root flex min-h-screen w-full"
      style={{ overflowX: 'hidden' }}
      data-auth-layout="premium-v5"
    >

      {/* ═══ LEFT PANEL — pure 3D illustration, no text ═══ */}
      <aside
        className="flex flex-col relative overflow-hidden flex-shrink-0 min-w-0"
        style={{
          flexBasis: '50%',
          width: '50%',
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #060813 0%, #0d0621 40%, #0b1330 70%, #080e1e 100%)',
        }}
      >
        {/* Grid mesh */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
          preserveAspectRatio="none"
        >
          <defs>
            <pattern id="ag-grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M 44 0 L 0 0 0 44" fill="none" stroke="rgba(249,115,22,0.09)" strokeWidth="1" />
            </pattern>
            <radialGradient id="ag-fade" cx="50%" cy="50%" r="65%">
              <stop offset="0%"   stopColor="#060813" stopOpacity="0"    />
              <stop offset="100%" stopColor="#060813" stopOpacity="0.65" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#ag-grid)" />
          <rect width="100%" height="100%" fill="url(#ag-fade)" />
        </svg>

        {/* Glow orbs */}
        <div className="absolute pointer-events-none" style={{
          top: '5%', left: '-10%',
          width: '60%', paddingBottom: '60%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.22) 0%, transparent 70%)',
          animation: 'ag-float-a 13s ease-in-out infinite',
        }} />
        <div className="absolute pointer-events-none" style={{
          bottom: '10%', right: '-6%',
          width: '50%', paddingBottom: '50%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
          animation: 'ag-float-b 10s ease-in-out infinite',
        }} />
        <div className="absolute pointer-events-none" style={{
          top: '45%', left: '20%',
          width: '40%', paddingBottom: '40%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)',
          animation: 'ag-float-c 8s ease-in-out infinite',
        }} />

        {/* Scan line */}
        <div className="absolute left-0 right-0 pointer-events-none" style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.55), transparent)',
          animation: 'ag-scan 8s linear infinite',
        }} />

        {/* ── 3D illustration — full-bleed (fills the whole side) ── */}
        <div className="absolute inset-0 z-10">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentView}
              src={currentImage}
              alt=""
              draggable={false}
              className="w-full h-full select-none"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/auth-3d.png';
              }}
              style={{
                objectFit: 'cover',
                objectPosition: 'center',
                filter:
                  'drop-shadow(0 12px 32px rgba(249,115,22,0.22)) drop-shadow(0 4px 14px rgba(0,0,0,0.35))',
              }}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </AnimatePresence>
        </div>
      </aside>

      {/* ═══ RIGHT PANEL — Form ═══ */}
      <main
        className="flex flex-col min-w-0 overflow-y-auto"
        style={{
          flexBasis: '50%',
          width: '50%',
          background: rightBg,
          minHeight: '100vh',
          padding:
            'max(env(safe-area-inset-top), 14px) clamp(12px, 4vw, 48px) max(env(safe-area-inset-bottom), 14px)',
        }}
      >
        {children}
      </main>

      {/* Keyframes */}
      <style>{`
        @keyframes ag-float-a {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(12%,-10%) scale(1.06); }
          66%      { transform: translate(-8%,8%) scale(0.96); }
        }
        @keyframes ag-float-b {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-10%,8%) scale(1.04); }
          70%      { transform: translate(8%,-6%) scale(0.97); }
        }
        @keyframes ag-float-c {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(0,-15%); }
        }
        @keyframes ag-scan {
          0%   { top: -1px; opacity: 0; }
          4%   { opacity: 1; }
          96%  { opacity: 0.4; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes auth-check {
          to { stroke-dashoffset: 0; }
        }
        @keyframes auth-shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-6px); }
          30%      { transform: translateX(6px); }
          45%      { transform: translateX(-4px); }
          60%      { transform: translateX(4px); }
          75%      { transform: translateX(-2px); }
        }
        .auth-shake-anim { animation: auth-shake 0.45s ease; }
        @keyframes btn-shimmer {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%);  }
          100% { transform: translateX(100%);  }
        }
      `}</style>
    </div>
  );
}
