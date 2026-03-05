import BuyerLayout from '../../components/buyer/BuyerLayout';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';

export default function SellerPending() {
  const user = useAuthStore((s) => s.user);

  return (
    <BuyerLayout>
      <main className="min-h-[60vh] w-full px-4 py-10 sm:px-6 lg:px-10">
        <div
          className="mx-auto max-w-xl rounded-[24px] px-8 py-10 text-center space-y-6"
          style={{
            background: 'var(--card-bg)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <motion.div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              boxShadow: '0 0 30px rgba(37,99,235,0.7)',
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            ⏳
          </motion.div>
          <div className="space-y-2">
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Application Under Review
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Hi {user?.full_name || 'there'}! Your seller application is currently being
              reviewed by our team. This usually takes 24–48 hours.
            </p>
          </div>

          <div
            className="mt-4 rounded-[16px] px-5 py-4 text-left space-y-3"
            style={{
              background: 'var(--bg-secondary, #171b28)',
            }}
          >
            {[
              { label: 'Application Submitted', date: 'Feb 28, 2026', status: 'done' },
              { label: 'Under Review', date: 'Usually 24–48 hours', status: 'current' },
              { label: 'Identity Verification', date: '', status: 'pending' },
              { label: 'Account Activated', date: '', status: 'pending' },
            ].map((step, idx) => (
              <motion.div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className="flex items-center gap-3"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                  style={{
                    background:
                      step.status === 'done'
                        ? 'rgba(34,197,94,0.18)'
                        : step.status === 'current'
                        ? 'rgba(59,130,246,0.25)'
                        : 'rgba(148,163,184,0.20)',
                    color:
                      step.status === 'done'
                        ? '#22c55e'
                        : step.status === 'current'
                        ? '#60a5fa'
                        : '#9ca3af',
                  }}
                >
                  {step.status === 'done' ? '✓' : step.status === 'current' ? '⏳' : '○'}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {step.label}
                  </p>
                  {step.date && (
                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      {step.date}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 text-left text-sm md:grid-cols-3">
            <div>
              <p
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                📖 Read Seller Guidelines
              </p>
              <a
                href="/seller/guidelines"
                style={{ color: '#f97316', fontSize: 12 }}
              >
                View guidelines →
              </a>
            </div>
            <div>
              <p
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                💰 Review Fees &amp; Pricing
              </p>
              <a
                href="/seller/fees"
                style={{ color: '#f97316', fontSize: 12 }}
              >
                See fee structure →
              </a>
            </div>
            <div>
              <p
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                📦 Prepare Your Products
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Get your product photos, descriptions, and pricing ready for launch.
              </p>
            </div>
          </div>

          <div className="pt-3 text-xs">
            <p
              className="mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Questions? Contact seller support:{' '}
              <a href="mailto:seller-support@reaglex.com" style={{ color: '#f97316' }}>
                seller-support@reaglex.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </BuyerLayout>
  );
}

