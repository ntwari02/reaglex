import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Facebook, Twitter, Instagram, Linkedin, Youtube, Music2, Mail, Phone, Clock,
  ChevronRight, Lock, CheckCircle, Building2, Send,
} from 'lucide-react';
import { useSellerAccess, useHandleSellerLink } from '../hooks/useSellerAccess';
import { useTranslation } from '../i18n/useTranslation';
import { API_BASE_URL } from '../lib/config';
import { useToastStore } from '../stores/toastStore';

// Column heading with animated brand underline
function ColumnHeading({ children }) {
  return (
    <div className="mb-6">
      <h4
        className="footer-heading font-bold uppercase tracking-[0.24em] mb-2"
        style={{ color: 'var(--footer-on-dark-heading)', fontSize: 12 }}
      >
        {children}
      </h4>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: 24 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="h-0.5 rounded-full"
        style={{ background: 'var(--brand-primary)' }}
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
        color: 'var(--footer-on-dark-body)',
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
          color: hovered ? 'var(--brand-primary)' : 'var(--footer-sell-link-idle)',
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
              background: 'var(--footer-tooltip-bg)',
              color: 'var(--footer-tooltip-text)',
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
      className="footer-social-icon flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ease-out hover:text-[var(--footer-on-dark-link-hover)]"
      style={{
        boxShadow: 'none',
        color: 'var(--footer-on-dark-body)',
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
        background: 'var(--footer-badge-bg)',
        color: 'var(--footer-on-dark-body)',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <Icon className="footer-badge-icon w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
      {label}
    </span>
  );
}

const SHOP_LINKS = [
  { labelKey: 'footer.links.shop.allProducts', href: '/products' },
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
  { labelKey: 'footer.links.shop.aboutSpacilly', href: '/about' },
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

const toDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const PAYMENT_ICONS = [
  {
    id: 'visa',
    label: 'Visa',
    src: toDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="36" viewBox="0 0 120 36">
        <rect width="120" height="36" rx="8" fill="#ffffff"/>
        <text x="60" y="24" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#1A1F71">VISA</text>
      </svg>
    `),
  },
  {
    id: 'mtn-momo',
    label: 'MTN MoMo',
    src: toDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="36" viewBox="0 0 160 36">
        <rect width="160" height="36" rx="8" fill="#ffffff"/>
        <ellipse cx="28" cy="18" rx="19" ry="13" fill="#FFCC00" stroke="#222222" stroke-width="1.4"/>
        <text x="28" y="22" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#111111">MTN</text>
        <text x="102" y="23" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="#111111">MoMo</text>
      </svg>
    `),
  },
];

const BOTTOM_LINKS = [
  { labelKey: 'footer.links.support.privacyPolicy', href: '/privacy' },
  { labelKey: 'footer.links.bottom.termsOfService', href: '/terms' },
  { labelKey: 'footer.links.bottom.cookies', href: '/cookies' },
  { labelKey: 'footer.links.bottom.sitemap', href: '/sitemap' },
];

export default function Footer() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.showToast);
  const currentYear = new Date().getFullYear();
  const { isSeller } = useSellerAccess();
  const handleSellerLink = useHandleSellerLink();

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      showToast(t('footer.subscribeErrorEmpty'), 'warning');
      return;
    }
    if (!API_BASE_URL) {
      showToast(t('footer.subscribeError'), 'error');
      return;
    }
    setNewsletterSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ email: trimmed, source: 'footer' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || t('footer.subscribeError'), 'error');
        return;
      }
      if (data.alreadySubscribed) {
        showToast(data.message || t('footer.subscribeAlready'), 'info');
        return;
      }
      if (data.emailSent === false) {
        showToast(data.message || t('footer.subscribePartial'), 'warning');
      } else {
        showToast(data.message || t('footer.subscribeSuccess'), 'success');
      }
      setEmail('');
    } catch {
      showToast(t('footer.subscribeError'), 'error');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <motion.footer
      className="footer"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* ═══ TIER 2: Newsletter (above main footer) ═══ */}
      <div
        className="relative w-full flex flex-col md:flex-row md:items-center md:justify-between gap-6 px-4 sm:px-6 lg:px-20 py-10"
        style={{
          background: 'var(--footer-newsletter-bg)',
          borderTop: `1px solid var(--footer-newsletter-edge)`,
          borderBottom: `1px solid var(--footer-newsletter-edge)`,
          paddingLeft: 'clamp(1rem, 5vw, 80px)',
          paddingRight: 'clamp(1rem, 5vw, 80px)',
          paddingTop: 40,
          paddingBottom: 40,
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.08]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="footer-newsletter-dots" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="0.8" fill="var(--text-muted)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footer-newsletter-dots)" />
          </svg>
        </div>

        <div>
          <h3 className="font-bold text-2xl mb-1" style={{ color: 'var(--footer-newsletter-title)' }}>
            {t('footer.newsletterTitle')} 🔥
          </h3>
          <p className="text-sm" style={{ color: 'var(--footer-newsletter-muted)' }}>
            {t('footer.newsletterSubtitle')}
          </p>
        </div>
        <form
          onSubmit={handleNewsletterSubmit}
          className="flex w-full max-w-full flex-col gap-2 flex-shrink-0 md:w-auto md:max-w-[min(100%,28rem)] lg:max-w-[min(100%,36rem)]"
        >
          <div
            className="flex flex-col sm:flex-row gap-0 overflow-hidden rounded-2xl sm:rounded-full"
            style={{
              background: 'var(--footer-newsletter-form-bg)',
              border: `1px solid var(--footer-newsletter-form-border)`,
              boxShadow: 'var(--footer-newsletter-form-shadow)',
            }}
          >
            <div className="flex min-w-0 w-full items-center gap-2 px-5 py-3 sm:min-w-[200px] sm:py-0 lg:min-w-[320px]">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--footer-newsletter-icon)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder')}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none ring-0 sm:py-3"
                style={{ color: 'var(--footer-newsletter-input)' }}
              />
            </div>
            <div
              className="h-px w-full shrink-0 sm:hidden"
              style={{ background: 'var(--footer-newsletter-form-border)' }}
              aria-hidden
            />
            <motion.button
              type="submit"
              disabled={newsletterSubmitting}
              aria-busy={newsletterSubmitting}
              whileHover={newsletterSubmitting ? undefined : { scale: 1.02 }}
              whileTap={newsletterSubmitting ? undefined : { scale: 0.98 }}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-b-2xl px-6 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-b-none sm:rounded-r-full sm:border-l"
              style={{
                background: 'var(--footer-newsletter-btn-bg)',
                color: 'var(--footer-newsletter-btn-text)',
                borderLeftColor: 'var(--footer-newsletter-form-border)',
              }}
            >
              {newsletterSubmitting ? t('footer.subscribeSending') : t('footer.subscribe')}{' '}
              <Send className="w-4 h-4" aria-hidden />
            </motion.button>
          </div>
          <p className="text-xs" style={{ color: 'var(--footer-newsletter-icon)' }}>{t('footer.noSpam')}</p>
        </form>
      </div>

      {/* ═══ TIER 1: Main footer body ═══ */}
      <div
        className="footer-main w-full px-4 sm:px-6 lg:px-20"
        style={{
          background: 'var(--footer-main-bg)',
          paddingTop: 72,
          paddingBottom: 48,
          paddingLeft: 'clamp(1rem, 5vw, 80px)',
          paddingRight: 'clamp(1rem, 5vw, 80px)',
          boxShadow: 'inset 0 -1px 0 var(--footer-inset-line)',
        }}
      >
        <div className="footer-grid">
            <div className="footer-brand-col">
              <Link
                to="/"
                className="inline-flex items-center gap-2 mb-4"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
              >
                <img
                  src="/logo.jpg"
                  alt="Spacilly"
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <span className="spacilly-logo-font font-bold text-2xl tracking-wide" style={{ color: 'var(--footer-on-dark-heading)' }}>
                  Spacilly
                </span>
              </Link>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--footer-on-dark-body)' }}>
                {t('footer.brandTagline')}
              </p>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--footer-on-dark-body)', maxWidth: 280 }}>
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
                    background: 'var(--footer-app-btn-bg)',
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
                    background: 'var(--footer-app-btn-bg)',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                >
                  {t('footer.googlePlay')}
                </a>
              </div>
            </div>

            <div>
              <ColumnHeading>{t('nav.shop')}</ColumnHeading>
              <nav className="flex flex-col">
                {SHOP_LINKS.map(({ labelKey, href }) => (
                  <FooterLink key={labelKey} to={href}>{t(labelKey)}</FooterLink>
                ))}
              </nav>
            </div>

            <div>
              <ColumnHeading>{t('nav.account')}</ColumnHeading>
              <nav className="flex flex-col">
                {ACCOUNT_LINKS.map(({ labelKey, href }) => (
                  <FooterLink key={labelKey} to={href}>{t(labelKey)}</FooterLink>
                ))}
              </nav>
            </div>

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
                  background: 'var(--gradient-brand-cta)',
                  boxShadow: 'var(--shadow-cta)',
                  border: 'none',
                  outline: 'none',
                }}
              >
                {t('footer.startSellingToday')}
                <ChevronRight className="w-4 h-4 footer-cta-icon" />
              </Link>
            </div>

            <div>
              <ColumnHeading>{t('nav.help')}</ColumnHeading>
              <nav className="flex flex-col mb-6">
                {SUPPORT_LINKS.map(({ labelKey, href }) => {
                  if (href === '/help') {
                    return (
                      <button
                        key={labelKey}
                        type="button"
                        onClick={() => window.dispatchEvent(new Event('spacilly:assistant:open'))}
                        className="text-sm mb-1 text-left"
                        style={{ color: 'var(--footer-on-dark-body)', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
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
              <div className="space-y-2 text-sm" style={{ color: 'var(--footer-on-dark-body)' }}>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  reaglerobust2020@gmail.com
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  +250787057751
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
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
          background: 'var(--footer-bottom-bg)',
          boxShadow: 'inset 0 1px 0 var(--footer-inset-line)',
          paddingLeft: 'clamp(1rem, 5vw, 80px)',
          paddingRight: 'clamp(1rem, 5vw, 80px)',
        }}
      >
        <p className="footer-bottom-text text-[13px] order-2 sm:order-1 text-center sm:text-left" style={{ color: 'var(--footer-on-dark-body)' }}>
          © {currentYear} <span className="spacilly-logo-font" style={{ fontWeight: 700, fontSize: '1.05em' }}>Spacilly</span>. {t('footer.rightsReservedPrefix')} <span className="footer-heart">❤️</span> {t('footer.rightsReservedSuffix')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
          {PAYMENT_ICONS.map((payment) => (
            <span
              key={payment.id}
              className="footer-payment-badge px-2.5 py-1 rounded-full inline-flex items-center justify-center"
              style={{
                background: 'var(--footer-payment-bg)',
                border: '1px solid var(--footer-payment-border)',
                minHeight: 28,
                minWidth: payment.id === 'visa' ? 76 : 98,
              }}
            >
              <img
                src={payment.src}
                alt={payment.label}
                loading="lazy"
                decoding="async"
                style={{
                  height: payment.id === 'visa' ? 14 : 16,
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  filter: payment.id === 'mtn-momo' ? 'grayscale(0.05) contrast(1.02)' : 'none',
                }}
              />
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 order-3 text-[13px]" style={{ color: 'var(--footer-on-dark-body)' }}>
          {BOTTOM_LINKS.map(({ labelKey, href }, i) => (
            <span key={labelKey} className="flex items-center gap-2">
              {i > 0 && <span className="opacity-50">·</span>}
              <Link
                to={href}
                className="transition-colors duration-200 hover:text-[var(--footer-on-dark-link-hover)]"
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
