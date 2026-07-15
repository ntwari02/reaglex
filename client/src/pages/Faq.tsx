import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, Mail } from 'lucide-react';
// @ts-ignore
import BuyerLayout from '../components/buyer/BuyerLayout';
import { PageSeo } from '../components/seo/PageSeo';
import { getPreferredSiteOrigin } from '../lib/siteOrigin';
import { buildLocaleAlternates } from '../utils/localeAlternateLinks';

const ITEMS: { id: string; q: string; a: string }[] = [
  {
    id: 'orders',
    q: 'How do I track my order?',
    a: 'Open Track order from the footer or your account, enter your order ID, and you will see the latest status and carrier updates when available.',
  },
  {
    id: 'returns',
    q: 'How do returns and refunds work?',
    a: 'Start a return from Returns & refunds or your order details. Our team reviews requests according to buyer protection rules and seller policies.',
  },
  {
    id: 'payments',
    q: 'Which payment methods are supported?',
    a: 'Available methods are shown at checkout. We work with trusted partners; your card or wallet details are handled securely and not stored in plain text on our servers.',
  },
  {
    id: 'escrow',
    q: 'What is escrow protection?',
    a: 'For eligible orders, funds may be held until delivery is confirmed, reducing risk for both buyers and sellers. See Buyer protection for details.',
  },
  {
    id: 'seller',
    q: 'How do I sell on Spacilly?',
    a: 'Use Become a seller to apply. Once approved, you can list products, manage orders from the seller dashboard, and access seller help resources.',
  },
  {
    id: 'account',
    q: 'I cannot sign in or verify my email.',
    a: 'Try reset password from the auth page, check spam for verification messages, and contact support if your device or region blocks email delivery.',
  },
];

export default function Faq() {
  const [openId, setOpenId] = useState<string | null>(ITEMS[0]?.id ?? null);
  const origin = typeof window !== 'undefined' ? getPreferredSiteOrigin() : '';
  const canonicalUrl = origin ? `${origin}/faq` : '/faq';
  const hreflangAlternates = useMemo(
    () => (origin ? buildLocaleAlternates(origin, '/faq') : undefined),
    [origin],
  );
  const faqJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: ITEMS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    }),
    [],
  );

  return (
    <BuyerLayout>
      <PageSeo
        title="FAQ — Spacilly help center"
        description="Frequently asked questions about Spacilly orders, returns, payments, escrow protection, and seller onboarding."
        canonicalUrl={canonicalUrl}
        ogType="website"
        jsonLd={faqJsonLd}
        hreflangAlternates={hreflangAlternates}
      />
      <div className="min-h-screen pb-16">
        <div
          className="relative overflow-hidden rounded-b-3xl px-4 sm:px-6 py-12 sm:py-16 mb-10"
          style={{
            background: 'var(--hero-marketing-bg)',
            color: 'var(--text-primary)',
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 18% 28%, var(--hero-marketing-blob-c) 0%, transparent 52%), radial-gradient(ellipse 65% 50% at 82% 72%, var(--hero-marketing-blob-b) 0%, transparent 50%)',
              opacity: 0.9,
            }}
          />
          <div className="relative max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium"
              style={{ background: 'var(--badge-info-bg)', color: 'var(--badge-info-text)' }}
            >
              <HelpCircle size={16} />
              Help
            </motion.div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3"
              style={{ color: 'var(--hero-marketing-heading)' }}
            >
              Frequently asked questions
            </h1>
            <p className="text-base sm:text-lg" style={{ color: 'var(--hero-marketing-subtitle)' }}>
              Short answers to common questions. For account-specific help,{' '}
              <Link to="/contact" className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--link-color)' }}>
                contact us
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-3">
          {ITEMS.map((item) => {
            const open = openId === item.id;
            return (
              <motion.section
                key={item.id}
                layout
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--divider)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="w-full flex items-center justify-between gap-3 text-left px-5 py-4"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <span className="text-[15px] font-semibold leading-snug">{item.q}</span>
                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-5 h-5 flex-shrink-0 opacity-70" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 pb-4 pt-0">
                        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {item.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </div>

        <div
          className="max-w-2xl mx-auto px-4 sm:px-6 mt-10 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{
            background: 'var(--brand-tint)',
            border: '1px solid var(--brand-border-subtle)',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--brand-tint-strong)', color: 'var(--brand-primary)' }}
            >
              <Mail size={20} />
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Still need help?
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Our support team typically replies within one business day.
              </p>
            </div>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white whitespace-nowrap"
            style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
          >
            Contact support
          </Link>
        </div>
      </div>
    </BuyerLayout>
  );
}
