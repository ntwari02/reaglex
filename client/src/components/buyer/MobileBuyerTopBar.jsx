import { useEffect, useState, useCallback, useRef } from 'react';
import { Menu, Bell, ShoppingBag } from 'lucide-react';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useAuthStore } from '../../stores/authStore';
import { buyerNotificationsApi } from '../../services/buyerNotificationsApi';
import NotificationsDropdown from '../NotificationsDropdown';
import AccountMenuButton from '../header/AccountMenuButton';
import BrandMarkR from '../header/BrandMarkR';
import DeliveryLocationBar from '../delivery/DeliveryLocationBar';
import '../../styles/delivery-location.css';
import { useMobileMenuOverlay } from '../../stores/mobileMenuOverlayStore';

export default function MobileBuyerTopBar({ onLogoutClick, openAuth }) {
  const openMenu = useMobileMenuOverlay((s) => s.open);
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
      <div className="md:hidden mob-header-row w-full px-3 min-h-[48px] max-h-[52px] py-1.5">
        <div className="mob-header-row__left">
          <button
            type="button"
            onClick={openMenu}
            className="mob-header-icon-btn"
            style={{
              WebkitTapHighlightColor: 'transparent',
              borderColor: 'var(--border-card)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={1.85} />
          </button>
          <BrandMarkR />
        </div>

        <div className="mob-header-row__center">
          <DeliveryLocationBar headerCenter />
        </div>

        <div className="mob-header-row__right">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="mob-header-icon-btn"
              style={{
                borderColor: 'var(--border-card)',
                background: 'var(--bg-secondary)',
              }}
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
              {notifCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
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
            className="mob-header-icon-btn"
            style={{
              borderColor: 'var(--border-card)',
              background: 'var(--bg-secondary)',
            }}
            aria-label="Cart"
          >
            <ShoppingBag size={20} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
            {cartCount > 0 && (
              <span
                data-cart-target="badge"
                className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ background: 'var(--brand-primary)' }}
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>

          <AccountMenuButton
            variant="mobile"
            onLogoutClick={onLogoutClick}
            openAuth={openAuth}
          />
        </div>
      </div>
    </>
  );
}
