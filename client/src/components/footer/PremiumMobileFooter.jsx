import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  ArrowRight,
  ChevronDown,
  Shield,
  Store,
  Headphones,
  Building2,
  Scale,
  UserPlus,
  Mail,
  Send,
  Lock,
  Zap,
  Users,
  Globe,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  LayoutGrid,
  Sparkles,
  Star,
  Flame,
  TrendingUp,
  LayoutDashboard,
} from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { useHandleSellerLink } from '../../hooks/useSellerAccess';
import { API_BASE_URL } from '../../lib/config';
import { useToastStore } from '../../stores/toastStore';
import '../../styles/premium-mobile-footer.css';

function DiscordIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TikTokIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

const ACCORDION_SECTIONS = [
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: Store,
    tone: 'orange',
    defaultOpen: true,
    links: [
      { label: 'All Categories', to: '/products', icon: LayoutGrid },
      { label: 'New Arrivals', to: '/search?sort=newest', icon: Sparkles },
      { label: 'Top Sellers', to: '/search?sort=rating', icon: Star },
      { label: 'Flash Deals', to: '/search?sort=discount', icon: Flame, hot: true },
      { label: 'Trending Products', to: '/search?sort=trending', icon: TrendingUp },
      { label: 'Become a Seller', to: '/become-seller', icon: UserPlus },
      { label: 'Seller Dashboard', to: '/seller', icon: LayoutDashboard, sellerOnly: true },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    icon: Headphones,
    tone: 'purple',
    links: [
      { label: 'Help Center', to: '/help', assistant: true },
      { label: 'Contact Us', to: '/contact', icon: Mail },
      { label: 'FAQ', to: '/faq', icon: Headphones },
      { label: 'Track Order', to: '/track', icon: ArrowRight },
      { label: 'Buyer Protection', to: '/buyer-protection', icon: Shield },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    icon: Building2,
    tone: 'blue',
    links: [
      { label: 'About Spacilly', to: '/about', icon: Building2 },
      { label: 'Careers', to: '/about', icon: Users },
      { label: 'Press', to: '/about', icon: Globe },
      { label: 'Blog', to: '/about', icon: LayoutGrid },
    ],
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: Scale,
    tone: 'green',
    links: [
      { label: 'Privacy Policy', to: '/privacy', icon: Lock },
      { label: 'Terms of Service', to: '/terms', icon: Scale },
      { label: 'Cookies', to: '/cookies', icon: Shield },
      { label: 'Sitemap', to: '/sitemap', icon: LayoutGrid },
    ],
  },
  {
    id: 'seller',
    label: 'Become a Seller',
    icon: UserPlus,
    tone: 'orange',
    links: [
      { label: 'Become a Seller', to: '/become-seller', icon: UserPlus },
      { label: 'Seller Guidelines', to: '/seller/guidelines', icon: Store },
      { label: 'Fees & Pricing', to: '/seller/fees', icon: Star },
      { label: 'Seller Protection', to: '/seller/protection', icon: Shield, sellerOnly: true },
    ],
  },
];

const SOCIALS = [
  { icon: Instagram, label: 'Instagram', href: 'https://instagram.com' },
  { icon: Twitter, label: 'X', href: 'https://twitter.com' },
  { icon: TikTokIcon, label: 'TikTok', href: 'https://tiktok.com', custom: true },
  { icon: Youtube, label: 'YouTube', href: 'https://youtube.com' },
  { icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com' },
  { icon: DiscordIcon, label: 'Discord', href: 'https://discord.com', custom: true },
];

const PAYMENTS = [
  { id: 'visa', label: 'Visa', className: 'rx-mfooter-pay-badge--visa' },
  { id: 'mc', label: 'MC', className: 'rx-mfooter-pay-badge--mc' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'apple', label: 'Apple Pay' },
  { id: 'google', label: 'G Pay' },
];

function AccordionLink({ link, onSellerClick }) {
  const Icon = link.icon || ArrowRight;

  if (link.assistant) {
    return (
      <button
        type="button"
        className="rx-mfooter-link-row w-full"
        onClick={() => window.dispatchEvent(new Event('spacilly:assistant:open'))}
      >
        <span className="rx-mfooter-link-icon">
          <Headphones size={14} />
        </span>
        <span className="rx-mfooter-link-label">{link.label}</span>
        <ArrowRight size={14} className="opacity-40" />
      </button>
    );
  }

  return (
    <Link
      to={link.to}
      className="rx-mfooter-link-row"
      onClick={link.sellerOnly ? (e) => onSellerClick(e, link.to) : undefined}
    >
      <span className="rx-mfooter-link-icon">
        <Icon size={14} />
      </span>
      <span className="rx-mfooter-link-label">{link.label}</span>
      {link.hot && <span className="rx-mfooter-hot">HOT</span>}
      <ArrowRight size={14} className="opacity-40" />
    </Link>
  );
}

export default function PremiumMobileFooter() {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const handleSellerLink = useHandleSellerLink();
  const [openId, setOpenId] = useState('marketplace');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const year = new Date().getFullYear();

  const scrollTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleSection = (id) => {
    setOpenId((prev) => (prev === id ? '' : id));
  };

  const handleNewsletter = async (e) => {
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
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ email: trimmed, source: 'mobile-footer' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || t('footer.subscribeError'), 'error');
        return;
      }
      showToast(data.message || t('footer.subscribeSuccess'), 'success');
      setEmail('');
    } catch {
      showToast(t('footer.subscribeError'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const brandDesc =
    'Premium marketplace connecting buyers and sellers worldwide with secure escrow protection.';

  return (
    <footer className="rx-mfooter" aria-label="Site footer">
      <div className="rx-mfooter-shell">
        <div className="rx-mfooter-bg" aria-hidden />
        <div className="rx-mfooter-glow-purple" aria-hidden />
        <div className="rx-mfooter-glow-orange" aria-hidden />
        <div className="rx-mfooter-glow-blue" aria-hidden />

        <div className="rx-mfooter-inner">
          <header className="rx-mfooter-head">
            <Link to="/" className="rx-mfooter-brand">
              <span className="rx-mfooter-logo-mark" aria-hidden>
                S
              </span>
              <span className="rx-mfooter-logo-text">Spacilly</span>
            </Link>
            <button type="button" className="rx-mfooter-top-btn" onClick={scrollTop} aria-label="Back to top">
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </header>

          <p className="rx-mfooter-desc">{brandDesc}</p>

          <div className="rx-mfooter-glass rx-mfooter-trust">
            <div className="rx-mfooter-trust-icon">
              <Shield size={20} strokeWidth={2.2} />
            </div>
            <div>
              <p className="rx-mfooter-trust-title">Escrow Protected</p>
              <p className="rx-mfooter-trust-sub">Your money is 100% safe</p>
            </div>
          </div>

          <div className="rx-mfooter-glass rx-mfooter-accordion">
            {ACCORDION_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isOpen = openId === section.id;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    className="rx-mfooter-acc-row"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isOpen}
                  >
                    <span className={`rx-mfooter-acc-icon rx-mfooter-acc-icon--${section.tone}`}>
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <span className="rx-mfooter-acc-label">{section.label}</span>
                    <ChevronDown
                      size={18}
                      className={`rx-mfooter-acc-chevron${isOpen ? ' rx-mfooter-acc-chevron--open' : ''}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="overflow-hidden"
                      >
                        <div className="rx-mfooter-acc-panel">
                          {section.links.map((link) => (
                            <AccordionLink
                              key={`${section.id}-${link.label}`}
                              link={link}
                              onSellerClick={handleSellerLink}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="rx-mfooter-glass rx-mfooter-subscribe">
            <div className="rx-mfooter-sub-head">
              <div className="rx-mfooter-mail-icon">
                <Mail size={20} />
              </div>
              <div>
                <p className="rx-mfooter-sub-title">Stay Updated</p>
                <p className="rx-mfooter-sub-desc">
                  Get exclusive deals, new arrivals and important updates.
                </p>
              </div>
            </div>
            <form onSubmit={handleNewsletter}>
              <div className="rx-mfooter-sub-row">
                <input
                  type="email"
                  className="rx-mfooter-email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <button type="submit" className="rx-mfooter-sub-btn" disabled={submitting}>
                  {submitting ? t('footer.subscribeSending') : 'Subscribe'}
                  <Send size={14} aria-hidden />
                </button>
              </div>
              <p className="rx-mfooter-privacy">
                <Lock size={12} />
                {t('footer.noSpam')}
              </p>
            </form>
          </div>

          <div className="rx-mfooter-features">
            <div className="rx-mfooter-feat">
              <div className="rx-mfooter-feat-icon rx-mfooter-feat-icon--purple">
                <Shield size={16} />
              </div>
              <div className="rx-mfooter-feat-copy">
                <p className="rx-mfooter-feat-title">Secure Payments</p>
                <p className="rx-mfooter-feat-sub">100% safe transactions</p>
              </div>
            </div>
            <div className="rx-mfooter-feat">
              <div className="rx-mfooter-feat-icon rx-mfooter-feat-icon--orange">
                <Zap size={16} />
              </div>
              <div className="rx-mfooter-feat-copy">
                <p className="rx-mfooter-feat-title">Fast Delivery</p>
                <p className="rx-mfooter-feat-sub">Quick & reliable shipping</p>
              </div>
            </div>
            <div className="rx-mfooter-feat">
              <div className="rx-mfooter-feat-icon rx-mfooter-feat-icon--blue">
                <Users size={16} />
              </div>
              <div className="rx-mfooter-feat-copy">
                <p className="rx-mfooter-feat-title">Verified Sellers</p>
                <p className="rx-mfooter-feat-sub">Trusted sellers worldwide</p>
              </div>
            </div>
            <div className="rx-mfooter-feat">
              <div className="rx-mfooter-feat-icon rx-mfooter-feat-icon--green">
                <Globe size={16} />
              </div>
              <div className="rx-mfooter-feat-copy">
                <p className="rx-mfooter-feat-title">Global Marketplace</p>
                <p className="rx-mfooter-feat-sub">Available in 120+ countries</p>
              </div>
            </div>
          </div>

          <div className="rx-mfooter-row-split">
            <span className="rx-mfooter-row-label">Follow Us</span>
            <div className="rx-mfooter-socials">
              {SOCIALS.map(({ icon: Icon, label, href, custom }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rx-mfooter-social-btn"
                  aria-label={label}
                >
                  {custom ? <Icon size={16} /> : <Icon size={16} strokeWidth={2} />}
                </a>
              ))}
            </div>
          </div>

          <div className="rx-mfooter-row-split">
            <span className="rx-mfooter-row-label">We Accept</span>
            <div className="rx-mfooter-payments">
              {PAYMENTS.map((p) => (
                <span key={p.id} className={`rx-mfooter-pay-badge ${p.className || ''}`.trim()}>
                  {p.label.trim()}
                </span>
              ))}
            </div>
          </div>

          <div className="rx-mfooter-bottom">
            <p className="rx-mfooter-copy">© {year} Spacilly. All rights reserved.</p>
            <button type="button" className="rx-mfooter-back" onClick={scrollTop}>
              <span>Back to top</span>
              <span className="rx-mfooter-back-arrow">
                <ArrowUp size={14} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
