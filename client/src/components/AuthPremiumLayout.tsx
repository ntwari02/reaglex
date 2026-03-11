import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Shield } from 'lucide-react';

interface AuthPremiumLayoutProps {
  children: ReactNode;
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #0f0c24 0%, #1a0f3a 40%, #0d1f3a 70%, #0a1628 100%)';

export default function AuthPremiumLayout({ children }: AuthPremiumLayoutProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const rightBg = isDark ? '#090b12' : '#ffffff';

  return (
    <div
      className="auth-premium-root flex min-h-screen overflow-y-auto"
      style={{ width: '100%' }}
      data-auth-layout="premium"
    >
      {/* LEFT PANEL — Brand story */}
      <aside
        className="hidden lg:flex lg:w-1/2 flex-col relative overflow-hidden"
        style={{ background: BRAND_GRADIENT }}
      >
        {/* Floating blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="auth-blob auth-blob--orange"
            style={{
              width: 280,
              height: 280,
              top: '10%',
              left: '-10%',
              animation: 'auth-float-12 14s ease-in-out infinite',
              opacity: 0.5,
            }}
          />
          <div
            className="auth-blob auth-blob--purple"
            style={{
              width: 240,
              height: 240,
              top: '50%',
              right: '-5%',
              animation: 'auth-float-10 12s ease-in-out infinite',
              opacity: 0.45,
            }}
          />
          <div
            className="auth-blob auth-blob--blue"
            style={{
              width: 200,
              height: 200,
              bottom: '15%',
              left: '20%',
              animation: 'auth-float-8 10s ease-in-out infinite',
              opacity: 0.4,
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col flex-1 px-8 xl:px-12 py-8 xl:py-10">
          {/* Logo */}
          <Link
            to="/"
            className="text-3xl font-bold tracking-tight text-white hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ fontFamily: "'Mea Culpa', serif" }}
          >
            Reaglex
          </Link>

          {/* Center content */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {/* Shield icon with glow + pulse */}
            <div
              className="flex items-center justify-center mb-6"
              style={{
                width: 100,
                height: 100,
                filter: 'drop-shadow(0 0 28px rgba(249,115,22,0.5))',
                animation: 'auth-shield-pulse 3s ease-in-out infinite',
              }}
            >
              <Shield
                className="w-full h-full"
                style={{
                  color: '#f97316',
                  filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.6))',
                }}
                strokeWidth={1.5}
              />
            </div>

            <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight mb-1">
              Smart Shopping.
            </h1>
            <p
              className="text-3xl xl:text-4xl font-black mb-4"
              style={{
                background: 'linear-gradient(135deg, #ff8c2a, #f97316, #ea580c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Trusted Sellers.
            </p>
            <p className="text-sm xl:text-base max-w-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Rwanda&apos;s #1 marketplace for buyers and verified sellers.
            </p>

            {/* Frosted glass pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {[
                { icon: '🔒', label: 'Escrow Protected' },
                { icon: '✓', label: 'Verified Sellers' },
                { icon: '⚡', label: 'Fast Delivery' },
              ].map((b) => (
                <span
                  key={b.label}
                  className="auth-glass-pill inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-medium"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom stats */}
          <div className="flex items-center justify-center gap-8 flex-shrink-0 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-lg font-bold text-white">50K+</p>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Buyers
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">10K+</p>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Sellers
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">4.9★</p>
              <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Rating
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL — Form */}
      <main
        className="flex-1 flex flex-col min-h-0 min-w-0 lg:min-w-[50%] overflow-y-auto"
        style={{
          background: rightBg,
          padding: 'clamp(12px, 3vh, 32px) clamp(16px, 4vw, 32px)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
