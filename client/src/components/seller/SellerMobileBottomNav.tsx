import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, ShoppingBag, Plus, Package, Wallet } from 'lucide-react';

type TabId = 'home' | 'orders' | 'add' | 'products' | 'finance';

const TABS: Array<{
  id: TabId;
  label: string;
  icon: any;
  to?: string;
}> = [
  { id: 'home', label: 'Dashboard', icon: Home, to: '/seller' },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, to: '/seller/orders' },
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'products', label: 'Products', icon: Package, to: '/seller/products' },
  { id: 'finance', label: 'Finance', icon: Wallet, to: '/seller/payments' },
];

function activeId(pathname: string): TabId | null {
  if (pathname === '/seller' || pathname === '/seller/dashboard') return 'home';
  if (pathname.startsWith('/seller/orders')) return 'orders';
  if (pathname.startsWith('/seller/products')) return 'products';
  if (pathname.startsWith('/seller/payments')) return 'finance';
  return null;
}

export default function SellerMobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const current = activeId(location.pathname);
  const isSellerRoute = location.pathname.startsWith('/seller');
  if (!isSellerRoute) return null;

  const handlePress = (tabId: TabId, to?: string) => {
    if (tabId === 'add') {
      // Navigate to Products and hint "create" state via query.
      navigate('/seller/products?create=1');
      return;
    }
    if (to) navigate(to);
  };

  return (
    <nav
      data-mobile-nav="seller"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-[140]"
      style={{
        background: 'rgba(255,255,255,0.92)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -6px 28px rgba(0,0,0,0.08)',
      }}
    >
      <div className="relative mx-auto max-w-[1040px]">
        {/* Floating + button */}
        <div className="pointer-events-none absolute inset-x-0 -top-6 flex justify-center">
          <motion.button
            type="button"
            onClick={() => handlePress('add')}
            className="pointer-events-auto h-14 w-14 rounded-full flex items-center justify-center shadow-xl"
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 45%, #2563eb 100%)',
              border: '6px solid rgba(255,255,255,0.92)',
            }}
            aria-label="Add product"
          >
            <Plus className="h-6 w-6 text-white" strokeWidth={3} />
          </motion.button>
        </div>

        <div className="grid grid-cols-5 px-2 pt-2" style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const isAdd = t.id === 'add';
            const isActive = current === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handlePress(t.id, t.to)}
                className="flex flex-col items-center justify-center gap-1 relative"
                style={{
                  minHeight: 64,
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
              >
                <AnimatePresence>
                  {isActive && !isAdd && (
                    <motion.span
                      layoutId="seller-mob-nav-pill"
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute inset-x-[28%] top-1 h-0.5 rounded-full"
                      style={{ background: 'var(--brand-primary)' }}
                    />
                  )}
                </AnimatePresence>

                {/* Center placeholder (the floating + is above) */}
                {isAdd ? (
                  <div style={{ height: 26 }} />
                ) : (
                  <motion.div
                    animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.4 : 1.9}
                      style={{ color: isActive ? 'var(--brand-primary)' : 'rgba(100,116,139,0.95)' }}
                    />
                  </motion.div>
                )}

                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{
                    color: isAdd ? 'transparent' : isActive ? 'var(--brand-primary)' : 'rgba(100,116,139,0.95)',
                  }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

