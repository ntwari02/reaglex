import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

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
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #e8edf8 0%, #dce3f5 50%, #e4e8f6 100%)' }}
    >
      {/* Full-page card */}
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'white' }}
      >
        {/* Top bar — mirrors the buyer Navbar */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16 flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {/* Logo — same as Navbar */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full overflow-hidden flex-shrink-0"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
            >
              <img src="/logo.jpg" alt="Reaglex" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-base hidden sm:block" style={{ color: '#1a1a1a', letterSpacing: '-0.3px' }}>
              Reag<span style={{ color: '#ff8c42' }}>lex</span>
            </span>
          </Link>

          {/* Right: language + Sign in / Register tabs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs hidden md:block" style={{ color: '#9ca3af' }}>
              English ∨
            </span>
            <Link
              to="/login"
              className="px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-colors"
              style={{
                color: tab === 'login' ? '#ff8c42' : '#6b7280',
                background: tab === 'login' ? 'rgba(255,140,66,0.08)' : 'transparent',
              }}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all"
              style={{
                color: tab === 'signup' ? 'white' : '#374151',
                background: tab === 'signup' ? 'linear-gradient(135deg,#ff8c42,#ff5f00)' : 'white',
                borderColor: tab === 'signup' ? 'transparent' : '#e5e7eb',
                boxShadow: tab === 'signup' ? '0 4px 14px rgba(255,140,66,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              Register
            </Link>
          </div>
        </div>

        {/* Two-panel body — fills remaining height */}
        <div className="flex flex-col lg:flex-row flex-1">

          {/* ── LEFT: Welcome panel ── */}
          <div
            className="lg:w-[52%] p-8 sm:p-10 lg:p-14 flex flex-col justify-between"
            style={{ background: 'linear-gradient(160deg,#f0f4ff 0%,#e8edf8 100%)', minHeight: '480px' }}
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-black leading-tight mb-3" style={{ color: '#1a1a1a' }}>
                Welcome to<br />
                <span style={{ color: '#ff8c42' }}>Reaglex</span> Platform
              </h1>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#6b7280' }}>
                Here, we believe that building a strong professional network begins with your participation.
                We are delighted to offer a modern and user-friendly service to ensure you have the best experience.
              </p>
              <Link
                to={tab === 'login' ? '/signup' : '/login'}
                className="inline-block mt-4 text-sm font-semibold hover:underline transition"
                style={{ color: '#ff8c42' }}
              >
                {tab === 'login' ? 'Join Now!' : 'Sign In!'}
              </Link>
            </div>

            {/* Illustration */}
            <div className="mt-6 lg:mt-0">
              <IllustrationSVG />
            </div>
          </div>

          {/* ── RIGHT: Form panel ── */}
          <div className="lg:w-[48%] p-8 sm:p-10 lg:p-14 flex flex-col justify-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-6" style={{ color: '#1a1a1a' }}>
              {formTitle}
            </h2>
            {children}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between px-8 py-3 gap-2 border-t text-xs"
          style={{ borderColor: '#f0f2fb', color: '#9ca3af', background: '#fafbff' }}
        >
          <span>© {new Date().getFullYear()} Reaglex. All rights reserved.</span>
          <div className="flex flex-wrap justify-center gap-4">
            {['About','Terms of Use','Privacy Policy','Cookie Policy','Brand Policy'].map(l => (
              <span key={l} className="hover:text-gray-600 cursor-pointer transition">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
