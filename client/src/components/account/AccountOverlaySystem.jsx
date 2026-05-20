import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Edit3,
  Shield,
  X,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useAuthStore } from '../../stores/authStore';
import { useAccountOverlay } from '../../stores/accountOverlayStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useRecentlyViewed } from '../../stores/recentlyViewedStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useToastStore } from '../../stores/toastStore';
import { accountAvatarLayoutId } from '../../motion/presets';
import { profileAPI } from '../../lib/api';
import api from '../../services/api';
import { SERVER_URL } from '../../lib/config';
import {
  ACCOUNT_MENU_GROUPS,
  DANGER_ITEMS,
  ORDER_STATUS_SHORTCUTS,
  PANEL_TITLES,
  QUICK_STAT_CARDS,
  SETTINGS_GROUPS,
} from './accountConfig';
import AccountTabPanels from './AccountTabPanels';
import AccountAppearancePanel from './AccountAppearancePanel';
import '../../styles/account-overlay.css';
import '../../styles/account-os.css';

const EASE = [0.22, 1, 0.36, 1];
const OPEN_MS = 0.22;
const CLOSE_MS = 0.18;

const sheetMotion = {
  initial: { y: 42, opacity: 0, scale: 0.985 },
  animate: { y: 0, opacity: 1, scale: 1 },
  exit: { y: 48, opacity: 0, scale: 0.985 },
  transition: { duration: OPEN_MS, ease: EASE },
};

const layerSlide = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2, ease: EASE },
};

function resolveAvatar(src) {
  if (!src) return null;
  if (typeof src !== 'string') return null;
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  return `${SERVER_URL}${src}`;
}

function MenuItem({ item, onPress, danger }) {
  const Icon = item.icon;
  return (
    <motion.button
      type="button"
      className={`aco-menu-item${danger ? ' aco-menu-item--danger' : ''}`}
      onClick={() => onPress(item)}
      whileTap={{ scale: 0.97 }}
    >
      <span className="aco-menu-icon">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="aco-menu-text">
        <span className="aco-menu-title">{item.title}</span>
        {item.subtitle && <span className="aco-menu-sub">{item.subtitle}</span>}
      </span>
      <ChevronRight size={18} style={{ color: 'rgba(255,255,255,0.35)' }} />
    </motion.button>
  );
}

function ProfileHeader({ user, onEdit }) {
  const layoutId = accountAvatarLayoutId(user);
  const avatarUrl = resolveAvatar(user?.avatar_url);
  const name = user?.full_name || 'Member';
  const email = user?.email || '';
  const initial = (name || email || 'U').charAt(0).toUpperCase();

  return (
    <div className="aco-profile-card">
      <motion.div
        layoutId={layoutId}
        layout
        className="aco-avatar"
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" />
        ) : (
          <span>{initial}</span>
        )}
      </motion.div>
      <div className="min-w-0 flex-1">
        <h2 className="aco-profile-name">
          {name}
          <BadgeCheck size={16} style={{ color: '#ff6a00' }} />
        </h2>
        <p className="aco-profile-tier">Premium Member</p>
        <p className="aco-profile-email">{email}</p>
      </div>
      <button type="button" className="aco-edit-btn" aria-label="Edit profile" onClick={onEdit}>
        <Edit3 size={18} />
      </button>
    </div>
  );
}

function AccountMainLayer({ user, orderCounts, onItem, onSettings }) {
  const currencyPricing = useCurrencyPricing();
  const wishlistCount = useWishlistStore((s) => s.items?.length || 0);
  const recentCount = useRecentlyViewed((s) => s.items?.length || 0);

  const statValues = {
    wallet: currencyPricing.formatLocalWithUsd(0),
    orders: String(orderCounts.total || 0),
    rewards: '2,450',
    membership: 'Silver',
  };

  return (
    <>
      <ProfileHeader user={user} onEdit={() => onItem({ popup: 'editProfile' })} />

      <div className="aco-quick-stats">
        {QUICK_STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              className="aco-stat-card"
              onClick={() => onItem({ panel: card.panel })}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} style={{ color: '#ff6a00' }} />
                <span className="aco-stat-label">{card.label}</span>
              </div>
              <p className="aco-stat-value">{statValues[card.id] || '—'}</p>
            </button>
          );
        })}
      </div>

      <div className="aco-order-row">
        {ORDER_STATUS_SHORTCUTS.map((chip) => {
          const Icon = chip.icon;
          const count = orderCounts[chip.badgeKey] || 0;
          return (
            <motion.button
              key={chip.id}
              type="button"
              className="aco-order-chip"
              whileTap={{ scale: 0.97 }}
              onClick={() => onItem({ panel: chip.panel })}
            >
              <Icon size={18} />
              {count > 0 && <span className="aco-order-badge">{count > 9 ? '9+' : count}</span>}
              {chip.label}
            </motion.button>
          );
        })}
      </div>

      {ACCOUNT_MENU_GROUPS.map((group) => (
        <div key={group.id} className="aco-group">
          <p className="aco-group-title">{group.title}</p>
          {group.items.map((item) => (
            <MenuItem key={item.id} item={item} onPress={onItem} />
          ))}
        </div>
      ))}

      <div className="aco-group">
        <p className="aco-group-title">DANGER ZONE</p>
        {DANGER_ITEMS.map((item) => (
          <MenuItem key={item.id} item={item} onPress={onItem} danger={item.danger} />
        ))}
      </div>

      <button type="button" className="aco-settings-cta" onClick={onSettings}>
        Account Settings
      </button>

      <p className="text-center text-[11px] pb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {wishlistCount} saved · {recentCount} recently viewed
      </p>
    </>
  );
}

function SettingsLayer({ onItem }) {
  return (
    <>
      {SETTINGS_GROUPS.map((group) => (
        <div key={group.id} className="aco-group">
          <p className="aco-group-title">{group.title}</p>
          {group.items.map((item) => (
            <MenuItem key={item.id} item={item} onPress={onItem} />
          ))}
        </div>
      ))}
      <div className="aco-group">
        <p className="aco-group-title">DANGER ZONE</p>
        {DANGER_ITEMS.map((item) => (
          <MenuItem key={item.id} item={item} onPress={onItem} danger={item.danger} />
        ))}
      </div>
    </>
  );
}

function AppearanceLayer() {
  return (
    <div style={{ padding: '0 24px 16px' }}>
      <AccountAppearancePanel />
    </div>
  );
}

function EditProfilePopup({ user, onClose, onSaved }) {
  const showToast = useToastStore((s) => s.showToast);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await profileAPI.updateProfile({ fullName, phone, bio });
      onSaved({ full_name: fullName, phone });
      showToast('Profile updated', 'success');
      onClose();
    } catch {
      showToast('Could not update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="aco-popup-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="aco-popup"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold m-0">Edit Profile</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="aco-field">
          <label>Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="aco-field">
          <label>Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="aco-field">
          <label>Bio</label>
          <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <button type="button" className="aco-btn-primary" disabled={saving} onClick={submit}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </motion.div>
    </motion.div>
  );
}

function LogoutPopup({ onClose, onConfirm }) {
  return (
    <motion.div
      className="aco-popup-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="aco-popup aco-popup--sm"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="aco-popup-logout-icon">
          <Shield size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2">Log out?</h3>
        <p className="text-sm mb-0" style={{ color: 'rgba(255,255,255,0.6)' }}>
          You can sign back in anytime. Your cart and preferences stay on this device until cleared.
        </p>
        <button type="button" className="aco-btn-danger" onClick={onConfirm}>
          Log Out
        </button>
        <button type="button" className="aco-btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function AccountOverlaySystem() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const signOut = useAuthStore((s) => s.signOut);

  const isOpen = useAccountOverlay((s) => s.isOpen);
  const sheet = useAccountOverlay((s) => s.sheet);
  const panelId = useAccountOverlay((s) => s.panelId);
  const popup = useAccountOverlay((s) => s.popup);
  const back = useAccountOverlay((s) => s.back);
  const closeAll = useAccountOverlay((s) => s.closeAll);
  const clearAfterExit = useAccountOverlay((s) => s.clearAfterExit);
  const openSettings = useAccountOverlay((s) => s.openSettings);
  const openAppearance = useAccountOverlay((s) => s.openAppearance);
  const openPanel = useAccountOverlay((s) => s.openPanel);
  const openPopup = useAccountOverlay((s) => s.openPopup);
  const closePopup = useAccountOverlay((s) => s.closePopup);


  const { data: orders = [] } = useQuery({
    queryKey: ['account-overlay-orders', user?.id],
    queryFn: async () => {
      const res = await api.get('/orders', { params: { limit: 50 } });
      return res.data?.orders || res.data?.data?.orders || [];
    },
    enabled: isOpen && Boolean(user?.id),
    staleTime: 60 * 1000,
  });

  const orderCounts = useMemo(() => {
    const counts = { total: orders.length, pending: 0, processing: 0, shipped: 0, delivered: 0 };
    orders.forEach((o) => {
      const s = String(o.status || o.orderStatus || '').toLowerCase();
      if (s.includes('pending') || s.includes('pay')) counts.pending += 1;
      else if (s.includes('process')) counts.processing += 1;
      else if (s.includes('ship')) counts.shipped += 1;
      else if (s.includes('deliver')) counts.delivered += 1;
    });
    return counts;
  }, [orders]);

  useEffect(() => {
    if (!isOpen || !isMobile) return undefined;
    document.documentElement.classList.add('rx-layer-open');
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (popup) closePopup();
        else closeAll();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('rx-layer-open');
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, isMobile, popup, closeAll, closePopup]);

  const handleMenuItem = useCallback(
    (item) => {
      if (item.popup === 'logout') {
        openPopup('logout');
        return;
      }
      if (item.popup === 'editProfile') {
        openPopup('editProfile');
        return;
      }
      if (item.layer === 'appearance') {
        openAppearance();
        return;
      }
      if (item.panel) {
        openPanel(item.panel, item.settingsSection || 'profile');
        return;
      }
      if (item.external) {
        closeAll();
        navigate(item.external);
      }
    },
    [closeAll, navigate, openAppearance, openPanel, openPopup],
  );

  const handleLogout = async () => {
    closePopup();
    closeAll();
    await signOut();
    navigate('/');
  };

  const layerTitle =
    sheet === 'settings'
      ? 'Account Settings'
      : sheet === 'appearance'
        ? 'Appearance'
        : sheet === 'panel'
          ? PANEL_TITLES[panelId] || 'Details'
          : 'Account';

  if (!isMobile || !user) return null;

  return (
    <>
      <AnimatePresence onExitComplete={clearAfterExit}>
        {isOpen && (
          <div className="aco-root" role="presentation">
            <motion.button
              type="button"
              className="aco-backdrop"
              aria-label="Close account"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: OPEN_MS, ease: EASE }}
              onClick={closeAll}
            />

            <motion.div
              className="aco-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={layerTitle}
              {...sheetMotion}
              exit={{ ...sheetMotion.exit, transition: { duration: CLOSE_MS, ease: EASE } }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 650) closeAll();
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aco-handle" aria-hidden />

              {sheet !== 'account' && (
                <div className="aco-layer-head">
                  <button type="button" className="aco-back-btn" onClick={back} aria-label="Back">
                    <ArrowLeft size={18} />
                  </button>
                  <h2 className="aco-layer-title">{layerTitle}</h2>
                </div>
              )}

              <div className="aco-layer-scroll">
                <AnimatePresence mode="wait">
                  {sheet === 'account' && (
                    <motion.div key="account" {...layerSlide}>
                      <AccountMainLayer
                        user={user}
                        orderCounts={orderCounts}
                        onItem={handleMenuItem}
                        onSettings={openSettings}
                      />
                    </motion.div>
                  )}
                  {sheet === 'settings' && (
                    <motion.div key="settings" {...layerSlide}>
                      <SettingsLayer onItem={handleMenuItem} />
                    </motion.div>
                  )}
                  {sheet === 'appearance' && (
                    <motion.div key="appearance" {...layerSlide}>
                      <AppearanceLayer />
                    </motion.div>
                  )}
                  {sheet === 'panel' && (
                    <motion.div key={`panel-${panelId}`} {...layerSlide}>
                      <AccountTabPanels panelId={panelId} userId={user?.id} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {popup === 'editProfile' && (
          <EditProfilePopup
            user={user}
            onClose={closePopup}
            onSaved={(patch) => setUser({ ...user, ...patch })}
          />
        )}
        {popup === 'logout' && <LogoutPopup onClose={closePopup} onConfirm={handleLogout} />}
      </AnimatePresence>
    </>
  );
}
