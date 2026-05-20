import { useState, useCallback, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  Building2,
  ChevronDown,
  ChevronRight,
  Globe,
  Grid3X3,
  Headphones,
  Instagram,
  LayoutDashboard,
  Linkedin,
  Lock,
  Mail,
  Send,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Youtube,
  Zap,
} from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { API_BASE_URL } from '../../lib/config';
import { useToastStore } from '../../stores/toastStore';
import { useHandleSellerLink } from '../../hooks/useSellerAccess';
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.5a8.28 8.28 0 0 0 4.77 1.52V6.56a4.85 4.85 0 0 1-1-.13z" />
    </svg>
  );
}

type AccordionId = 'marketplace' | 'support' | 'company' | 'legal' | null;

type AccordionSection = {
  id: AccordionId;
  label: string;
  icon: typeof ShoppingBag;
  tone: 'orange' | 'purple' | 'blue' | 'green';
  chevron: 'down' | 'right';
  href?: string;
};

const MARKETPLACE_LINKS = [
  { label: 'All Categories', labelKey: 'footer.links.shop.allProducts', href: '/products', icon: Grid3X3, tone: 'orange' as const },
  { label: 'New Arrivals', labelKey: 'nav.newArrivals', href: '/search?sort=newest', icon: Sparkles, tone: 'purple' as const },
  { label: 'Top Sellers', labelKey: 'footer.links.shop.topRated', href: '/search?sort=rating', icon: Trophy, tone: 'blue' as const },
  { label: 'Flash Deals', labelKey: 'footer.links.shop.flashSales', href: '/search?sort=discount', icon: Zap, tone: 'orange' as const, hot: true },
  { label: 'Trending Products', href: '/search?sort=trending', icon: TrendingUp, tone: 'green' as const },
  { labelKey: 'header.becomeSeller', href: '/become-seller', icon: UserPlus, tone: 'orange' as const },
  { labelKey: 'header.sellerDashboard', href: '/seller', icon: LayoutDashboard, tone: 'blue' as const, seller: true },
];

function AccordionRow({
  section,
  open,
  onToggle,
  children,
}: {
  section: AccordionSection;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const Icon = section.icon;
  const content = (
    <>
      <span className={`pmf-acc-icon pmf-acc-icon--${section.tone}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <span className="pmf-acc-label">{section.label}</span>
      {section.chevron === 'right' ? (
        <ChevronRight size={18} className="pmf-acc-chevron" aria-hidden />
      ) : (
        <ChevronDown
          size={18}
          className={`pmf-acc-chevron${open ? ' is-open' : ''}`}
          aria-hidden
        />
      )}
    </>
  );

  if (section.href) {
    return (
      <Link to={section.href} className="pmf-acc-row">
        {content}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className="pmf-acc-row"
        onClick={onToggle}
        aria-expanded={open}
      >
        {content}
      </button>
      {open && children ? <div className="pmf-acc-panel">{children}</div> : null}
    </>
  );
}

export default function PremiumMobileFooter() {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const handleSellerLink = useHandleSellerLink();
  const [openSection, setOpenSection] = useState<AccordionId>('marketplace');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  const toggle = useCallback((id: AccordionId) => {
    setOpenSection((prev) => (prev === id ? null : id));
  }, []);

  const sections: AccordionSection[] = [
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, tone: 'orange', chevron: 'down' },
    { id: 'support', label: 'Support', icon: Headphones, tone: 'purple', chevron: 'down' },
    { id: 'company', label: 'Company', icon: Building2, tone: 'blue', chevron: 'down' },
    { id: 'legal', label: 'Legal', icon: ShieldCheck, tone: 'green', chevron: 'down' },
    { id: null, label: 'Become a Seller', icon: UserPlus, tone: 'orange', chevron: 'right', href: '/become-seller' },
  ];

  const handleNewsletter = async (e: FormEvent) => {
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
        body: JSON.stringify({ email: trimmed, source: 'footer-premium-mobile' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data?.message || t('footer.subscribeError'), 'error');
        return;
      }
      if (data.alreadySubscribed) {
        showToast(data.message || t('footer.subscribeAlready'), 'info');
      } else if (data.emailSent === false) {
        showToast(data.message || t('footer.subscribePartial'), 'warning');
      } else {
        showToast(data.message || t('footer.subscribeSuccess'), 'success');
      }
      setEmail('');
    } catch {
      showToast(t('footer.subscribeError'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const socials = [
    { href: 'https://instagram.com', label: 'Instagram', icon: <Instagram size={15} strokeWidth={2} /> },
    { href: 'https://twitter.com', label: 'X', icon: <XIcon /> },
    { href: 'https://tiktok.com', label: 'TikTok', icon: <TikTokIcon /> },
    { href: 'https://youtube.com', label: 'YouTube', icon: <Youtube size={15} strokeWidth={2} /> },
    { href: 'https://linkedin.com', label: 'LinkedIn', icon: <Linkedin size={15} strokeWidth={2} /> },
    { href: 'https://discord.com', label: 'Discord', icon: <DiscordIcon /> },
  ];

  return (
    <div className="pmf-root" role="contentinfo" aria-label="Reaglex footer">
      <div className="pmf-device">
        <div className="pmf-screen">
          <div className="pmf-ambient" aria-hidden>
            <div className="pmf-glow-purple" />
            <div className="pmf-glow-orange" />
            <div className="pmf-glow-blue" />
          </div>

          <div className="pmf-inner">
            <header className="pmf-header">
              <Link to="/" className="pmf-brand">
                <div className="pmf-logo-r" aria-hidden>
                  <span>R</span>
                </div>
                <span className="pmf-brand-name">Reaglex</span>
              </Link>
              <button
                type="button"
                className="pmf-scroll-top"
                onClick={scrollToTop}
                aria-label="Back to top"
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </button>
            </header>

            <p className="pmf-desc">
              Premium marketplace connecting buyers and sellers worldwide with secure escrow protection.
            </p>

            <div className="pmf-trust pmf-glass">
              <div className="pmf-trust-icon-wrap">
                <Shield size={20} strokeWidth={2} />
              </div>
              <div>
                <div className="pmf-trust-title">Escrow Protected</div>
                <div className="pmf-trust-sub">Your money is 100% safe</div>
              </div>
            </div>

            <div className="pmf-accordion pmf-glass">
              {sections.map((section) => {
                if (section.href) {
                  return <AccordionRow key={section.label} section={section} open={false} onToggle={() => {}} />;
                }
                const isOpen = openSection === section.id;
                return (
                  <AccordionRow
                    key={section.id}
                    section={section}
                    open={isOpen}
                    onToggle={() => toggle(section.id)}
                  >
                    {section.id === 'marketplace' && (
                      <div className="pmf-sub-card pmf-glass">
                        {MARKETPLACE_LINKS.map((link) => {
                          const SubIcon = link.icon;
                          const label = link.label ?? (link.labelKey ? t(link.labelKey) : '');
                          const inner = (
                            <>
                              <span className={`pmf-sub-icon pmf-acc-icon--${link.tone}`}>
                                <SubIcon size={14} strokeWidth={2} />
                              </span>
                              <span className="pmf-sub-label">{label}</span>
                              {link.hot ? <span className="pmf-hot">HOT</span> : null}
                              <ChevronRight size={14} color="#71717a" aria-hidden />
                            </>
                          );
                          if (link.seller) {
                            return (
                              <a
                                key={link.href}
                                href={link.href}
                                className="pmf-sub-row"
                                onClick={(e) => handleSellerLink(e, link.href)}
                              >
                                {inner}
                              </a>
                            );
                          }
                          return (
                            <Link key={link.href} to={link.href} className="pmf-sub-row">
                              {inner}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                    {section.id === 'support' && (
                      <div className="pmf-sub-card pmf-glass">
                        {[
                          { label: t('header.helpCenter'), href: '/help', event: true },
                          { label: t('footer.links.support.contactUs'), href: '/contact' },
                          { label: t('footer.links.support.faq'), href: '/faq' },
                          { label: t('nav.trackOrder'), href: '/track' },
                        ].map((item) =>
                          item.event ? (
                            <button
                              key={item.href}
                              type="button"
                              className="pmf-sub-row"
                              onClick={() => window.dispatchEvent(new Event('reaglex:assistant:open'))}
                            >
                              <span className="pmf-sub-label">{item.label}</span>
                              <ChevronRight size={14} color="#71717a" />
                            </button>
                          ) : (
                            <Link key={item.href} to={item.href} className="pmf-sub-row">
                              <span className="pmf-sub-label">{item.label}</span>
                              <ChevronRight size={14} color="#71717a" />
                            </Link>
                          ),
                        )}
                      </div>
                    )}
                    {section.id === 'company' && (
                      <div className="pmf-sub-card pmf-glass">
                        {[
                          { label: t('footer.links.shop.aboutReaglex'), href: '/about' },
                          { label: t('footer.links.support.contactUs'), href: '/contact' },
                        ].map((item) => (
                          <Link key={item.href} to={item.href} className="pmf-sub-row">
                            <span className="pmf-sub-label">{item.label}</span>
                            <ChevronRight size={14} color="#71717a" />
                          </Link>
                        ))}
                      </div>
                    )}
                    {section.id === 'legal' && (
                      <div className="pmf-sub-card pmf-glass">
                        {[
                          { label: t('footer.links.support.privacyPolicy'), href: '/privacy' },
                          { label: t('footer.links.bottom.termsOfService'), href: '/terms' },
                          { label: t('footer.links.bottom.cookies'), href: '/cookies' },
                        ].map((item) => (
                          <Link key={item.href} to={item.href} className="pmf-sub-row">
                            <span className="pmf-sub-label">{item.label}</span>
                            <ChevronRight size={14} color="#71717a" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </AccordionRow>
                );
              })}
            </div>

            <section className="pmf-subscribe pmf-glass">
              <div className="pmf-sub-head">
                <div className="pmf-mail-icon">
                  <Mail size={20} strokeWidth={2} />
                </div>
                <div>
                  <div className="pmf-sub-title">Stay Updated</div>
                  <div className="pmf-sub-subtitle">
                    Get exclusive deals, new arrivals and important updates.
                  </div>
                </div>
              </div>
              <form onSubmit={handleNewsletter}>
                <div className="pmf-input-row">
                  <input
                    type="email"
                    className="pmf-email-input"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label="Email address"
                  />
                  <button type="submit" className="pmf-sub-btn" disabled={submitting}>
                    {submitting ? '…' : 'Subscribe'}
                    <Send size={14} aria-hidden />
                  </button>
                </div>
                <p className="pmf-privacy">
                  <Lock size={12} strokeWidth={2} aria-hidden />
                  No spam. Unsubscribe anytime.
                </p>
              </form>
            </section>

            <div className="pmf-features pmf-glass">
              <div className="pmf-feature">
                <div className="pmf-feature-icon pmf-feature-icon--purple">
                  <Shield size={16} strokeWidth={2} />
                </div>
                <div className="pmf-feature-title">Secure Payments</div>
                <div className="pmf-feature-sub">100% safe transactions</div>
              </div>
              <div className="pmf-feature">
                <div className="pmf-feature-icon pmf-feature-icon--orange">
                  <Zap size={16} strokeWidth={2} />
                </div>
                <div className="pmf-feature-title">Fast Delivery</div>
                <div className="pmf-feature-sub">Quick &amp; reliable shipping</div>
              </div>
              <div className="pmf-feature">
                <div className="pmf-feature-icon pmf-feature-icon--blue">
                  <Users size={16} strokeWidth={2} />
                </div>
                <div className="pmf-feature-title">Verified Sellers</div>
                <div className="pmf-feature-sub">Trusted sellers worldwide</div>
              </div>
              <div className="pmf-feature">
                <div className="pmf-feature-icon pmf-feature-icon--green">
                  <Globe size={16} strokeWidth={2} />
                </div>
                <div className="pmf-feature-title">Global Marketplace</div>
                <div className="pmf-feature-sub">Available in 120+ countries</div>
              </div>
            </div>

            <div className="pmf-social">
              <span className="pmf-row-label">Follow Us</span>
              <div className="pmf-social-btns">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pmf-social-btn"
                    aria-label={s.label}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            <div className="pmf-payments">
              <span className="pmf-row-label">We Accept</span>
              <div className="pmf-pay-badges">
                <span className="pmf-pay-badge pmf-pay-badge--visa">VISA</span>
                <span className="pmf-pay-badge pmf-pay-badge--mc">MC</span>
                <span className="pmf-pay-badge pmf-pay-badge--paypal">PayPal</span>
                <span className="pmf-pay-badge">Apple Pay</span>
                <span className="pmf-pay-badge">G Pay</span>
              </div>
            </div>

            <div className="pmf-bottom">
              <p className="pmf-copy">
                © {currentYear} Reaglex. All rights reserved.
              </p>
              <div className="pmf-back-wrap">
                <span className="pmf-back-text">Back to top</span>
                <button
                  type="button"
                  className="pmf-back-btn"
                  onClick={scrollToTop}
                  aria-label="Back to top"
                >
                  <ArrowUp size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
