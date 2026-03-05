import BuyerLayout from '../../components/buyer/BuyerLayout';
import { useSellerAccess } from '../../hooks/useSellerAccess';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

type Section = {
  id: string;
  title: string;
  icon: string;
  body: string;
};

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    body: 'Create your seller account, complete verification, and set up your storefront profile with accurate business information.',
  },
  {
    id: 'listings',
    title: 'Product Listings Rules',
    icon: '📦',
    body: 'Use clear photos, honest descriptions, and accurate pricing. Do not misrepresent brands, quality, or availability.',
  },
  {
    id: 'prohibited',
    title: 'Prohibited Items List',
    icon: '⛔',
    body: 'Items that break the law or Reaglex policy are strictly forbidden. See the list below for examples.',
  },
  {
    id: 'shipping',
    title: 'Shipping Requirements',
    icon: '🚚',
    body: 'Ship on time, use trackable methods when possible, and package items securely to avoid damage.',
  },
  {
    id: 'support',
    title: 'Customer Service Standards',
    icon: '🤝',
    body: 'Respond to buyer messages promptly, resolve issues fairly, and follow our dispute resolution process.',
  },
  {
    id: 'payouts',
    title: 'Payment & Payout Rules',
    icon: '💰',
    body: 'Payments are held in escrow until delivery is confirmed. Payouts follow our schedule and verification checks.',
  },
  {
    id: 'conduct',
    title: 'Account Conduct Policy',
    icon: '📜',
    body: 'We expect honest, respectful behavior. Abuse, fraud, or harassment is not tolerated.',
  },
  {
    id: 'violations',
    title: 'Violation Consequences',
    icon: '⚠️',
    body: 'Policy violations may result in warnings, listing removal, payout holds, or permanent account bans.',
  },
];

export default function SellerGuidelines() {
  const { isSeller } = useSellerAccess();
  const [openId, setOpenId] = useState<string | null>(SECTIONS[0].id);

  return (
    <BuyerLayout>
      <main className="min-h-[60vh] w-full px-4 py-10 sm:px-6 lg:px-10 space-y-10">
        <section
          className="rounded-[24px] px-6 py-10 sm:px-10"
          style={{
            background:
              'linear-gradient(135deg,#020617 0%,#020617 15%,#0f172a 60%,#020617 100%)',
          }}
        >
          <div className="mx-auto max-w-4xl text-center space-y-4">
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              📋 Seller Guidelines
            </p>
            <p
              className="text-sm sm:text-base"
              style={{ color: 'rgba(241,245,249,0.8)' }}
            >
              Everything you need to know to sell successfully on Reaglex.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl space-y-4">
          {SECTIONS.map((section) => {
            const open = openId === section.id;
            return (
              <motion.div
                key={section.id}
                initial={false}
                animate={{
                  backgroundColor: open ? 'var(--bg-secondary)' : 'var(--card-bg)',
                }}
                className="rounded-[16px]"
              >
                <button
                  type="button"
                  onClick={() => setOpenId((prev) => (prev === section.id ? null : section.id))}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{section.icon}</span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {section.title}
                    </span>
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {open ? 'Hide' : 'Show'}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-4">
                        <p
                          className="text-xs sm:text-sm"
                          style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}
                        >
                          {section.body}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </section>

        <section className="mx-auto max-w-5xl grid gap-6 md:grid-cols-2">
          <div
            className="rounded-[18px] p-5 space-y-2"
            style={{ background: 'var(--card-bg)' }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              🚫 Prohibited Items
            </p>
            <ul className="space-y-1 text-xs">
              {[
                'Weapons / firearms',
                'Illegal substances',
                'Counterfeit goods',
                'Adult content',
                'Stolen items',
                'Hazardous materials',
              ].map((item) => (
                <li key={item} style={{ color: 'var(--text-muted)' }}>
                  ✗ {item}
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-[18px] p-5 grid gap-4 md:grid-cols-2 text-xs"
            style={{ background: 'var(--card-bg)' }}
          >
            <div>
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ✅ Do&apos;s
              </p>
              <ul className="space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>Provide accurate product information.</li>
                <li>Ship orders on time.</li>
                <li>Respond to buyers quickly.</li>
                <li>Use secure packaging.</li>
              </ul>
            </div>
            <div>
              <p
                className="mb-2 text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                ❌ Don&apos;ts
              </p>
              <ul className="space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>Sell prohibited or counterfeit items.</li>
                <li>Mislead buyers about condition or brand.</li>
                <li>Encourage off-platform payments.</li>
                <li>Harass or threaten buyers.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl text-center space-y-3">
          {isSeller ? (
            <>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Ready to manage your store?
              </p>
              <Link
                to="/seller"
                className="inline-flex items-center justify-center rounded-[999px] px-6 py-2 text-sm font-semibold"
                style={{
                  background:
                    'linear-gradient(135deg,#f97316,#ea580c)',
                  color: '#ffffff',
                }}
              >
                Back to Seller Dashboard →
              </Link>
            </>
          ) : (
            <>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Ready to start selling?
              </p>
              <Link
                to="/become-seller"
                className="inline-flex items-center justify-center rounded-[999px] px-6 py-2 text-sm font-semibold"
                style={{
                  background:
                    'linear-gradient(135deg,#f97316,#ea580c)',
                  color: '#ffffff',
                }}
              >
                Apply Now →
              </Link>
            </>
          )}
        </section>
      </main>
    </BuyerLayout>
  );
}

