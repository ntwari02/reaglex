import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSellerAccess } from '../hooks/useSellerAccess';

type SellerRouteProps = {
  children: ReactNode;
};

function SellerAccessDenied() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-page)' }}
    >
      <div
        className="w-full max-w-xl rounded-[24px] px-8 py-10 text-center space-y-6"
        style={{
          background: 'var(--card-bg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <motion.div
          initial={{ rotate: 0, x: 0 }}
          animate={{
            x: [-5, 5, -3, 3, 0],
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl"
            style={{
              background: 'linear-gradient(135deg,#f97316,#ea580c)',
              boxShadow: '0 0 30px rgba(249,115,22,0.7)',
            }}
          >
            🔒
          </div>
        </motion.div>
        <div className="space-y-3">
          <p
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Seller Account Required
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            This page is only accessible to approved Reaglex sellers. Join thousands of
            sellers already earning on our platform.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {[
            '📦 Your own store',
            '💰 Keep 95% of sales',
            '🛡️ Seller protection',
            '📊 Sales analytics',
          ].map((chip) => (
            <span
              key={chip}
              className="px-4 py-2 rounded-full"
              style={{
                background: 'var(--brand-tint)',
                color: 'var(--brand-primary)',
              }}
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href="/become-seller"
            className="w-full sm:w-auto rounded-[12px] px-6 py-2.5 text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg,#f97316,#ea580c)',
            }}
          >
            🚀 Become a Seller
          </a>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto rounded-[12px] px-6 py-2.5 text-sm font-semibold"
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              boxShadow: '0 0 0 1px var(--divider)',
            }}
          >
            ← Go Back
          </button>
        </div>
        <p
          className="text-xs"
          style={{ color: 'var(--text-faint)' }}
        >
          Already applied?{' '}
          <a href="/seller/pending" style={{ color: '#f97316' }}>
            Check status →
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SellerRoute({ children }: SellerRouteProps) {
  const location = useLocation();
  const { isLoggedIn, isSeller } = useSellerAccess();

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/become-seller"
        state={{ reason: 'login_required', intended: location.pathname }}
        replace
      />
    );
  }

  if (!isSeller) {
    if (location.pathname === '/seller') {
      return <SellerAccessDenied />;
    }
    return (
      <Navigate
        to="/become-seller"
        state={{ reason: 'not_seller', intended: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}

