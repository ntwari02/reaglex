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
  ArrowLeft,
  Shield,
} from 'lucide-react';

export const ACCOUNT_MENU_ITEMS = [
  { id: 'overview', label: 'Account home', icon: User, desc: 'Summary & quick actions' },
  { id: 'orders', label: 'Orders', icon: Package, desc: 'Track and manage orders' },
  { id: 'wishlist', label: 'Wishlist', icon: Heart, desc: 'Saved products' },
  { id: 'addresses', label: 'Addresses', icon: MapPin, desc: 'Delivery locations' },
  { id: 'payments', label: 'Payments', icon: CreditCard, desc: 'Cards & methods' },
  { id: 'reviews', label: 'Reviews', icon: Star, desc: 'Your product reviews' },
  { id: 'returns', label: 'Returns', icon: RotateCcw, desc: 'Returns & refunds' },
  { id: 'settings', label: 'Settings', icon: Settings, desc: 'Profile, security, alerts' },
];

export function AccountMobileProfile({
  displayName,
  email,
  initials,
  avatarSrc,
}) {
  return (
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
        Edit profile
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

/** Vertical settings-style menu — no horizontal scroll */
export function AccountMobileMenu({ activeTab, onTabChange, orderCount = 0, wishlistCount = 0, onLogout }) {
  const badges = { orders: orderCount, wishlist: wishlistCount };

  return (
    <nav className="rx-acc-menu" aria-label="Account">
      <p className="rx-acc-menu-label">Your account</p>
      <ul className="rx-acc-menu-list">
        {ACCOUNT_MENU_ITEMS.filter((i) => i.id !== 'overview').map((item) => {
          const Icon = item.icon;
          const badge = badges[item.id];
          return (
            <li key={item.id}>
              <motion.button
                type="button"
                className={`rx-acc-menu-row${activeTab === item.id ? ' is-active' : ''}`}
                onClick={() => onTabChange(item.id)}
                whileTap={{ scale: 0.99 }}
              >
                <span className="rx-acc-menu-icon">
                  <Icon size={18} strokeWidth={1.85} />
                </span>
                <span className="rx-acc-menu-body">
                  <span className="rx-acc-menu-title">{item.label}</span>
                  <span className="rx-acc-menu-desc">{item.desc}</span>
                </span>
                {badge > 0 && (
                  <span className="rx-acc-menu-badge">{badge > 99 ? '99+' : badge}</span>
                )}
                <ChevronRight size={18} className="rx-acc-menu-chevron" />
              </motion.button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="rx-acc-menu-row rx-acc-menu-row--logout" onClick={onLogout}>
        <span className="rx-acc-menu-icon">
          <LogOut size={18} />
        </span>
        <span className="rx-acc-menu-body">
          <span className="rx-acc-menu-title">Log out</span>
          <span className="rx-acc-menu-desc">Sign out of this device</span>
        </span>
        <ChevronRight size={18} className="rx-acc-menu-chevron" />
      </button>
    </nav>
  );
}

export function AccountMobileBackBar({ title, onBack }) {
  return (
    <header className="rx-acc-back-bar">
      <button type="button" className="rx-acc-back-btn" onClick={onBack} aria-label="Back to account">
        <ArrowLeft size={20} />
        <span>Account</span>
      </button>
      <h1 className="rx-acc-back-title">{title}</h1>
    </header>
  );
}

/** Hub: profile + vertical menu (mobile landing) */
export default function AccountMobileLayout({
  activeTab,
  onTabChange,
  onBackToHub,
  displayName,
  email,
  initials,
  avatarSrc,
  orderCount,
  wishlistCount,
  onLogout,
  tabLabel,
  onOpenSecurity,
}) {
  const isHub = activeTab === 'overview';

  /* Settings uses its own top bar + section hub — avoid duplicate account menu */
  if (activeTab === 'settings') {
    return null;
  }

  if (!isHub) {
    return (
      <div className="rx-acc-mobile-layout lg:hidden">
        <AccountMobileBackBar title={tabLabel} onBack={onBackToHub} />
      </div>
    );
  }

  return (
    <div className="rx-acc-mobile-layout lg:hidden">
      <AccountMobileProfile
        displayName={displayName}
        email={email}
        initials={initials}
        avatarSrc={avatarSrc}
      />
      <AccountMobileMenu
        activeTab={activeTab}
        onTabChange={onTabChange}
        orderCount={orderCount}
        wishlistCount={wishlistCount}
        onLogout={onLogout}
      />
      <button type="button" className="rx-acc-security-banner" onClick={onOpenSecurity}>
        <Shield size={18} />
        <span>Security & password</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
