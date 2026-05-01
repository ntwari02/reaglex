import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Cookie, Settings } from 'lucide-react';
// @ts-ignore
import BuyerLayout from '../components/buyer/BuyerLayout';

const LAST_UPDATED = 'March 7, 2025';

export default function CookiesPolicy() {
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
              <Cookie size={16} />
              Legal
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Cookie Policy
            </h1>
            <p className="text-base sm:text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>
              What cookies and similar technologies we use and why.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <section
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--divider)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              What are cookies?
            </h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Cookies are small files stored on your device that help us remember preferences, keep you
              signed in securely, measure performance, and reduce fraud. We may also use similar storage in
              the app or browser (for example local storage) for the same purposes.
            </p>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--divider)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Categories we use
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Essential</strong> — required for login,
                checkout, security, and basic site operation.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Analytics & performance</strong> — help us
                understand usage so we can improve speed and reliability.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Personalization & marketing</strong> — where
                enabled, used to tailor content or measure campaigns.
              </li>
            </ul>
          </section>

          <div
            className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{
              background: 'var(--brand-tint)',
              border: '1px solid var(--brand-border-subtle)',
            }}
          >
            <Settings className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
            <div className="flex-1">
              <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Manage your preferences
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Turn categories on or off anytime in{' '}
                <Link to="/cookie-settings" className="font-semibold" style={{ color: 'var(--link-color)' }}>
                  Cookie settings
                </Link>
                .
              </p>
            </div>
          </div>

          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            See also{' '}
            <Link to="/privacy" style={{ color: 'var(--link-color)' }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </BuyerLayout>
  );
}
