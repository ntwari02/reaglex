import { useLocation, Link } from 'react-router-dom';
// @ts-ignore BuyerLayout is a JSX component without TS typings
import BuyerLayout from '../components/buyer/BuyerLayout';

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
        <div className="mx-auto max-w-4xl space-y-6">
          {reason === 'not_seller' && (
            <div
              className="flex flex-col gap-3 rounded-[16px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: 'rgba(249,115,22,0.10)',
                boxShadow:
                  'inset 0 0 0 1px rgba(249,115,22,0.25)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{
                    background: 'rgba(249,115,22,0.15)',
                    color: '#fb923c',
                  }}
                >
                  🔒
                </div>
                <div className="text-sm">
                  <p
                    className="font-semibold mb-1"
                    style={{ color: '#fb923c' }}
                  >
                    Seller Account Required
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    You tried to access a seller-only page. Create your seller account to
                    continue.
                  </p>
                </div>
              </div>
              <Link
                to="/login?redirect=/seller"
                className="text-xs font-semibold"
                style={{ color: '#fb923c' }}
              >
                Already a seller? Sign in →
              </Link>
            </div>
          )}

          {reason === 'login_required' && (
            <div
              className="flex flex-col gap-3 rounded-[16px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: 'rgba(249,115,22,0.10)',
                boxShadow:
                  'inset 0 0 0 1px rgba(249,115,22,0.25)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{
                    background: 'rgba(249,115,22,0.15)',
                    color: '#fb923c',
                  }}
                >
                  👋
                </div>
                <div className="text-sm">
                  <p
                    className="font-semibold mb-1"
                    style={{ color: '#fb923c' }}
                  >
                    Sign In Required
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Please sign in to access seller features.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
                <Link
                  to="/login?redirect=/seller"
                  className="rounded-[999px] px-4 py-1.5 font-semibold text-white text-center"
                  style={{
                    background:
                      'linear-gradient(135deg,#f97316,#ea580c)',
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="rounded-[999px] px-4 py-1.5 font-semibold text-center"
                  style={{
                    background: 'transparent',
                    color: '#fb923c',
                    boxShadow: '0 0 0 1px rgba(249,115,22,0.4)',
                  }}
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}

          {reason === 'pending_approval' && (
            <div
              className="flex flex-col gap-3 rounded-[16px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              style={{
                background: 'rgba(96,165,250,0.10)',
                boxShadow:
                  'inset 0 0 0 1px rgba(96,165,250,0.25)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg"
                  style={{
                    background: 'rgba(59,130,246,0.20)',
                    color: '#60a5fa',
                  }}
                >
                  ⏳
                </div>
                <div className="text-sm">
                  <p
                    className="font-semibold mb-1"
                    style={{ color: '#60a5fa' }}
                  >
                    Application Under Review
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Your seller application is being reviewed. This usually takes 24–48
                    hours.
                  </p>
                </div>
              </div>
              <Link
                to="/seller/pending"
                className="text-xs font-semibold"
                style={{ color: '#60a5fa' }}
              >
                Check application status →
              </Link>
            </div>
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

