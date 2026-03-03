import type { ReactNode, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Navbar from './Navbar';

interface AuthLayoutProps {
  tab: 'login' | 'signup' | 'forgot';
  formTitle: string;
  children: ReactNode;
}

const IllustrationSVG = () => (
  <svg viewBox="0 0 420 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm mx-auto">
    {/* Sky / background shapes */}
    <ellipse cx="210" cy="300" rx="190" ry="28" fill="#dde3f5" />
    {/* Mountains */}
    <polygon points="30,260 110,140 190,260" fill="#b8c4e8" />
    <polygon points="80,260 170,110 260,260" fill="#c8d3f0" />
    <polygon points="200,260 290,130 380,260" fill="#b8c4e8" />
    {/* Sun */}
    <circle cx="320" cy="70" r="30" fill="#fde68a" opacity="0.85" />
    <circle cx="320" cy="70" r="22" fill="#fbbf24" opacity="0.7" />
    {/* Clouds */}
    <ellipse cx="80" cy="80" rx="36" ry="18" fill="white" opacity="0.9" />
    <ellipse cx="108" cy="72" rx="28" ry="20" fill="white" opacity="0.9" />
    <ellipse cx="56" cy="76" rx="22" ry="14" fill="white" opacity="0.9" />
    <ellipse cx="200" cy="55" rx="28" ry="14" fill="white" opacity="0.85" />
    <ellipse cx="222" cy="48" rx="20" ry="16" fill="white" opacity="0.85" />
    {/* Ground */}
    <rect x="0" y="248" width="420" height="60" fill="#e8edfa" rx="4" />
    {/* Flowers */}
    <circle cx="60" cy="248" r="7" fill="#f9a8d4" />
    <circle cx="60" cy="248" r="4" fill="#fbbf24" />
    <rect x="58" y="248" width="4" height="18" fill="#6ee7b7" rx="2" />
    <circle cx="88" cy="244" r="6" fill="#fca5a5" />
    <circle cx="88" cy="244" r="3.5" fill="#fbbf24" />
    <rect x="86" y="244" width="4" height="16" fill="#6ee7b7" rx="2" />
    <circle cx="348" cy="248" r="7" fill="#a5f3fc" />
    <circle cx="348" cy="248" r="4" fill="#fbbf24" />
    <rect x="346" y="248" width="4" height="18" fill="#6ee7b7" rx="2" />
    <circle cx="372" cy="244" r="6" fill="#c4b5fd" />
    <circle cx="372" cy="244" r="3.5" fill="#fbbf24" />
    <rect x="370" y="244" width="4" height="16" fill="#6ee7b7" rx="2" />
    {/* Backpack */}
    <rect x="136" y="190" width="32" height="40" rx="6" fill="#6366f1" />
    <rect x="140" y="196" width="24" height="14" rx="3" fill="#818cf8" />
    <rect x="144" y="218" width="16" height="8" rx="2" fill="#818cf8" />
    <ellipse cx="152" cy="190" rx="10" ry="6" fill="#4f46e5" />
    {/* Person body */}
    <rect x="148" y="155" width="28" height="38" rx="8" fill="#fbbf24" />
    {/* Person legs */}
    <rect x="150" y="188" width="10" height="30" rx="4" fill="#374151" />
    <rect x="162" y="188" width="10" height="30" rx="4" fill="#374151" />
    {/* Shoes */}
    <ellipse cx="155" cy="218" rx="8" ry="4" fill="#1f2937" />
    <ellipse cx="167" cy="218" rx="8" ry="4" fill="#1f2937" />
    {/* Person head */}
    <circle cx="162" cy="142" r="18" fill="#fde68a" />
    <circle cx="156" cy="139" r="2.5" fill="#374151" />
    <circle cx="168" cy="139" r="2.5" fill="#374151" />
    <path d="M157 148 Q162 153 167 148" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Hair */}
    <path d="M144 138 Q148 124 162 124 Q176 124 180 138" fill="#92400e" />
    {/* Laptop */}
    <rect x="174" y="172" width="70" height="46" rx="6" fill="#1e40af" />
    <rect x="178" y="176" width="62" height="36" rx="3" fill="#dbeafe" />
    {/* Screen content lines */}
    <rect x="183" y="182" width="30" height="4" rx="2" fill="#93c5fd" />
    <rect x="183" y="190" width="42" height="3" rx="2" fill="#bfdbfe" />
    <rect x="183" y="197" width="36" height="3" rx="2" fill="#bfdbfe" />
    <rect x="183" y="204" width="24" height="3" rx="2" fill="#93c5fd" />
    {/* Laptop hinge */}
    <rect x="174" y="216" width="70" height="6" rx="2" fill="#1d4ed8" />
    {/* Laptop base */}
    <rect x="170" y="218" width="78" height="8" rx="3" fill="#1e3a8a" />
    {/* Person arm reaching to laptop */}
    <path d="M176 168 Q178 172 182 176" stroke="#fde68a" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* Notification / chat bubbles floating */}
    <rect x="252" y="148" width="52" height="32" rx="8" fill="white" opacity="0.95" />
    <rect x="258" y="156" width="24" height="4" rx="2" fill="#6366f1" />
    <rect x="258" y="165" width="36" height="3" rx="2" fill="#c7d2fe" />
    <polygon points="256,180 264,180 260,188" fill="white" opacity="0.95" />
    <rect x="258" y="110" width="44" height="28" rx="8" fill="#ff8c42" opacity="0.9" />
    <rect x="264" y="118" width="20" height="3" rx="2" fill="white" />
    <rect x="264" y="125" width="28" height="3" rx="2" fill="rgba(255,255,255,0.7)" />
    <polygon points="282,138 290,138 286,145" fill="#ff8c42" opacity="0.9" />
    {/* Stars */}
    <circle cx="116" cy="100" r="2" fill="#fbbf24" />
    <circle cx="300" cy="110" r="2.5" fill="#fbbf24" />
    <circle cx="380" cy="88" r="2" fill="#fbbf24" />
  </svg>
);

export default function AuthLayout({ tab, formTitle, children }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const wrapperStyle: CSSProperties = {
    background:
      theme === 'dark'
        ? 'radial-gradient(circle at top, #020617 0%, #030712 40%, #020617 100%)'
        : 'linear-gradient(135deg, #e8edf8 0%, #dce3f5 50%, #e4e8f6 100%)',
  };

  return (
    <div
      className="min-h-screen login-signup-wrapper"
      style={wrapperStyle}
    >
      <div
        className="min-h-screen flex flex-col"
        style={{
          background: 'transparent',
        }}
      >
        {/* Use the main buyer Navbar as the header */}
        <Navbar />

        {/* Main split layout (padded below fixed Navbar) */}
        <main className="flex-1 flex items-stretch justify-center px-4 sm:px-6 lg:px-10 pb-6 pt-[150px]">
          <div
            className="w-full max-w-6xl xl:max-w-7xl flex flex-col lg:flex-row rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(15,23,42,0.85)' }}
          >
            {/* LEFT PANEL */}
            <section
              className="auth-left-panel auth-animate-left w-full lg:w-[45%] px-6 sm:px-8 lg:px-10 py-8 sm:py-10 flex flex-col justify-between relative"
              style={{ minHeight: '100%' }}
            >
              {/* Floating blobs */}
              <div className="auth-left-overlay">
                <div
                  className="auth-blob auth-blob--orange"
                  style={{
                    width: 260,
                    height: 260,
                    top: -40,
                    left: -60,
                    animation: 'auth-float-12 12s ease-in-out infinite',
                  }}
                />
                <div
                  className="auth-blob auth-blob--purple"
                  style={{
                    width: 220,
                    height: 220,
                    top: 140,
                    right: -40,
                    animation: 'auth-float-10 10s ease-in-out infinite',
                  }}
                />
                <div
                  className="auth-blob auth-blob--blue"
                  style={{
                    width: 260,
                    height: 260,
                    bottom: -60,
                    left: 40,
                    animation: 'auth-float-8 8s ease-in-out infinite',
                  }}
                />
              </div>

              {/* Top branding */}
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-white font-bold text-2xl tracking-tight">Reaglex</p>
                    <p
                      className="text-[13px]"
                      style={{ color: 'rgba(255,255,255,0.6)' }}
                    >
                      Buy &amp; Sell Anything
                    </p>
                  </div>
                </div>

                {/* Hero text */}
                <div className="space-y-4 mt-6 max-w-md">
                  <h1 className="text-[32px] sm:text-[38px] lg:text-[42px] font-black leading-tight text-white">
                    Smart Shopping
                    <br />
                    <span
                      style={{
                        background: 'linear-gradient(135deg,#f97316,#fb923c)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Trusted Sellers.
                    </span>
                  </h1>
                  <p
                    className="text-sm sm:text-[15px] max-w-[340px]"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    Join 50,000+ buyers and sellers on Rwanda&apos;s premier escrow-protected
                    marketplace.
                  </p>

                  {/* Trust badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { icon: '🔒', label: 'Escrow Protected' },
                      { icon: '✓', label: 'Verified Sellers' },
                      { icon: '⚡', label: 'Fast Delivery' },
                    ].map((b) => (
                      <div
                        key={b.label}
                        className="auth-glass-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px]"
                        style={{ color: 'rgba(255,255,255,0.85)' }}
                      >
                        <span>{b.icon}</span>
                        <span>{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Illustration / floating cards */}
                <div className="mt-6">
                  <div
                    className="relative mx-auto max-w-sm rounded-3xl p-4 sm:p-5"
                    style={{
                      background: 'rgba(15,23,42,0.85)',
                      boxShadow: '0 18px 45px rgba(0,0,0,0.55)',
                    }}
                  >
                    <div
                      className="absolute -inset-10 rounded-[32px] -z-10"
                      style={{
                        background:
                          'radial-gradient(circle at 10% 0%, rgba(249,115,22,0.28), transparent 55%), radial-gradient(circle at 90% 100%, rgba(59,130,246,0.28), transparent 55%)',
                      }}
                    />
                    <p
                      className="text-[11px] font-semibold mb-3 uppercase tracking-[0.16em]"
                      style={{ color: 'rgba(248,250,252,0.7)' }}
                    >
                      LIVE MARKETPLACE SNAPSHOT
                    </p>
                    <div className="space-y-2.5">
                      {[
                        {
                          title: 'Noise Cancelling Headphones',
                          price: '$129.00',
                          rating: '4.9',
                          tag: 'Top Seller',
                        },
                        {
                          title: 'Smart Watch Pro X',
                          price: '$89.00',
                          rating: '4.8',
                          tag: 'Trending',
                        },
                      ].map((c, idx) => (
                        <div
                          key={c.title}
                          className="flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5"
                          style={{
                            background: 'rgba(15,23,42,0.9)',
                            border: '1px solid rgba(148,163,184,0.25)',
                            transform: idx === 0 ? 'rotate(-2deg)' : 'rotate(2deg)',
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px]"
                              style={{
                                background:
                                  'linear-gradient(135deg,#f97316,#fb923c)',
                                color: '#0b1120',
                              }}
                            >
                              {idx === 0 ? '🎧' : '⌚'}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-xs font-semibold truncate"
                                style={{ color: '#e5e7eb' }}
                              >
                                {c.title}
                              </p>
                              <p
                                className="text-[11px]"
                                style={{ color: 'rgba(148,163,184,0.9)' }}
                              >
                                {c.tag} • {c.rating}★
                              </p>
                            </div>
                          </div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: '#f9fafb' }}
                          >
                            {c.price}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom stats + social proof */}
              <div className="relative z-10 mt-8 space-y-4">
                {/* Social proof */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex auth-avatar-stack">
                      {['AM', 'JR', 'LN', 'TK', 'RS'].map((initials, idx) => (
                        <span
                          key={initials}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/20 text-[11px] font-semibold"
                          style={{
                            background:
                              idx === 0
                                ? 'linear-gradient(135deg,#f97316,#fb923c)'
                                : 'rgba(15,23,42,0.85)',
                            color: '#f9fafb',
                          }}
                        >
                          {initials}
                        </span>
                      ))}
                    </div>
                    <p
                      className="text-[12px]"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      Join <span className="font-semibold">2,847</span> new members this month
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between gap-4 pt-2">
                  {[
                    { value: '50K+', label: 'Active Users' },
                    { value: '10K+', label: 'Products' },
                    { value: '4.9★', label: 'Rating' },
                  ].map((s, idx) => (
                    <div key={s.label} className="flex items-center gap-4 flex-1">
                      {idx !== 0 && <div className="auth-stats-divider" />}
                      <div>
                        <p className="text-[20px] font-bold text-white">{s.value}</p>
                        <p
                          className="text-[12px]"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          {s.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live activity indicator */}
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: '#22c55e',
                      boxShadow: '0 0 0 0 rgba(34,197,94,0.7)',
                      animation: 'discountPulse 2s infinite',
                    }}
                  />
                  <p
                    className="text-[12px]"
                    style={{ color: 'rgba(255,255,255,0.65)' }}
                  >
                    <span className="font-semibold">234</span> people signed in today
                  </p>
                </div>
              </div>
            </section>

            {/* RIGHT PANEL */}
            <section
              className="auth-animate-right w-full lg:w-[55%] flex items-center justify-center px-4 sm:px-6 lg:px-10 py-8 sm:py-10"
              style={{
                background: isDark ? '#111420' : '#ffffff',
              }}
            >
              <div
                className="w-full max-w-md mx-auto rounded-2xl lg:rounded-[16px_0_0_16px] px-5 sm:px-7 py-6 sm:py-7 shadow-xl"
                style={{
                  background: isDark ? '#111420' : '#ffffff',
                  boxShadow: isDark
                    ? '0 18px 45px rgba(15,23,42,0.9)'
                    : '0 20px 55px rgba(15,23,42,0.16)',
                }}
              >
                {/* Seller / buyer toggle */}
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div>
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Signing in as
                    </p>
                    <div className="flex items-center gap-1 text-[12px]">
                      <span
                        style={{
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Buyer
                      </span>
                      <span
                        style={{
                          color: 'rgba(148,163,184,0.8)',
                        }}
                      >
                        / Seller
                      </span>
                    </div>
                  </div>

                  {/* Sign In / Register segmented toggle */}
                  <div
                    className="inline-flex items-center px-1 py-1 rounded-[14px] text-[12px] font-semibold"
                    style={{
                      background: 'var(--bg-tertiary)',
                    }}
                  >
                    <Link
                      to="/login"
                      className="relative px-3 py-1.5 rounded-[10px] transition-all"
                      style={{
                        background:
                          tab === 'login'
                            ? isDark
                              ? '#1a1e2c'
                              : '#ffffff'
                            : 'transparent',
                        boxShadow:
                          tab === 'login'
                            ? isDark
                              ? '0 0 0 1px rgba(15,23,42,0.9)'
                              : '0 4px 12px rgba(15,23,42,0.12)'
                            : 'none',
                        color:
                          tab === 'login'
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                      }}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className="relative px-3 py-1.5 rounded-[10px] transition-all"
                      style={{
                        background:
                          tab === 'signup'
                            ? isDark
                              ? '#1a1e2c'
                              : '#ffffff'
                            : 'transparent',
                        boxShadow:
                          tab === 'signup'
                            ? isDark
                              ? '0 0 0 1px rgba(15,23,42,0.9)'
                              : '0 4px 12px rgba(15,23,42,0.12)'
                            : 'none',
                        color:
                          tab === 'signup'
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                      }}
                    >
                      Register
                    </Link>
                  </div>
                </div>

                {/* Actual form content – children control headings & fields */}
                {children}

                {/* Terms note */}
                <p
                  className="mt-6 text-[11px] text-center leading-relaxed"
                  style={{ color: 'var(--text-faint)' }}
                >
                  By continuing you agree to our{' '}
                  <span style={{ color: '#f97316' }}>Terms of Service</span> and{' '}
                  <span style={{ color: '#f97316' }}>Privacy Policy</span>.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
