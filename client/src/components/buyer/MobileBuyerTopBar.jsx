import { useEffect, useState, useCallback, useRef } from 'react';
import { Menu, Bell, ShoppingCart } from 'lucide-react';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useAuthStore } from '../../stores/authStore';
import { buyerNotificationsApi } from '../../services/buyerNotificationsApi';
import NotificationsDropdown from '../NotificationsDropdown';
import AccountMenuButton from '../header/AccountMenuButton';
import DeliveryLocationBar from '../delivery/DeliveryLocationBar';

const MOB_ICON = 22;
const MOB_STROKE = 1.75;
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
      <div className="md:hidden mob-header-row w-full">
        <div className="mob-header-row__left">
          <button
            type="button"
            onClick={openMenu}
            className="mob-header-icon-btn"
            aria-label="Open menu"
          >
            <Menu size={MOB_ICON} strokeWidth={MOB_STROKE} aria-hidden />
          </button>
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
              aria-label="Notifications"
            >
              <Bell size={MOB_ICON} strokeWidth={MOB_STROKE} aria-hidden />
              {notifCount > 0 && (
                <span className="mob-header-badge">
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
            aria-label="Cart"
          >
            <ShoppingCart size={MOB_ICON} strokeWidth={MOB_STROKE} aria-hidden />
            {cartCount > 0 && (
              <span data-cart-target="badge" className="mob-header-badge">
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
