import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Facebook, Twitter, Instagram, Linkedin, Youtube, Music2, Mail, Phone, Clock,
  ChevronRight, Lock, CheckCircle, Building2, Send,
} from 'lucide-react';
import { useSellerAccess, useHandleSellerLink } from '../hooks/useSellerAccess';
import { useTranslation } from '../i18n/useTranslation';
import { useTheme } from '../contexts/ThemeContext';

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

function SellerFooterLink({ label, tooltipLabel, href, protectedLink, onClick }) {
  const [hovered, setHovered] = useState(false);
  const baseColor = '#848aaa';

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        to={href}
        onClick={onClick}
        className="block text-sm leading-[2] transition-colors duration-200 ease-out"
        style={{
          color: hovered ? PRIMARY : baseColor,
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
        }}
      >
        <span>{label}</span>
        {protectedLink && (
          <span
            style={{
              fontSize: 11,
              marginLeft: 6,
              color: 'var(--text-faint)',
            }}
          >
            🔒
          </span>
        )}
      </Link>
      {protectedLink && hovered && (
        <div
          className="absolute -top-2 -translate-y-full left-0 z-20"
        >
          <div
            style={{
              background: '#111420',
              color: '#eceef8',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              boxShadow: 'var(--shadow-md)',
              whiteSpace: 'nowrap',
            }}
          >
            {tooltipLabel}
          </div>
        </div>
      )}
    </div>
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
  { labelKey: 'footer.links.shop.allProducts', href: '/search' },
  { labelKey: 'nav.deals', href: '/search?sort=discount' },
  { labelKey: 'nav.newArrivals', href: '/search?sort=newest' },
  { labelKey: 'footer.links.shop.topRated', href: '/search?sort=rating' },
  { labelKey: 'footer.links.shop.flashSales', href: '/search?sort=discount' },
  { labelKey: 'footer.links.shop.giftCards', href: '/search?q=gift+card' },
  { labelKey: 'footer.links.shop.bulkOrders', href: '/search?q=bulk' },
];

const ACCOUNT_LINKS = [
  { labelKey: 'nav.dashboard', href: '/account' },
  { labelKey: 'nav.orders', href: '/account?tab=orders' },
  { labelKey: 'nav.wishlist', href: '/account?tab=wishlist' },
  { labelKey: 'nav.messages', href: '/messages' },
  { labelKey: 'footer.links.account.myReviews', href: '/account?tab=reviews' },
  { labelKey: 'account.addresses', href: '/account?tab=addresses' },
  { labelKey: 'account.paymentMethods', href: '/account?tab=payment' },
  { labelKey: 'footer.links.account.returnsRefunds', href: '/returns' },
];

const SELL_LINKS = [
  { labelKey: 'header.becomeSeller', href: '/become-seller', protected: false },
  { labelKey: 'header.sellerDashboard', href: '/seller', protected: true },
  { labelKey: 'footer.links.sell.sellerGuidelines', href: '/seller/guidelines', protected: false },
  { labelKey: 'footer.links.sell.feesPricing', href: '/seller/fees', protected: false },
  { labelKey: 'footer.links.sell.sellerProtection', href: '/seller/protection', protected: true },
  { labelKey: 'footer.links.sell.advertiseWithUs', href: '/seller/advertise', protected: false },
];

const SUPPORT_LINKS = [
  { labelKey: 'header.helpCenter', href: '/help' },
  { labelKey: 'footer.links.support.contactUs', href: '/contact' },
  { labelKey: 'nav.trackOrder', href: '/track' },
  { labelKey: 'footer.links.support.faq', href: '/faq' },
  { labelKey: 'footer.links.support.reportProblem', href: '/report-problem' },
  { labelKey: 'header.buyerProtection', href: '/buyer-protection' },
  { labelKey: 'footer.links.support.privacyPolicy', href: '/privacy' },
  { labelKey: 'footer.links.support.cookieSettings', href: '/cookie-settings' },
];

const SOCIAL_LINKS = [
  { icon: Facebook, labelKey: 'footer.social.facebook', href: 'https://facebook.com' },
  { icon: Twitter, labelKey: 'footer.social.twitter', href: 'https://twitter.com' },
  { icon: Instagram, labelKey: 'footer.social.instagram', href: 'https://instagram.com' },
  { icon: Linkedin, labelKey: 'footer.social.linkedin', href: 'https://linkedin.com' },
  { icon: Youtube, labelKey: 'footer.social.youtube', href: 'https://youtube.com' },
  { icon: Music2, labelKey: 'footer.social.tiktok', href: 'https://tiktok.com' },
];

const PAYMENT_LABELS = [
  'footer.payments.visa',
  'footer.payments.mastercard',
  'footer.payments.paypal',
  'footer.payments.mtnMomo',
  'footer.payments.airtelMoney',
  'footer.payments.stripe',
];

const BOTTOM_LINKS = [
  { labelKey: 'footer.links.support.privacyPolicy', href: '/privacy' },
  { labelKey: 'footer.links.bottom.termsOfService', href: '/terms' },
  { labelKey: 'footer.links.bottom.cookies', href: '/cookies' },
  { labelKey: 'footer.links.bottom.sitemap', href: '/sitemap' },
];

export default function Footer() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  const { isLoggedIn, isSeller } = useSellerAccess();
  const handleSellerLink = useHandleSellerLink();

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
          background: isDark ? '#0f111a' : '#f4f4f6',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
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
          <h3 className="font-bold text-2xl mb-1" style={{ color: isDark ? '#e2e4ed' : '#0f172a' }}>
            {t('footer.newsletterTitle')} 🔥
          </h3>
          <p className="text-sm" style={{ color: isDark ? '#9da3be' : '#6b7280' }}>
            {t('footer.newsletterSubtitle')}
          </p>
        </div>
        <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2 flex-shrink-0">
          <div
            className="flex flex-col sm:flex-row gap-0 rounded-full overflow-hidden"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`,
              boxShadow: isDark ? '0 8px 26px rgba(0,0,0,0.35)' : '0 8px 26px rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center gap-2 px-5 py-3 sm:py-0 sm:min-w-[200px] lg:min-w-[320px]">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? '#616680' : '#9ca3af' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder')}
                className="flex-1 min-w-0 py-2.5 sm:py-3 text-sm outline-none bg-transparent"
                style={{ color: isDark ? '#e2e4ed' : '#1a1a1a' }}
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm rounded-r-full transition-colors"
              style={{
                background: isDark ? '#e2e4ed' : '#0f172a',
                color: isDark ? '#0f111a' : '#ffffff',
              }}
            >
              {t('footer.subscribe')} <Send className="w-4 h-4" />
            </motion.button>
          </div>
          <p className="text-xs" style={{ color: isDark ? '#616680' : '#9ca3af' }}>{t('footer.noSpam')}</p>
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
                <span className="font-bold text-2xl tracking-wide" style={{ color: HEADING_COLOR, fontFamily: "'Mea Culpa', serif" }}>
                  Reaglex
                </span>
              </Link>
              <p className="text-sm font-medium mb-1" style={{ color: BODY_COLOR }}>
                {t('footer.brandTagline')}
              </p>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: BODY_COLOR, maxWidth: 280 }}>
                {t('footer.brandDescription')}
              </p>
              <div className="flex flex-wrap gap-2 mb-5">
                <TrustBadge icon={Lock} label={t('footer.badges.securePayments')} />
                <TrustBadge icon={CheckCircle} label={t('footer.badges.verifiedSellers')} />
                <TrustBadge icon={Building2} label={t('footer.badges.escrowProtected')} />
              </div>
              <div className="flex flex-wrap gap-3 mb-5">
                {SOCIAL_LINKS.map(({ icon, labelKey, href }) => (
                  <SocialIcon key={labelKey} href={href} icon={icon} label={t(labelKey)} />
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
                  {t('footer.appStore')}
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
                  {t('footer.googlePlay')}
                </a>
              </div>
            </div>

            {/* COLUMN 2 — Shop */}
            <div>
              <ColumnHeading>{t('nav.shop')}</ColumnHeading>
              <nav className="flex flex-col">
                {SHOP_LINKS.map(({ labelKey, href }) => (
                  <FooterLink key={labelKey} to={href}>{t(labelKey)}</FooterLink>
                ))}
              </nav>
            </div>

            {/* COLUMN 3 — Account */}
            <div>
              <ColumnHeading>{t('nav.account')}</ColumnHeading>
              <nav className="flex flex-col">
                {ACCOUNT_LINKS.map(({ labelKey, href }) => (
                  <FooterLink key={labelKey} to={href}>{t(labelKey)}</FooterLink>
                ))}
              </nav>
            </div>

            {/* COLUMN 4 — Sell on Reaglex */}
            <div>
              <ColumnHeading>{t('footer.sellWithUs')}</ColumnHeading>
              <nav className="flex flex-col mb-4">
                {SELL_LINKS.map(({ labelKey, href, protected: protectedLink }) => (
                  <SellerFooterLink
                    key={labelKey}
                    label={t(labelKey)}
                    tooltipLabel={t('footer.links.sell.sellerAccountRequired')}
                    href={href}
                    protectedLink={protectedLink}
                    onClick={protectedLink
                      ? (e) => {
                          handleSellerLink(e, href);
                        }
                      : undefined}
                  />
                ))}
              </nav>
              <Link
                to={isSeller ? '/seller' : '/become-seller'}
                className="inline-flex items-center justify-center gap-2 w-full font-bold text-white text-[15px] tracking-[0.03em] footer-cta transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, #ff8c2a, ${PRIMARY}, #ea580c)`,
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                }}
              >
                {t('footer.startSellingToday')}
                <ChevronRight className="w-4 h-4 footer-cta-icon" />
              </Link>
            </div>

            {/* COLUMN 5 — Support */}
            <div>
              <ColumnHeading>{t('nav.help')}</ColumnHeading>
              <nav className="flex flex-col mb-6">
                {SUPPORT_LINKS.map(({ labelKey, href }) => {
                  if (href === '/help') {
                    return (
                      <button
                        key={labelKey}
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('reaglex-open-help-chat'))}
                        className="text-sm mb-1 text-left"
                        style={{ color: BODY_COLOR, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                      >
                        {t(labelKey)}
                      </button>
                    );
                  }
                  return (
                    <FooterLink key={labelKey} to={href}>{t(labelKey)}</FooterLink>
                  );
                })}
              </nav>
              <div className="space-y-2 text-sm" style={{ color: BODY_COLOR }}>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                  reaglerobust2020@gmail.com
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                  +250787057751
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: PRIMARY }} />
                  {t('footer.supportHours')}
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
          © {currentYear} <span style={{ fontFamily: "'Mea Culpa', serif", fontWeight: 700, fontSize: '1.05em' }}>Reaglex</span>. {t('footer.rightsReservedPrefix')} <span className="footer-heart">❤️</span> {t('footer.rightsReservedSuffix')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
          {PAYMENT_LABELS.map((labelKey) => (
            <span
              key={labelKey}
              className="footer-payment-badge px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: 'rgba(255,255,255,0.08)', color: BODY_COLOR }}
            >
              {t(labelKey)}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 order-3 text-[13px]" style={{ color: BODY_COLOR }}>
          {BOTTOM_LINKS.map(({ labelKey, href }, i) => (
            <span key={labelKey} className="flex items-center gap-2">
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
                {t(labelKey)}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </motion.footer>
  );
}
