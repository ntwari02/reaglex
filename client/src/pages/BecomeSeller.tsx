import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, UserPlus, Clock, ChevronRight } from 'lucide-react';
// @ts-ignore BuyerLayout is a JSX component without TS typings
import BuyerLayout from '../components/buyer/BuyerLayout';

const PRIMARY = '#f97316';

type ReasonState = {
  reason?: 'not_seller' | 'login_required' | 'pending_approval';
};

export default function BecomeSeller() {
  const location = useLocation();
  const state = (location.state || {}) as ReasonState;
  const reason = state.reason;

  return (
    <BuyerLayout>
      <main className="min-h-[60vh] w-full px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full space-y-6">
          {reason === 'not_seller' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 rounded-[18px] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.10), rgba(234,88,12,0.06))',
                boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.25), 0 4px 20px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.12))',
                    color: PRIMARY,
                    boxShadow: '0 4px 12px rgba(249,115,22,0.2)',
                  }}
                >
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-base mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    Seller Account Required
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    You tried to access a seller-only page. Create your seller account to continue.
                  </p>
                </div>
              </div>
              <Link
                to="/login?redirect=/seller"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.40)',
                }}
              >
                Already a seller? Sign in
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}

          {reason === 'login_required' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 rounded-[18px] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.10), rgba(234,88,12,0.06))',
                boxShadow: 'inset 0 0 0 1px rgba(249,115,22,0.25), 0 4px 20px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.12))',
                    color: PRIMARY,
                    boxShadow: '0 4px 12px rgba(249,115,22,0.2)',
                  }}
                >
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-base mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    Sign In Required
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Please sign in to access seller features.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/login?redirect=/seller"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 min-h-[44px]"
                  style={{
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    boxShadow: '0 4px 16px rgba(249,115,22,0.40)',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?tab=signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all min-h-[44px]"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    boxShadow: '0 0 0 1.5px var(--divider)',
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </Link>
              </div>
            </motion.div>
          )}

          {reason === 'pending_approval' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 rounded-[18px] px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(37,99,235,0.06))',
                boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.25), 0 4px 20px rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.12))',
                    color: '#3b82f6',
                    boxShadow: '0 4px 12px rgba(59,130,246,0.2)',
                  }}
                >
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-base mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    Application Under Review
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Your seller application is being reviewed. This usually takes 24–48 hours.
                  </p>
                </div>
              </div>
              <Link
                to="/seller/pending"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.40)',
                }}
              >
                Check status
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}

          <section className="mt-4 space-y-4">
            <h1
              className="text-2xl md:text-3xl font-extrabold"
              style={{ color: 'var(--text-primary)' }}
            >
              Become a Seller on Reaglex
            </h1>
            <p
              className="text-sm md:text-base"
              style={{ color: 'var(--text-secondary)' }}
            >
              Create your seller account, list your products, and start reaching buyers
              across Rwanda and beyond. It only takes a few minutes to get started.
            </p>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div
                className="rounded-[16px] p-4"
                style={{ background: 'var(--card-bg)' }}
              >
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  1. Apply to become a seller
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Tell us about your business and what you&apos;d like to sell.
                </p>
              </div>
              <div
                className="rounded-[16px] p-4"
                style={{ background: 'var(--card-bg)' }}
              >
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  2. Verify your identity
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  We keep the marketplace safe with simple KYC checks.
                </p>
              </div>
              <div
                className="rounded-[16px] p-4"
                style={{ background: 'var(--card-bg)' }}
              >
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  3. Start listing products
                </p>
                <p
                  className="mt-1 text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Upload photos, set prices, and go live to thousands of buyers.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </BuyerLayout>
  );
}

