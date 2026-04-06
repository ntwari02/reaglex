import type { ReactNode, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../i18n/useTranslation';
// @ts-ignore Temporary: Navbar is implemented in JS
import Navbar from './Navbar';

interface AuthLayoutProps {
  tab: 'login' | 'signup' | 'forgot';
  children: ReactNode;
  /** When set (e.g. "/auth"), Sign In / Register links use this path with ?tab= */
  authBasePath?: string;
  /** When true, do not show the site header (navbar) — form-only page */
  hideHeader?: boolean;
}

export default function AuthLayout({ tab, children, authBasePath, hideHeader }: AuthLayoutProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const wrapperStyle: CSSProperties = hideHeader
    ? { background: 'transparent', minHeight: '100vh' }
    : {
        background: isDark
          ? 'radial-gradient(circle at top, #020617 0%, #030712 40%, #020617 100%)'
          : 'linear-gradient(135deg, #e8edf8 0%, #dce3f5 50%, #e4e8f6 100%)',
      };

  const formCardContent = (
    <>
      {/* Sign In / Register toggle + form area */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('auth.signingInAs')}
          </p>
          <div className="flex items-center gap-1 text-[12px]">
            <span style={{ color: 'var(--text-secondary)' }}>{t('auth.buyer')}</span>
            <span style={{ color: 'rgba(148,163,184,0.8)' }}>/ {t('auth.seller')}</span>
          </div>
        </div>
        <div
          className="inline-flex items-center px-1 py-1 rounded-[14px] text-[12px] font-semibold"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          <Link
            to={authBasePath ? `${authBasePath}?tab=login` : '/login'}
            className="relative px-3 py-1.5 rounded-[10px] transition-all"
            style={{
              background: tab === 'login' ? (isDark ? '#1a1e2c' : '#ffffff') : 'transparent',
              boxShadow: tab === 'login' ? (isDark ? '0 0 0 1px rgba(15,23,42,0.9)' : '0 4px 12px rgba(15,23,42,0.12)') : 'none',
              color: tab === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {t('buttons.login')}
          </Link>
          <Link
            to={authBasePath ? `${authBasePath}?tab=signup` : '/signup'}
            className="relative px-3 py-1.5 rounded-[10px] transition-all"
            style={{
              background: tab === 'signup' ? (isDark ? '#1a1e2c' : '#ffffff') : 'transparent',
              boxShadow: tab === 'signup' ? (isDark ? '0 0 0 1px rgba(15,23,42,0.9)' : '0 4px 12px rgba(15,23,42,0.12)') : 'none',
              color: tab === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {t('buttons.register')}
          </Link>
        </div>
      </div>
      {children}
      <p className="mt-6 text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-faint)' }}>
        {t('auth.continueAgreement')} <span style={{ color: '#f97316' }}>{t('footer.links.bottom.termsOfService')}</span> {t('common.and')} <span style={{ color: '#f97316' }}>{t('footer.links.support.privacyPolicy')}</span>.
      </p>
    </>
  );

  if (hideHeader) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 sm:p-6"
        style={{
          background: isDark ? 'var(--bg-primary, #0f172a)' : 'var(--bg-primary, #ffffff)',
          minHeight: '100vh',
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl px-5 sm:px-7 py-6 sm:py-8"
          style={{
            background: isDark ? '#111420' : '#ffffff',
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          {formCardContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen login-signup-wrapper"
      style={wrapperStyle}
    >
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'transparent' }}
      >
        <Navbar />
        <main className="flex-1 flex items-stretch justify-center px-3 sm:px-6 lg:px-10 pb-6 pt-[116px] sm:pt-[132px] lg:pt-[150px]">
          <div
            className="w-full max-w-6xl xl:max-w-7xl flex rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.7)' }}
          >
            {/* LEFT PANEL */}
            <section
              className="auth-left-panel auth-animate-left hidden lg:flex lg:w-[45%] px-6 sm:px-8 lg:px-10 py-8 sm:py-10 flex-col justify-between relative"
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
                      {t('footer.brandTagline')}
                    </p>
                  </div>
                </div>

                {/* Hero text */}
                <div className="space-y-4 mt-6 max-w-md">
                  <h1 className="text-[32px] sm:text-[38px] lg:text-[42px] font-black leading-tight text-white">
                    {t('auth.smartShopping')}
                    <br />
                    <span
                      style={{
                        background: 'linear-gradient(135deg,#f97316,#fb923c)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {t('auth.trustedSellers')}
                    </span>
                  </h1>
                  <p
                    className="text-sm sm:text-[15px] max-w-[340px]"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {t('auth.heroSubtitle')}
                  </p>

                  {/* Trust badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { icon: '🔒', label: t('footer.badges.escrowProtected') },
                      { icon: '✓', label: t('footer.badges.verifiedSellers') },
                      { icon: '⚡', label: t('auth.fastDelivery') },
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
                      {t('auth.liveMarketplaceSnapshot')}
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
                      {t('auth.joinNewMembersPrefix')} <span className="font-semibold">2,847</span> {t('auth.joinNewMembersSuffix')}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between gap-4 pt-2">
                  {[
                    { value: '50K+', label: t('auth.activeUsers') },
                    { value: '10K+', label: t('header.products') },
                    { value: '4.9★', label: t('product.rating') },
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
                    <span className="font-semibold">234</span> {t('auth.peopleSignedInToday')}
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
                className="auth-mobile-app-card w-full max-w-[460px] sm:max-w-md mx-auto rounded-[24px] lg:rounded-[16px_0_0_16px] px-6 sm:px-7 py-6 sm:py-7 shadow-xl overflow-hidden"
                style={{
                  background: isDark ? '#111420' : '#ffffff',
                  boxShadow: isDark
                    ? '0 18px 45px rgba(15,23,42,0.9)'
                    : '0 20px 55px rgba(15,23,42,0.16)',
                }}
              >
                <div className="auth-mobile-app-glow auth-mobile-app-glow--orange" />
                <div className="auth-mobile-app-glow auth-mobile-app-glow--violet" />
                <div className="relative z-10 flex items-center justify-between mb-3 px-1 sm:px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                  </div>
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'var(--text-faint)' }}>
                    {t('auth.reaglexSecure')}
                  </p>
                </div>
                <div className="relative z-10 px-1.5 sm:px-2">
                {/* Seller / buyer toggle */}
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div>
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[0.16em] mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {t('auth.signingInAs')}
                    </p>
                    <div className="flex items-center gap-1 text-[12px]">
                      <span
                        style={{
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {t('auth.buyer')}
                      </span>
                      <span
                        style={{
                          color: 'rgba(148,163,184,0.8)',
                        }}
                      >
                        / {t('auth.seller')}
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
                      to={authBasePath ? `${authBasePath}?tab=login` : '/login'}
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
                      {t('buttons.login')}
                    </Link>
                    <Link
                      to={authBasePath ? `${authBasePath}?tab=signup` : '/signup'}
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
                      {t('buttons.register')}
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
                  {t('auth.continueAgreement')}{' '}
                  <span style={{ color: '#f97316' }}>{t('footer.links.bottom.termsOfService')}</span> {t('common.and')}{' '}
                  <span style={{ color: '#f97316' }}>{t('footer.links.support.privacyPolicy')}</span>.
                </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
