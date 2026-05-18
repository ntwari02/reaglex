import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, ShoppingBag } from 'lucide-react';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useAuthStore } from '../../stores/authStore';
import { buyerNotificationsApi } from '../../services/buyerNotificationsApi';
import NotificationsDropdown from '../NotificationsDropdown';
import MobileBuyerMenu from './MobileBuyerMenu';

export default function MobileBuyerTopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const notifRef = useRef(null);
  const openCart = useBuyerCart((s) => s.openCart);
  const cartItems = useBuyerCart((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const handleNotifUnread = useCallback((count) => {
    setNotifCount(Number(count) || 0);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifCount(0);
      return undefined;
    }
    let mounted = true;
    buyerNotificationsApi
      .getUnreadCount()
      .then((data) => {
        if (mounted) setNotifCount(Number(data?.count || 0));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <>
      <div className="md:hidden relative flex items-center justify-between gap-2 w-full px-3 min-h-[44px] max-h-[48px] py-1">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg active:scale-95 transition-transform"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={1.85} style={{ color: 'var(--text-primary)' }} />
        </button>

        <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <img
            src="/logo.jpg"
            alt=""
            className="h-7 w-7 rounded-full object-cover"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
          />
          <span
            className="text-[15px] font-extrabold tracking-[0.06em]"
            style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}
          >
            REAG<span style={{ color: 'var(--brand-primary)' }}>LEX</span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5 shrink-0">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg active:scale-95 transition-transform"
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
              {notifCount > 0 && (
                <span
                  className="absolute top-1 right-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            <NotificationsDropdown
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
              onUnreadChange={handleNotifUnread}
            />
          </div>

          <button
            type="button"
            data-cart-target="badge"
            onClick={openCart}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg active:scale-95 transition-transform"
            aria-label="Cart"
          >
            <ShoppingBag size={20} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
            {cartCount > 0 && (
              <span
                data-cart-target="badge"
                className="absolute top-1 right-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                style={{ background: 'var(--brand-primary)' }}
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <MobileBuyerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
