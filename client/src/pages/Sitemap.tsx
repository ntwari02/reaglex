import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Map, ChevronRight } from 'lucide-react';
// @ts-ignore
import BuyerLayout from '../components/buyer/BuyerLayout';

const GROUPS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { to: '/', label: 'Home' },
      { to: '/search', label: 'Browse & search' },
      { to: '/checkout', label: 'Checkout' },
      { to: '/track', label: 'Track order' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/account', label: 'Dashboard' },
      { to: '/account?tab=orders', label: 'Orders' },
      { to: '/messages', label: 'Messages' },
      { to: '/returns', label: 'Returns & refunds' },
      { to: '/notifications', label: 'Notifications' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/help', label: 'Help center' },
      { to: '/contact', label: 'Contact' },
      { to: '/faq', label: 'FAQ' },
      { to: '/report-problem', label: 'Report a problem' },
      { to: '/buyer-protection', label: 'Buyer protection' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/terms', label: 'Terms of service' },
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/cookies', label: 'Cookie policy' },
      { to: '/cookie-settings', label: 'Cookie settings' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { to: '/become-seller', label: 'Become a seller' },
      { to: '/seller/guidelines', label: 'Seller guidelines' },
      { to: '/seller/fees', label: 'Fees & pricing' },
      { to: '/seller/advertise', label: 'Advertise with us' },
    ],
  },
];

export default function Sitemap() {
  return (
    <BuyerLayout>
      <div className="min-h-screen pb-16">
        <div
          className="relative overflow-hidden rounded-b-3xl px-4 sm:px-6 py-12 sm:py-16 mb-10"
          style={{
            background:
              'linear-gradient(135deg, var(--navbar-bg) 0%, var(--bg-tertiary) 50%, var(--navbar-bg) 100%)',
            color: 'var(--text-primary)',
          }}
        >
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                'radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--brand-primary) 28%, transparent) 0%, transparent 50%)',
            }}
          />
          <div className="relative max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium"
              style={{ background: 'var(--brand-tint-strong)', color: 'var(--tab-active-text)' }}
            >
              <Map size={16} />
              Site map
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Sitemap
            </h1>
            <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Quick links to main areas of Reaglex.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid gap-6 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section
              key={group.title}
              className="rounded-2xl p-6"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--divider)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                {group.title}
              </h2>
              <ul className="space-y-0.5">
                {group.links.map((item) => (
                  <li key={item.to + item.label}>
                    <Link
                      to={item.to}
                      className="flex items-center gap-2 py-2.5 px-2 -mx-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50" />
                      <span className="hover:underline" style={{ color: 'var(--link-color)' }}>
                        {item.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </BuyerLayout>
  );
}
