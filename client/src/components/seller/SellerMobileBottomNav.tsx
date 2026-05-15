import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  Plus,
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', to: '/seller' },
  { id: 'orders', icon: ShoppingCart, label: 'Orders', to: '/seller/orders' },
  { id: 'products', icon: Package, label: 'Products', to: '/seller/products' },
  { id: 'finance', icon: DollarSign, label: 'Finance', to: '/seller/payments' },
] as const;

function activeTabId(pathname: string): string | null {
  if (pathname === '/seller' || pathname === '/seller/dashboard') return 'dashboard';
  if (pathname.startsWith('/seller/orders')) return 'orders';
  if (pathname.startsWith('/seller/products') || pathname.startsWith('/seller/inventory')) return 'products';
  if (pathname.startsWith('/seller/payments') || pathname.startsWith('/seller/analytics')) return 'finance';
  return null;
}

export default function SellerMobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const current = activeTabId(location.pathname);

  if (!location.pathname.startsWith('/seller')) return null;

  const sellerAccent = 'var(--brand-primary)';
  const sellerAccentHover = 'var(--brand-primary-hover)';
  const fabGradient = `linear-gradient(135deg, #ef4444 0%, ${sellerAccent} 55%, ${sellerAccentHover} 100%)`;

  return (
    <nav
      data-mobile-nav="seller"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[140] pointer-events-none"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Seller navigation"
    >
      <motion.div
        className="pointer-events-auto mx-auto max-w-lg"
        style={{
          background: 'var(--header-bg, rgba(255,255,255,0.97))',
          borderTop: '1px solid color-mix(in srgb, var(--brand-primary) 22%, var(--divider, rgba(0,0,0,0.08)))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div className="relative flex items-end justify-around px-1 pt-1" style={{ minHeight: 60 }}>
          {TABS.slice(0, 2).map((tab) => {
            const Icon = tab.icon;
            const isActive = current === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.to)}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
                style={{ WebkitTapHighlightColor: 'transparent', minHeight: 56 }}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      layoutId="seller-mob-nav-pill"
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-10 rounded-full"
                      style={{ background: sellerAccent }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </AnimatePresence>
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  style={{ color: isActive ? sellerAccent : 'var(--text-muted, #94a3b8)' }}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: isActive ? sellerAccent : 'var(--text-muted, #94a3b8)' }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          <div className="flex flex-1 flex-col items-center justify-end" style={{ marginTop: -22 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate('/seller/products?create=1')}
              className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
              style={{
                background: fabGradient,
                boxShadow: `0 8px 24px color-mix(in srgb, ${sellerAccent} 45%, transparent)`,
              }}
              aria-label="Add product"
            >
              <Plus size={26} strokeWidth={2.5} />
            </motion.button>
          </div>

          {TABS.slice(2).map((tab) => {
            const Icon = tab.icon;
            const isActive = current === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.to)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
                style={{ WebkitTapHighlightColor: 'transparent', minHeight: 56 }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  style={{ color: isActive ? sellerAccent : 'var(--text-muted, #94a3b8)' }}
                />
                <span
                  className="text-[10px] font-medium leading-none"
                  style={{ color: isActive ? sellerAccent : 'var(--text-muted, #94a3b8)' }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
}
