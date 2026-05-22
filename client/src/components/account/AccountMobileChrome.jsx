import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Package,
  Heart,
  MapPin,
  CreditCard,
  Star,
  RotateCcw,
  Settings,
  ChevronRight,
  LogOut,
  Crown,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'returns', label: 'Returns', icon: RotateCcw },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AccountMobileChrome({
  activeTab,
  onTabChange,
  displayName,
  email,
  initials,
  avatarSrc,
  orderCount = 0,
  wishlistCount = 0,
  onLogout,
}) {
  const badges = {
    orders: orderCount,
    wishlist: wishlistCount,
  };

  return (
    <header className="rx-acc-mobile-chrome lg:hidden">
      <div className="rx-acc-profile-card">
        <div className="rx-acc-profile-main">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="rx-acc-avatar-img" />
          ) : (
            <span className="rx-acc-avatar">{initials}</span>
          )}
          <div className="rx-acc-profile-text">
            <p className="rx-acc-name">{displayName}</p>
            <p className="rx-acc-email">{email}</p>
            <span className="rx-acc-member">
              <Crown size={11} />
              Gold member
            </span>
          </div>
        </div>
        <Link to="/account?tab=settings&section=profile" className="rx-acc-edit">
          Edit
          <ChevronRight size={14} />
        </Link>
      </div>

      <nav className="rx-acc-nav-scroll" aria-label="Account sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          const badge = badges[item.id];
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`rx-acc-nav-pill${active ? ' is-active' : ''}`}
              whileTap={{ scale: 0.97 }}
            >
              <span className="rx-acc-nav-icon">
                <Icon size={16} strokeWidth={1.85} />
              </span>
              <span>{item.label}</span>
              {badge > 0 && <span className="rx-acc-nav-badge">{badge > 99 ? '99+' : badge}</span>}
            </motion.button>
          );
        })}
        <button type="button" className="rx-acc-nav-pill rx-acc-nav-pill--logout" onClick={onLogout}>
          <span className="rx-acc-nav-icon">
            <LogOut size={16} />
          </span>
          Logout
        </button>
      </nav>
    </header>
  );
}
