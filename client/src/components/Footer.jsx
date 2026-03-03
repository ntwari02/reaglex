import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Facebook, Twitter, Instagram, Linkedin, Youtube, Music2, Mail, Phone, Clock,
  ChevronRight, Lock, CheckCircle, Building2, Send,
} from 'lucide-react';

const PRIMARY = '#f97316';
const FOOTER_BG = 'linear-gradient(180deg, #020617, #0f172a)';
const BOTTOM_BG = '#080810';
const BODY_COLOR = '#9ca3af';
const HEADING_COLOR = '#ffffff';

// Column heading with animated orange underline
function ColumnHeading({ children }) {
  return (
    <div className="mb-6">
      <h4
        className="footer-heading font-bold uppercase tracking-[0.24em] mb-2"
        style={{ color: HEADING_COLOR, fontSize: 12 }}
      >
        {children}
      </h4>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: 24 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="h-0.5 rounded-full"
        style={{ background: PRIMARY }}
      />
    </div>
  );
}

// Footer link with hover
function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="footer-link block text-sm leading-[2] transition-all duration-200 ease-out hover:translate-x-1"
      style={{
        color: BODY_COLOR,
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
      }}
    >
      {children}
    </Link>
  );
}

// Social icon circle
function SocialIcon({ href, icon: Icon, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="footer-social-icon flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ease-out"
      style={{
        boxShadow: 'none',
        color: BODY_COLOR,
        border: 'none',
        outline: 'none',
      }}
    >
      <Icon className="w-4 h-4" strokeWidth={2} />
    </a>
  );
}

// Trust badge pill
function TrustBadge({ icon: Icon, label }) {
  return (
    <span
      className="footer-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        background: 'rgba(255,255,255,0.08)',
        color: BODY_COLOR,
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <Icon className="footer-badge-icon w-3.5 h-3.5 flex-shrink-0" style={{ color: PRIMARY }} />
      {label}
    </span>
  );
}

const SHOP_LINKS = [
  { label: 'All Products', href: '/search' },
  { label: "Today's Deals 🔥", href: '/search?sort=discount' },
  { label: "New Arrivals ✨", href: '/search?sort=newest' },
  { label: 'Top Rated ⭐', href: '/search?sort=rating' },
  { label: 'Flash Sales ⚡', href: '/search?sort=discount' },
  { label: 'Gift Cards 🎁', href: '/search?q=gift+card' },
  { label: 'Bulk Orders', href: '/search?q=bulk' },
];

const ACCOUNT_LINKS = [
  { label: 'My Dashboard', href: '/account' },
  { label: 'My Orders', href: '/account?tab=orders' },
  { label: 'Wishlist', href: '/account?tab=wishlist' },
  { label: 'Messages', href: '/messages' },
  { label: 'My Reviews', href: '/account?tab=reviews' },
  { label: 'Addresses', href: '/account?tab=addresses' },
  { label: 'Payment Methods', href: '/account?tab=payment' },
  { label: 'Returns & Refunds', href: '/returns' },
];

const SELL_LINKS = [
  { label: 'Become a Seller', href: '/seller' },
  { label: 'Seller Dashboard', href: '/seller' },
  { label: 'Seller Guidelines', href: '/seller#guidelines' },
  { label: 'Fees & Pricing', href: '/seller#fees' },
  { label: 'Seller Protection', href: '/seller#protection' },
  { label: 'Advertise with Us', href: '/seller#advertise' },
];

const SUPPORT_LINKS = [
  { label: 'Help Center', href: '/help' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Track My Order', href: '/track' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Report a Problem', href: '/report' },
  { label: 'Buyer Protection', href: '/protection' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Cookie Settings', href: '/cookies' },
];

const SOCIAL_LINKS = [
  { icon: Facebook, label: 'Facebook', href: 'https://facebook.com' },
  { icon: Twitter, label: 'Twitter / X', href: 'https://twitter.com' },
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com' },
  { icon: Youtube, label: 'YouTube', href: 'https://youtube.com' },
  { icon: Music2, label: 'TikTok', href: 'https://tiktok.com' },
];

const PAYMENT_LABELS = ['Visa', 'Mastercard', 'PayPal', 'MTN MoMo', 'Airtel Money', 'Stripe'];

const BOTTOM_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookies', href: '/cookies' },
  { label: 'Sitemap', href: '/sitemap' },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      // Placeholder: wire to your newsletter API
      setEmail('');
    }
  };

  return (
    <motion.footer
      className="footer"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* ═══ TIER 2: Newsletter (above main footer) ═══ */}
      <div
        className="relative w-full flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-4 sm:px-6 lg:px-20 py-10"
        style={{
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          paddingLeft: 'clamp(1rem, 5vw, 80px)',
          paddingRight: 'clamp(1rem, 5vw, 80px)',
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        {/* Soft dot pattern overlay (matches account banner) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.08]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="footer-newsletter-dots" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="0.8" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footer-newsletter-dots)" />
          </svg>
        </div>

        <div>
          <h3 className="font-bold text-2xl text-white mb-1">
            Get the Best Deals First! 🔥
          </h3>
          <p className="text-white text-sm opacity-90">
            Subscribe and never miss a flash sale or new arrival
          </p>
        </div>
        <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-0 rounded-full overflow-hidden bg-white/95 shadow-lg">
            <div className="flex items-center gap-2 px-5 py-3 sm:py-0 sm:min-w-[200px] lg:min-w-[320px]">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="flex-1 min-w-0 py-2.5 sm:py-3 text-sm outline-none bg-transparent"
                style={{ color: '#1a1a1a' }}
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 px-6 py-3 font-bold text-white text-sm rounded-r-full transition-colors"
              style={{ background: BOTTOM_BG }}
            >
              Subscribe <Send className="w-4 h-4" />
            </motion.button>
          </div>
          <p className="text-white text-xs opacity-70">No spam. Unsubscribe anytime.</p>
        </form>
      </div>

      {/* ═══ TIER 1: Main footer body ═══ */}
      <div
        className="footer-main w-full px-4 sm:px-6 lg:px-20"
        style={{
          background: FOOTER_BG,
          paddingTop: 72,
          paddingBottom: 48,
          paddingLeft: 'clamp(1rem, 5vw, 80px)',
          paddingRight: 'clamp(1rem, 5vw, 80px)',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.05) inset',
        }}
      >
        <div className="footer-grid">
            {/* COLUMN 1 — Brand (wider on large) */}
            <div className="footer-brand-col">
              <Link
                to="/"
                className="inline-flex items-center gap-2 mb-4"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
              >
                <img
                  src="/logo.jpg"
                  alt="Reaglex"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <span className="font-bold text-lg tracking-wide" style={{ color: HEADING_COLOR }}>
                  REAGLEX
                </span>
              </Link>
              <p className="text-sm font-medium mb-1" style={{ color: BODY_COLOR }}>
                Smart Shopping. Trusted Sellers. Fast Delivery.
              </p>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: BODY_COLOR, maxWidth: 280 }}>
                Reaglex is a premium marketplace connecting buyers and sellers worldwide with escrow protection.
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                <TrustBadge icon={Lock} label="Secure Payments" />
                <TrustBadge icon={CheckCircle} label="Verified Sellers" />
                <TrustBadge icon={Building2} label="Escrow Protected" />
              </div>
              <div className="flex flex-wrap gap-3 mb-5">
                {SOCIAL_LINKS.map(({ icon, label, href }) => (
                  <SocialIcon key={label} href={href} icon={icon} label={label} />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="#"
                  className="footer-app-btn inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition opacity-90 hover:opacity-100"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                >
                  🍎 App Store
                </a>
                <a
                  href="#"
                  className="footer-app-btn inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition opacity-90 hover:opacity-100"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                >
                  ▶ Google Play
                </a>
              </div>
            </div>

            {/* COLUMN 2 — Shop */}
            <div>
              <ColumnHeading>Shop</ColumnHeading>
              <nav className="flex flex-col">
                {SHOP_LINKS.map(({ label, href }) => (
                  <FooterLink key={label} to={href}>{label}</FooterLink>
                ))}
              </nav>
            </div>

            {/* COLUMN 3 — Account */}
            <div>
              <ColumnHeading>Account</ColumnHeading>
              <nav className="flex flex-col">
                {ACCOUNT_LINKS.map(({ label, href }) => (
                  <FooterLink key={label} to={href}>{label}</FooterLink>
                ))}
              </nav>
            </div>

            {/* COLUMN 4 — Sell on Reaglex */}
            <div>
              <ColumnHeading>Sell with us</ColumnHeading>
              <nav className="flex flex-col mb-4">
                {SELL_LINKS.map(({ label, href }) => (
                  <FooterLink key={label} to={href}>{label}</FooterLink>
                ))}
              </nav>
              <Link
                to="/seller"
                className="inline-flex items-center justify-center gap-2 w-full font-bold text-white text-[15px] tracking-[0.03em] footer-cta transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, #ff8c2a, ${PRIMARY}, #ea580c)`,
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                }}
              >
                Start Selling Today
                <ChevronRight className="w-4 h-4 footer-cta-icon" />
              </Link>
            </div>

            {/* COLUMN 5 — Support */}
            <div>
              <ColumnHeading>Support</ColumnHeading>
              <nav className="flex flex-col mb-6">
                {SUPPORT_LINKS.map(({ label, href }) => (
                  <FooterLink key={label} to={href}>{label}</FooterLink>
                ))}
              </nav>
              <div className="space-y-2 text-sm" style={{ color: BODY_COLOR }}>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                  support@reaglex.com
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                  +250 xxx xxx xxx
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                  Mon–Fri, 8am–6pm (CAT)
                </p>
              </div>
            </div>
          </div>

        <style>{`
          .footer-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 40px;
          }
          @media (min-width: 768px) {
            .footer-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (min-width: 1024px) {
            .footer-grid {
              grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
            }
            .footer-brand-col { grid-column: span 1; }
          }
        `}</style>
      </div>

      {/* ═══ TIER 3: Bottom bar ═══ */}
      <div
        className="footer-bottom w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6 lg:px-20 py-3 min-h-[52px]"
        style={{
          background: BOTTOM_BG,
          boxShadow: '0 -1px 0 rgba(255,255,255,0.06)',
          paddingLeft: 'clamp(1rem, 5vw, 80px)',
          paddingRight: 'clamp(1rem, 5vw, 80px)',
        }}
      >
        <p className="footer-bottom-text text-[13px] order-2 sm:order-1 text-center sm:text-left" style={{ color: BODY_COLOR }}>
          © {currentYear} Reaglex. All rights reserved. Made with <span className="footer-heart">❤️</span> in Rwanda 🇷🇼
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
          {PAYMENT_LABELS.map((label) => (
            <span
              key={label}
              className="footer-payment-badge px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', color: BODY_COLOR }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 order-3 text-[13px]" style={{ color: BODY_COLOR }}>
          {BOTTOM_LINKS.map(({ label, href }, i) => (
            <span key={label} className="flex items-center gap-2">
              {i > 0 && <span className="opacity-50">·</span>}
              <Link
                to={href}
                className="transition-colors duration-200 hover:text-white"
                style={{
                  color: 'inherit',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                }}
              >
                {label}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </motion.footer>
  );
}
