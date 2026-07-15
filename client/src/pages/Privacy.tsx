import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Mail } from 'lucide-react';
// @ts-ignore
import BuyerLayout from '../components/buyer/BuyerLayout';

const LAST_UPDATED = 'March 7, 2025';

export default function Privacy() {
  return (
    <BuyerLayout>
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
              <Shield size={16} />
              Legal
            </motion.div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3"
              style={{ color: 'var(--hero-marketing-heading)' }}
            >
              Privacy Policy
            </h1>
            <p className="text-base sm:text-lg mb-2" style={{ color: 'var(--hero-marketing-subtitle)' }}>
              How Spacilly collects, uses, and protects your information.
            </p>
            <p className="text-sm" style={{ color: 'var(--hero-marketing-subtitle)' }}>
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          {[
            {
              title: 'Information we collect',
              body: 'We collect account details you provide (name, email, phone), order and payment metadata processed by our partners, device and log data to secure the platform, and communications you send to support.',
            },
            {
              title: 'How we use information',
              body: 'We use data to operate the marketplace, process orders and disputes, prevent fraud, improve the product, and send service-related messages. Marketing communications are optional where applicable.',
            },
            {
              title: 'Sharing',
              body: 'We share information with payment and logistics providers as needed to complete orders, and with authorities when required by law. We do not sell your personal information.',
            },
            {
              title: 'Retention & security',
              body: 'We retain data as long as your account is active or as needed for legal, tax, and fraud-prevention obligations. We apply technical and organizational measures to protect data.',
            },
            {
              title: 'Your choices',
              body: 'You may update account settings, request access or deletion where applicable, and manage cookie preferences via Cookie settings.',
            },
          ].map((block) => (
            <section
              key={block.title}
              className="rounded-2xl p-6 sm:p-8"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--divider)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                {block.title}
              </h2>
              <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {block.body}
              </p>
            </section>
          ))}

          <div
            className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            style={{
              background: 'var(--brand-tint)',
              border: '1px solid var(--brand-border-subtle)',
            }}
          >
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Questions about privacy?{' '}
                <Link to="/contact" className="font-semibold" style={{ color: 'var(--link-color)' }}>
                  Contact us
                </Link>
                .
              </p>
            </div>
            <Link
              to="/terms"
              className="text-sm font-semibold whitespace-nowrap"
              style={{ color: 'var(--link-color)' }}
            >
              Terms of Service →
            </Link>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
