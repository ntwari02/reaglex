import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Palette, AlertTriangle, Edit3, Camera, Mail, Phone, MapPin, Calendar,
  Eye, EyeOff, Shield, Loader2, Check, X, ChevronRight, Moon, Sun,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { useToastStore } from '../stores/toastStore';
import {
  getRecommendationEmailPreference,
  updateRecommendationEmailPreference,
} from '../services/recommendationEmailApi';
import { profileAPI } from '../lib/api';
import WebPushOptInCard from './notifications/WebPushOptInCard';
import { SettingsTopBar, SettingsNavCard } from './account/SettingsPageShell';
import '../styles/account-settings.css';

const PRIMARY = 'var(--brand-primary)';
const SUCCESS = '#10b981';
const ERROR = '#ef4444';
const WARNING = '#f59e0b';
const EASE = [0.25, 0.46, 0.45, 0.94];
const CARD_STYLE = {
  boxShadow: 'var(--shadow-card)',
  borderRadius: 16,
  background: 'var(--card-bg)',
  border: '1px solid var(--border-card)',
};

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: User, desc: 'Photo, name & contact' },
  { id: 'security', label: 'Security', icon: Lock, desc: 'Password, 2FA & sessions' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Orders, deals & alerts' },
  { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Light or dark theme' },
  { id: 'preferences', label: 'Preferences', icon: Shield, desc: 'Language & privacy' },
  { id: 'danger', label: 'Danger zone', icon: AlertTriangle, desc: 'Deactivate or delete' },
];

const SETTINGS_SECTION_META = Object.fromEntries(
  SETTINGS_TABS.map((t) => [t.id, { title: t.label, sub: t.desc }]),
);

function useIsMobileAccount() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    onChange();
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

const COUNTRIES = [
  { code: 'RW', flag: '🇷🇼', name: 'Rwanda' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
];

export default function AccountSettingsDashboard({ onOpenSecurityMobile, onBack } = {}) {
  const [sp, setSp] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobileAccount();

  const sectionParam = sp.get('section') || '';
  const section = isMobile ? (sectionParam || '') : (sectionParam || 'profile');
  const settingsTabsScrollRef = useRef(null);
  const [showTabsLeftFade, setShowTabsLeftFade] = useState(false);
  const [showTabsRightFade, setShowTabsRightFade] = useState(false);
  const [tabsHintDismissed, setTabsHintDismissed] = useState(false);
  useEffect(() => {
    if (sp.get('tab') !== 'settings' || sp.get('section') || isMobile) return;
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      n.set('section', 'profile');
      return n;
    });
  }, [sp.get('tab'), sp.get('section'), setSp, isMobile]);
  const setSection = useCallback((s) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      n.set('tab', 'settings');
      n.set('section', s);
      return n;
    });
  }, [setSp]);

  useEffect(() => {
    const el = settingsTabsScrollRef.current;
    if (!el) return;
    const update = () => {
      const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      setShowTabsLeftFade(el.scrollLeft > 4);
      setShowTabsRightFade(el.scrollLeft < maxLeft - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [section]);

  useEffect(() => {
    const el = settingsTabsScrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector('[data-settings-tab-active="true"]');
    if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [section]);

  // Profile form state
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: (user?.full_name || '').split(' ')[0] || '',
    lastName: (user?.full_name || '').split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: '',
    gender: '',
    country: 'RW',
    city: '',
    bio: '',
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [avatarOverlay, setAvatarOverlay] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(65);
  const fileInputRef = useRef(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [sessions] = useState([
    { id: 1, device: 'Chrome on Windows', location: 'Kigali, Rwanda 🇷🇼', current: true, time: 'Active now' },
    { id: 2, device: 'Safari on iPhone', location: 'Kigali, Rwanda 🇷🇼', current: false, time: '2 hours ago' },
  ]);
  const [loginHistory] = useState([
    { date: 'Feb 28, 2026 10:30', device: 'Chrome', location: 'Kigali', status: 'success' },
    { date: 'Feb 27, 2026 18:00', device: 'Safari', location: 'Kigali', status: 'success' },
    { date: 'Feb 26, 2026 09:00', device: 'Chrome', location: 'Unknown', status: 'failed' },
  ]);

  // Notifications state
  const [notifPrefs, setNotifPrefs] = useState({
    orderPlaced: true,
    orderShipped: true,
    outForDelivery: true,
    orderDelivered: true,
    returnUpdates: true,
    flashSale: true,
    wishlistNew: false,
    weeklyDigest: true,
    recommendations: false,
    newDevice: true,
    passwordChanged: true,
    profileUpdated: true,
    twoFactorAlerts: true,
    newMessage: true,
    readReceipt: false,
    storeAnnouncements: true,
    inApp: true,
    email: true,
    sms: false,
    push: false,
  });
  const [notifDirty, setNotifDirty] = useState(false);
  const [pauseAll, setPauseAll] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietFrom, setQuietFrom] = useState('22:00');
  const [quietTo, setQuietTo] = useState('08:00');
  const [notifDigest, setNotifDigest] = useState('weekly');
  const [recEmailPrefs, setRecEmailPrefs] = useState({
    enabled: true,
    frequency: 'weekly',
    mode: 'mixed',
    unsubscribed: false,
    lastSentAt: null,
  });
  const [recPrefLoading, setRecPrefLoading] = useState(false);

  // Preferences state
  const [prefs, setPrefs] = useState({
    language: 'en', currency: 'USD', theme: 'system',
    productView: 'grid', showPricesIn: 'USD', digestFreq: 'weekly',
    autoWishlist: false, showProfile: true, personalizedRec: true, shareHistory: false,
  });
  const [prefsDirty, setPrefsDirty] = useState(false);

  // Danger zone modals
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState('');
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [dataExportRequested, setDataExportRequested] = useState(false);

  const unsavedBySection = {
    profile: profileDirty,
    security: false,
    notifications: notifDirty,
    appearance: false,
    preferences: prefsDirty,
    danger: false,
  };
  const hasUnsaved = Object.values(unsavedBySection).some(Boolean);

  // Sync profile form from user
  useEffect(() => {
    const name = (user?.full_name || '').split(' ');
    setProfileForm((p) => ({
      ...p,
      firstName: name[0] || p.firstName,
      lastName: name.slice(1).join(' ') || p.lastName,
      email: user?.email || p.email,
      phone: user?.phone || p.phone,
    }));
  }, [user?.full_name, user?.email, user?.phone]);

  // Profile completion
  useEffect(() => {
    let n = 0;
    if (profileForm.firstName) n += 15;
    if (profileForm.lastName) n += 15;
    if (profileForm.email) n += 20;
    if (profileForm.phone) n += 15;
    if (profileForm.dateOfBirth) n += 10;
    if (profileForm.country) n += 10;
    if (profileForm.city) n += 5;
    if (profileForm.bio) n += 10;
    setProfileCompletion(Math.min(100, n));
  }, [profileForm]);

  // beforeunload
  useEffect(() => {
    const onBeforeUnload = (e) => { if (hasUnsaved) e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsaved]);

  useEffect(() => {
    let mounted = true;
    const loadRecPrefs = async () => {
      if (!user) return;
      setRecPrefLoading(true);
      try {
        const pref = await getRecommendationEmailPreference();
        if (!mounted || !pref) return;
        setRecEmailPrefs((p) => ({
          ...p,
          enabled: !!pref.enabled,
          frequency: pref.frequency || 'weekly',
          mode: pref.mode || 'mixed',
          unsubscribed: !!pref.unsubscribed,
          lastSentAt: pref.lastSentAt || null,
        }));
      } catch {
        // ignore load errors for this optional settings panel
      } finally {
        if (mounted) setRecPrefLoading(false);
      }
    };
    void loadRecPrefs();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const handleProfileChange = (key, value) => {
    setProfileForm((p) => ({ ...p, [key]: value }));
    setProfileDirty(true);
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setProfileSaving(false);
    setProfileSaved(true);
    setProfileDirty(false);
    setProfileEdit(false);
    showToast('Profile updated successfully! 🎉', 'success', 3000);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const updatePassword = async () => {
    setPasswordSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setPasswordSaving(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password updated ✓', 'success');
  };

  const initials =
    ((profileForm.firstName || '') + (profileForm.lastName || '')).trim() ||
    (user?.full_name || 'U').slice(0, 2);
  const tabIndex = SETTINGS_TABS.findIndex((t) => t.id === section);

  // All individual notification keys counted for summary
  const notifKeys = [
    'orderPlaced',
    'orderShipped',
    'outForDelivery',
    'orderDelivered',
    'returnUpdates',
    'flashSale',
    'wishlistNew',
    'weeklyDigest',
    'recommendations',
    'newDevice',
    'passwordChanged',
    'profileUpdated',
    'twoFactorAlerts',
    'newMessage',
    'readReceipt',
    'storeAnnouncements',
  ];
  const activeNotifCount = notifKeys.filter((k) => notifPrefs[k]).length;
  const totalNotifCount = notifKeys.length;

  const handleToggle = (key) => {
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));
    setNotifDirty(true);
  };

  const showMobileHub = isMobile && !section;
  const sectionMeta = SETTINGS_SECTION_META[section] || { title: 'Settings', sub: 'Your account' };

  const handleSettingsBack = () => {
    if (isMobile && section) {
      setSp((prev) => {
        const n = new URLSearchParams(prev);
        n.delete('section');
        return n;
      });
      return;
    }
    onBack?.();
  };

  const openSettingsSection = (id) => {
    if (id === 'security' && onOpenSecurityMobile && isMobile) {
      onOpenSecurityMobile();
      return;
    }
    setSection(id);
  };

  return (
    <div
      className="rx-settings-page min-h-[520px]"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="rx-settings-inner max-w-[1300px] mx-auto px-3 sm:px-5 lg:px-7 py-3 sm:py-6 space-y-4">
        <SettingsTopBar
          title={showMobileHub ? 'Settings' : sectionMeta.title}
          subtitle={showMobileHub ? 'Manage your Spacilly account' : sectionMeta.sub}
          onBack={handleSettingsBack}
          backLabel={showMobileHub ? 'Back to account' : 'Back'}
        />

        {showMobileHub && (
          <nav className="rx-settings-hub" aria-label="Settings sections">
            {SETTINGS_TABS.map((t) => (
              <SettingsNavCard
                key={t.id}
                icon={t.icon}
                label={t.label}
                description={t.desc}
                danger={t.id === 'danger'}
                onClick={() => openSettingsSection(t.id)}
              />
            ))}
          </nav>
        )}

        <div
          className={
            showMobileHub ? 'rx-settings-body rx-settings-body--hidden-mobile space-y-6' : 'space-y-6'
          }
        >
        {/* Tabs — desktop */}
        <motion.div
          className="hidden lg:flex items-center justify-between gap-4 flex-wrap"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1, ease: EASE }}
        >
          <div className="w-full flex items-center justify-between sm:justify-end gap-3">
            {!tabsHintDismissed && showTabsRightFade && (
              <button
                type="button"
                onClick={() => setTabsHintDismissed(true)}
                className="sm:hidden flex items-center gap-1"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: PRIMARY,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                }}
              >
                Swipe for more <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <div className="relative flex-1 min-w-0">
              {showTabsLeftFade && (
                <div
                  aria-hidden
                  className="sm:hidden"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 20,
                    zIndex: 2,
                    pointerEvents: 'none',
                    background: 'linear-gradient(90deg, var(--bg-page), transparent)',
                  }}
                />
              )}
              {showTabsRightFade && (
                <div
                  aria-hidden
                  className="sm:hidden"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 20,
                    zIndex: 2,
                    pointerEvents: 'none',
                    background: 'linear-gradient(270deg, var(--bg-page), transparent)',
                  }}
                />
              )}
              <div
                ref={settingsTabsScrollRef}
                className="settings-tabs-scroll-container flex overflow-x-auto gap-2 scrollbar-hide"
                style={{ scrollbarWidth: 'none' }}
              >
                <div
                  className="inline-flex items-center gap-1 rounded-2xl px-1.5 py-1.5 bg-[var(--card-bg)]"
                  style={{
                    borderRadius: 16,
                    border: '1px solid color-mix(in srgb, var(--border-card) 50%, transparent)',
                  }}
                >
                  {SETTINGS_TABS.map((t) => {
                    const isActive = section === t.id;
                    const hasUnsavedSection = unsavedBySection[t.id];
                    const TabIcon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        data-settings-tab
                        data-settings-tab-active={isActive ? 'true' : 'false'}
                        onClick={() => {
                          if (unsavedBySection[section] && section !== t.id) {
                            if (window.confirm('Save changes before leaving?')) {
                              if (section === 'profile') saveProfile();
                              setSection(t.id);
                            }
                          } else setSection(t.id);
                        }}
                        className="relative flex items-center gap-2 h-10 px-4 rounded-[10px] text-[14px] font-medium whitespace-nowrap transition-all"
                        style={{
                          background: isActive ? PRIMARY : 'transparent',
                          color: isActive ? '#ffffff' : 'var(--text-muted)',
                          boxShadow: isActive
                            ? 'var(--shadow-cta)'
                            : 'none',
                        }}
                      >
                        <TabIcon
                          size={16}
                          strokeWidth={1.85}
                          style={{ color: isActive ? '#ffffff' : 'var(--text-faint)', flexShrink: 0 }}
                        />
                        <span>{t.label}</span>
                        {hasUnsavedSection && (
                          <span className="settings-unsaved-dot" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content – fills remaining space next to outer sidebar */}
        <div className="space-y-6">
        {section === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <div
              className="rounded-[24px] overflow-hidden rx-settings-card"
              style={{
                background: 'var(--card-bg)',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border-card)',
              }}
            >
              {/* Top banner */}
              <div
                className="relative profile-banner h-[88px] sm:h-[120px]"
                style={{
                  background: 'var(--panel-deep-bg)',
                }}
              >
                <div
                  className="absolute -top-10 -left-10 w-40 h-40 rounded-full"
                  style={{ background: 'var(--brand-tint-strong)', filter: 'blur(40px)' }}
                />
                <div
                  className="absolute -bottom-12 right-0 w-52 h-52 rounded-full"
                  style={{ background: 'rgba(124,58,237,0.10)', filter: 'blur(56px)' }}
                />
                <button
                  type="button"
                  className="absolute top-4 right-4 text-[12px] px-3 py-1.5 rounded-lg profile-cover-btn"
                >
                  ✏ Edit Cover
                </button>

                {/* Avatar overlapping */}
                <div className="absolute left-4 sm:left-8 -bottom-10 sm:-bottom-12">
                  <div
                    className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-white cursor-pointer overflow-hidden"
                    style={{
                      background: PRIMARY,
                      border: '4px solid var(--card-bg)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}
                    onMouseEnter={() => setAvatarOverlay(true)}
                    onMouseLeave={() => {
                      setAvatarOverlay(false);
                      setAvatarMenuOpen(false);
                    }}
                    onClick={() => setAvatarMenuOpen((v) => !v)}
                  >
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials.toUpperCase().slice(0, 2)
                    )}
                    <AnimatePresence>
                      {avatarOverlay && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 transition-opacity duration-200"
                        >
                          <Camera className="w-7 h-7 text-white mb-1" />
                          <span className="text-xs text-white font-medium">
                            Change Photo
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {avatarMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 py-2 rounded-xl min-w-[190px] z-10"
                      style={{
                        background: 'var(--card-bg)',
                        boxShadow: '0 18px 45px rgba(15,23,42,0.5)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                      >
                        📷 Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-2"
                      >
                        🔗 Use URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvatarMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-2 text-red-500"
                      >
                        🗑️ Remove Photo
                      </button>
                    </motion.div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Main content inside card */}
              <div className="px-4 sm:px-8 pt-14 sm:pt-16 pb-6 sm:pb-7 space-y-6">
                {/* Name + status + edit */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:block w-0 sm:w-24" />
                    <div>
                      <h3
                        className="text-lg sm:text-xl font-bold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {(profileForm.firstName || profileForm.lastName
                          ? `${profileForm.firstName} ${profileForm.lastName}`
                          : user?.full_name) || 'User'}
                      </h3>
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {user?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: '#22c55e',
                            boxShadow: '0 0 0 4px rgba(34,197,94,0.3)',
                          }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: '#22c55e' }}
                        >
                          Active member
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileEdit((v) => !v)}
                    className="self-start text-xs sm:text-sm font-semibold px-4 py-2 rounded-[10px]"
                    style={{
                      background: 'transparent',
                      boxShadow: '0 0 0 1.5px var(--border-card)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    ✏ Edit Profile
                  </button>
                </div>

                {/* Profile completion & chips */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--text-muted)' }}>
                      Profile completion
                    </span>
                    <span style={{ color: PRIMARY, fontWeight: 600 }}>
                      {profileCompletion}%
                    </span>
                  </div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                    className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        background:
                          'var(--gradient-brand-cta)',
                      }}
                    />
                  </motion.div>
                  <p
                    className="text-xs mt-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {profileCompletion >= 80
                      ? 'Looking good!'
                      : profileCompletion >= 65
                      ? 'Add phone to reach 80%'
                      : 'Add more details to complete your profile.'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {!profileForm.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileEdit(true);
                          handleProfileChange('phone', '');
                        }}
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: 'var(--brand-tint)',
                          color: PRIMARY,
                        }}
                      >
                        + Add Phone
                      </button>
                    )}
                    {!profileForm.bio && (
                      <button
                        type="button"
                        onClick={() => setProfileEdit(true)}
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: 'var(--brand-tint)',
                          color: PRIMARY,
                        }}
                      >
                        + Add Bio
                      </button>
                    )}
                    {!profileForm.city && (
                      <button
                        type="button"
                        onClick={() => setProfileEdit(true)}
                        className="px-2 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: 'var(--brand-tint)',
                          color: PRIMARY,
                        }}
                      >
                        + Add Location
                      </button>
                    )}
                  </div>
                </div>

                {/* Personal information form */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3
                      className="font-bold text-lg"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Personal Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { key: 'firstName', label: 'First Name *', icon: User, type: 'text' },
                  { key: 'lastName', label: 'Last Name *', icon: User, type: 'text' },
                  { key: 'email', label: 'Email Address *', icon: Mail, type: 'email' },
                  { key: 'dateOfBirth', label: 'Date of Birth', icon: Calendar, type: 'date' },
                  { key: 'gender', label: 'Gender', icon: User, type: 'select', options: ['Male', 'Female', 'Prefer not to say'] },
                  { key: 'phone', label: 'Phone Number', icon: Phone, type: 'tel' },
                  { key: 'country', label: 'Country', icon: MapPin, type: 'country' },
                  { key: 'city', label: 'City / Location', icon: MapPin, type: 'text' },
                ].map((f, i) => (
                  <motion.div key={f.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + i * 0.08 }}>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)', letterSpacing: 1 }}>{f.label}</label>
                    {profileEdit ? (
                      f.type === 'select' ? (
                        <div className="relative profile-field-wrap">
                          <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 profile-field-icon" style={{ color: 'var(--text-muted)' }} />
                          <select
                            value={profileForm[f.key] || ''}
                            onChange={(e) => handleProfileChange(f.key, e.target.value)}
                            className="w-full h-12 pl-10 pr-4 rounded-xl outline-none transition-all focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] premium-input-exempt"
                            style={{ border: '1.5px solid var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          >
                            <option value="">Select</option>
                            {(f.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                      ) : f.type === 'country' ? (
                        <div className="relative profile-field-wrap">
                          <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 profile-field-icon" style={{ color: 'var(--text-muted)' }} />
                          <select
                            value={profileForm.country || 'RW'}
                            onChange={(e) => handleProfileChange('country', e.target.value)}
                            className="w-full h-12 pl-10 pr-4 rounded-xl outline-none transition-all focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] premium-input-exempt"
                            style={{ border: '1.5px solid var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          >
                            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="relative profile-field-wrap">
                          <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 profile-field-icon" style={{ color: 'var(--text-muted)' }} />
                          <input
                            type={f.type}
                            value={profileForm[f.key] || ''}
                            onChange={(e) => handleProfileChange(f.key, e.target.value)}
                            className="w-full h-12 pl-10 pr-10 rounded-xl outline-none transition-all focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] premium-input-exempt"
                            style={{ border: '1.5px solid var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                          {profileForm[f.key] && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                        </div>
                      )
                    ) : (
                      <div
                        className="h-12 flex items-center gap-3 rounded-xl px-4 border min-h-[48px]"
                        style={{ border: '1.5px solid var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        <f.icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-sm">{profileForm[f.key] || '—'}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="mt-5">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Bio / About</label>
                {profileEdit ? (
                  <div className="relative profile-field-wrap">
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value.slice(0, 200))}
                      rows={4}
                      placeholder="Tell buyers and sellers about yourself..."
                      className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] resize-y min-h-[100px] premium-input-exempt"
                      style={{ border: '1.5px solid var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                    <span className={`absolute bottom-2 right-3 text-xs ${profileForm.bio.length >= 200 ? 'text-red-500' : profileForm.bio.length >= 180 ? 'text-[var(--brand-primary)]' : 'text-gray-400'}`}>
                      {profileForm.bio.length} / 200
                    </span>
                  </div>
                ) : (
                  <div
                    className="rounded-xl px-4 py-3 min-h-[100px] border"
                    style={{ border: '1.5px solid var(--divider)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    <p className="text-sm whitespace-pre-wrap">{profileForm.bio || '—'}</p>
                  </div>
                )}
              </div>
              {profileEdit && (
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileEdit(false);
                      setProfileDirty(false);
                    }}
                    className="px-4 py-2.5 rounded-xl border-2 font-semibold text-sm"
                    style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center gap-2"
                    style={{ background: profileSaved ? SUCCESS : PRIMARY }}
                  >
                    {profileSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : profileSaved ? (
                      <>
                        Saved <Check className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Save Changes <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
          </motion.div>
        )}

        {section === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-6 hidden lg:block">
            <div className="rounded-2xl rx-settings-card p-7" style={CARD_STYLE}>
              <h3 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>🔒 Change Password</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Current Password</label>
                  <div className="relative">
                    <input type={showCurrentPass ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full h-12 pl-4 pr-12 rounded-xl border premium-input-exempt" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                    <button type="button" onClick={() => setShowCurrentPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">{showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>New Password</label>
                  <div className="relative">
                    <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-12 pl-4 pr-12 rounded-xl border premium-input-exempt" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                    <button type="button" onClick={() => setShowNewPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">{showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full" style={{ background: newPassword.length >= i * 3 ? (i >= 3 ? SUCCESS : i >= 2 ? WARNING : PRIMARY) : 'var(--border-card)' }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirmPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-12 pl-4 pr-12 rounded-xl border premium-input-exempt" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                    {confirmPassword && <span className="absolute right-3 top-1/2 -translate-y-1/2">{newPassword === confirmPassword ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}</span>}
                  </div>
                </div>
                <button type="button" onClick={updatePassword} disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8 || passwordSaving} className="px-5 py-2.5 rounded-xl font-semibold text-white flex items-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>
                  {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Update Password →
                </button>
              </div>
            </div>
            <div className="rounded-2xl rx-settings-card p-7" style={CARD_STYLE}>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>🛡️ Two-Factor Authentication</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Add extra security to your account</p>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${twoFaEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{twoFaEnabled ? 'Enabled' : 'Disabled'}</span>
                <button type="button" onClick={() => setTwoFaEnabled((v) => !v)} className="relative w-12 h-6 rounded-full transition-colors" style={{ background: twoFaEnabled ? PRIMARY : 'var(--border-card)' }}>
                  <motion.div animate={{ x: twoFaEnabled ? 24 : 4 }} className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>
            <div className="rounded-2xl rx-settings-card p-7" style={CARD_STYLE}>
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>📱 Active Sessions</h3>
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--border-card)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.current ? '💻' : '📱'}</span>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{s.device}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.location} · <span style={{ color: s.current ? SUCCESS : 'var(--text-faint)' }}>{s.time}</span></p>
                    </div>
                  </div>
                  {s.current ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--badge-success-bg)', color: SUCCESS }}>This device</span> : <button type="button" className="text-xs font-semibold" style={{ color: ERROR }}>Sign Out</button>}
                </div>
              ))}
              <button type="button" className="mt-4 px-4 py-2 rounded-xl border-2 font-semibold text-sm" style={{ borderColor: ERROR, color: ERROR }}>Sign Out All Other Devices</button>
            </div>
            <div className="rounded-2xl rx-settings-card p-7" style={CARD_STYLE}>
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-primary)' }}>Login History</h3>
              <div className="space-y-2">
                {loginHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b" style={{ borderColor: 'color-mix(in srgb, var(--border-card) 50%, transparent)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{h.date}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{h.device} · {h.location}</span>
                    <span className={`font-medium ${h.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{h.status === 'success' ? 'Success' : 'Failed'}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-3 text-sm font-semibold" style={{ color: PRIMARY }}>View Full History</button>
            </div>
          </motion.div>
        )}

        {section === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="space-y-6"
          >
            {/* Banner */}
            <div
              className="rounded-[20px] px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rx-settings-banner"
              style={{
                background: 'var(--panel-deep-bg)',
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--border-card)',
              }}
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                    }}
                  >
                    <span style={{ fontSize: 26 }}>🔔</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h2
                    className="text-xl sm:text-2xl font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Notification Preferences
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Manage how and when Spacilly notifies you.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-stretch sm:items-end gap-3 min-w-[220px]">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Pause All
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPauseAll((v) => !v);
                      setNotifDirty(true);
                    }}
                    className="relative w-11 h-6 rounded-full"
                    style={{
                      background: pauseAll ? 'rgba(15,23,42,0.8)' : 'var(--brand-primary)',
                      boxShadow: pauseAll
                        ? 'inset 0 0 0 1px rgba(148,163,184,0.5)'
                        : '0 0 8px color-mix(in srgb, var(--brand-primary) 45%, transparent)',
                    }}
                  >
                    <motion.div
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
                      animate={{ x: pauseAll ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    />
                  </button>
                </div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  <span>{pauseAll ? '0' : activeNotifCount}</span>
                  <span>of</span>
                  <span>{totalNotifCount}</span>
                  <span>active</span>
                </div>
              </div>
            </div>

            {/* Browser (PWA) push opt-in */}
            <WebPushOptInCard />

            {/* Notification groups */}
            <div className="grid gap-4">
              {/* ORDER UPDATES */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="rounded-[20px] p-6 rx-settings-card"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--border-card)',
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                      style={{
                        background:
                          'var(--gradient-brand-cta)',
                        color: '#ffffff',
                      }}
                    >
                      📦
                    </div>
                    <div>
                      <h3
                        className="text-[18px] font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Order Updates
                      </h3>
                      <p
                        className="text-[13px] mt-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Stay updated as your order moves from checkout to
                        delivery.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn =
                        notifPrefs.orderPlaced &&
                        notifPrefs.orderShipped &&
                        notifPrefs.outForDelivery &&
                        notifPrefs.orderDelivered &&
                        notifPrefs.returnUpdates;
                      setNotifPrefs((p) => ({
                        ...p,
                        orderPlaced: !allOn,
                        orderShipped: !allOn,
                        outForDelivery: !allOn,
                        orderDelivered: !allOn,
                        returnUpdates: !allOn,
                      }));
                      setNotifDirty(true);
                    }}
                    className="text-[12px] font-semibold"
                    style={{ color: PRIMARY }}
                  >
                    {notifPrefs.orderPlaced &&
                    notifPrefs.orderShipped &&
                    notifPrefs.outForDelivery &&
                    notifPrefs.orderDelivered &&
                    notifPrefs.returnUpdates
                      ? 'Disable all'
                      : 'Enable all'}
                  </button>
                </div>
                <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-[rgba(148,163,184,0.3)] to-transparent" />
                <div className="mt-2 space-y-1">
                  {[
                    ['orderPlaced', 'Order placed confirmation'],
                    ['orderShipped', 'Order shipped'],
                    ['outForDelivery', 'Out for delivery'],
                    ['orderDelivered', 'Order delivered'],
                    ['returnUpdates', 'Return / refund updates'],
                  ].map(([key, label]) => {
                    const k = key;
                    const isOn = notifPrefs[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          if (pauseAll) return;
                          handleToggle(k);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-1 py-3 rounded-[10px] text-left transition-colors"
                        style={{
                          background: 'transparent',
                          opacity: pauseAll ? 0.6 : isOn ? 1 : 0.8,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                            style={{
                              background: 'var(--brand-tint-strong)',
                              color: 'var(--brand-primary)',
                            }}
                          >
                            📦
                          </div>
                          <div>
                            <p
                              className="text-[15px] font-medium"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {label}
                            </p>
                            <p
                              className="text-[12px] mt-0.5"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              Get notified when your order status changes.
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (pauseAll) return;
                              handleToggle(k);
                            }}
                            className="relative w-11 h-6 rounded-full"
                            style={{
                              background: isOn
                                ? 'var(--brand-primary)'
                                : 'rgba(148,163,184,0.4)',
                              boxShadow: isOn
                                ? '0 0 8px color-mix(in srgb, var(--brand-primary) 40%, transparent)'
                                : 'none',
                            }}
                          >
                            <motion.div
                              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white"
                              animate={{ x: isOn ? 20 : 0 }}
                              transition={{
                                type: 'spring',
                                stiffness: 260,
                                damping: 20,
                              }}
                            />
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Additional groups (Deals, Security, Messages) would follow similar pattern... */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 }}
                className="rounded-[20px] p-6 rx-settings-card"
                style={{
                  background: 'var(--card-bg)',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid var(--border-card)',
                }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Personalized Deal Emails
                    </h3>
                    <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      Smart picks based on your wishlist, viewed products, cart, and purchases.
                    </p>
                    {recEmailPrefs.lastSentAt && (
                      <p className="text-[12px] mt-2" style={{ color: 'var(--text-faint)' }}>
                        Last sent: {new Date(recEmailPrefs.lastSentAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={recPrefLoading}
                    onClick={() => {
                      const nextEnabled = !recEmailPrefs.enabled;
                      setRecEmailPrefs((p) => ({ ...p, enabled: nextEnabled, unsubscribed: false }));
                      setNotifDirty(true);
                    }}
                    className="relative w-12 h-7 rounded-full"
                    style={{ background: recEmailPrefs.enabled ? PRIMARY : 'rgba(148,163,184,0.45)' }}
                  >
                    <motion.div
                      className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white"
                      animate={{ x: recEmailPrefs.enabled ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    />
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Frequency
                    <select
                      value={recEmailPrefs.frequency}
                      onChange={(e) => {
                        setRecEmailPrefs((p) => ({ ...p, frequency: e.target.value }));
                        setNotifDirty(true);
                      }}
                      className="mt-2 w-full h-11 rounded-xl px-3 premium-input-exempt"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Recommendation mix
                    <select
                      value={recEmailPrefs.mode}
                      onChange={(e) => {
                        setRecEmailPrefs((p) => ({ ...p, mode: e.target.value }));
                        setNotifDirty(true);
                      }}
                      className="mt-2 w-full h-11 rounded-xl px-3 premium-input-exempt"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                    >
                      <option value="mixed">Mixed recommendations</option>
                      <option value="deals_only">Deals only</option>
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecEmailPrefs((p) => ({ ...p, unsubscribed: true, enabled: false }));
                    setNotifDirty(true);
                  }}
                  className="mt-3 text-xs font-semibold"
                  style={{ color: ERROR }}
                >
                  Unsubscribe from recommendation emails
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {section === 'appearance' && (
          <motion.div
            key="appearance"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl p-7 border"
            style={{
              ...CARD_STYLE,
              background: 'var(--card-bg)',
              borderColor: 'var(--border-card)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-start gap-3 mb-6">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: 'var(--brand-tint)', color: 'var(--brand-primary)' }}
              >
                <Palette className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Choose light or dark mode for Spacilly. Your selection stays on this device and syncs when you&apos;re signed in.
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: 'var(--text-muted)' }}>
              Theme
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className="flex flex-col items-start gap-2 rounded-[18px] border px-4 py-4 text-left transition-all duration-200 active:scale-[0.99]"
                style={{
                  borderColor: theme === 'light' ? 'var(--brand-primary)' : 'var(--border-card)',
                  background:
                    theme === 'light'
                      ? 'color-mix(in srgb, var(--brand-primary) 10%, var(--card-bg))'
                      : 'var(--bg-secondary)',
                  boxShadow: theme === 'light' ? 'var(--shadow-cta)' : 'none',
                }}
              >
                <Sun className="h-5 w-5" style={{ color: theme === 'light' ? 'var(--brand-primary)' : 'var(--text-muted)' }} strokeWidth={1.75} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Light</span>
                <span className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                  Bright backgrounds with crisp contrast for daytime shopping.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className="flex flex-col items-start gap-2 rounded-[18px] border px-4 py-4 text-left transition-all duration-200 active:scale-[0.99]"
                style={{
                  borderColor: theme === 'dark' ? 'var(--brand-primary)' : 'var(--border-card)',
                  background:
                    theme === 'dark'
                      ? 'color-mix(in srgb, var(--brand-primary) 12%, var(--card-bg))'
                      : 'var(--bg-secondary)',
                  boxShadow: theme === 'dark' ? 'var(--shadow-cta)' : 'none',
                }}
              >
                <Moon className="h-5 w-5" style={{ color: theme === 'dark' ? 'var(--brand-primary)' : 'var(--text-muted)' }} strokeWidth={1.75} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Dark</span>
                <span className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                  Cinematic charcoal tones designed for low-light viewing.
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {section === 'preferences' && (
          <motion.div key="preferences" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="rounded-2xl rx-settings-card p-7" style={CARD_STYLE}>
            <h3 className="font-bold text-lg mb-6" style={{ color: 'var(--text-primary)' }}>Display Preferences</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Language</label>
                <select value={prefs.language} onChange={(e) => { setPrefs((p) => ({ ...p, language: e.target.value })); setPrefsDirty(true); }} className="h-12 px-4 rounded-xl border w-full max-w-xs premium-input-exempt" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="en">🇬🇧 English</option>
                  <option value="rw">🇷🇼 Kinyarwanda</option>
                  <option value="fr">🇫🇷 French</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Currency</label>
                <select value={prefs.currency} onChange={(e) => { setPrefs((p) => ({ ...p, currency: e.target.value })); setPrefsDirty(true); }} className="h-12 px-4 rounded-xl border w-full max-w-xs premium-input-exempt" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="USD">$ USD</option>
                  <option value="RWF">RWF</option>
                  <option value="EUR">€ EUR</option>
                </select>
              </div>
              <p className="text-xs rounded-xl px-3 py-2.5" style={{ background: 'var(--brand-tint)', color: 'var(--text-secondary)' }}>
                Theme is controlled from the <strong style={{ color: 'var(--text-primary)' }}>Appearance</strong> tab for a consistent experience across Spacilly.
              </p>
            </div>
            <h3 className="font-bold text-lg mt-8 mb-4" style={{ color: 'var(--text-primary)' }}>Privacy</h3>
            {[
              { key: 'showProfile', label: 'Show my profile to sellers' },
              { key: 'personalizedRec', label: 'Allow personalized recommendations' },
              { key: 'shareHistory', label: 'Share purchase history for better deals' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                <button type="button" onClick={() => { setPrefs((p) => ({ ...p, [key]: !p[key] })); setPrefsDirty(true); }} className="relative w-12 h-6 rounded-full" style={{ background: prefs[key] ? PRIMARY : 'var(--border-card)' }}>
                  <motion.div animate={{ x: prefs[key] ? 24 : 4 }} className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {section === 'danger' && (
          <motion.div
            key="danger"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl p-7 border-2 rx-settings-card rx-settings-card--danger"
            style={{ ...CARD_STYLE, borderColor: 'color-mix(in srgb, #ef4444 35%, var(--border-card))' }}
          >
            <h3
              className="font-bold text-lg mb-1 flex items-center gap-2"
              style={{ color: ERROR }}
            >
              ⚠️ Danger Zone
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              These actions are irreversible. Please proceed with caution.
            </p>
            <div className="space-y-6">
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  Deactivate Account
                </p>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  Temporarily disable your account. You can reactivate anytime.
                </p>
                <button
                  type="button"
                  onClick={() => setDeactivateModal(true)}
                  className="px-4 py-2 rounded-xl border-2 font-semibold text-sm"
                  style={{ borderColor: PRIMARY, color: PRIMARY }}
                >
                  Deactivate Account
                </button>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  Delete Account
                </p>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  Permanently delete your account and all data. This cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteModal(true)}
                  className="px-4 py-2 rounded-xl font-semibold text-sm text-white"
                  style={{ background: ERROR }}
                >
                  Delete Account
                </button>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  📥 Download a copy of all your data
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDataExportRequested(true);
                    showToast("We'll email you a download link within 24 hours.");
                  }}
                  className="px-4 py-2 rounded-xl border-2 font-semibold text-sm"
                  style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
                >
                  Request Data Export
                </button>
                {dataExportRequested && (
                  <p className="text-xs mt-2" style={{ color: SUCCESS }}>
                    Your data is being prepared. We'll email you a download link within 24 hours.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
        </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <AnimatePresence>
        {hasUnsaved && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="rx-settings-save-bar fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-10 py-4"
            style={{
              background: 'var(--card-bg)',
              boxShadow: '0 -8px 32px color-mix(in srgb, var(--text-primary) 12%, transparent)',
              borderTop: '1px solid var(--border-card)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="settings-unsaved-dot" />
              <p
                className="font-medium text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                You have unsaved changes
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setProfileDirty(false);
                  setNotifDirty(false);
                  setPrefsDirty(false);
                  setProfileEdit(false);
                }}
                className="px-4 py-2 rounded-xl font-semibold text-sm"
                style={{
                  background: 'transparent',
                  boxShadow: '0 0 0 1.5px var(--divider)',
                  color: 'var(--text-secondary)',
                }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (section === 'profile') await saveProfile();
                  else if (section === 'notifications') {
                    try {
                      const orderUpdatesOn =
                        notifPrefs.orderPlaced &&
                        notifPrefs.orderShipped &&
                        notifPrefs.orderDelivered &&
                        notifPrefs.returnUpdates;
                      await profileAPI.updateNotificationSettings({
                        email: {
                          orderUpdates: orderUpdatesOn && notifPrefs.email,
                          promotions: notifPrefs.flashSale || notifPrefs.recommendations,
                          securityAlerts: notifPrefs.newDevice || notifPrefs.passwordChanged,
                          newsletter: notifPrefs.weeklyDigest,
                        },
                        push: {
                          orderUpdates: orderUpdatesOn && notifPrefs.push,
                          messages: notifPrefs.newMessage && notifPrefs.push,
                          promotions: notifPrefs.flashSale && notifPrefs.push,
                          securityAlerts: notifPrefs.newDevice && notifPrefs.push,
                        },
                        sms: {
                          orderUpdates: orderUpdatesOn && notifPrefs.sms,
                          securityAlerts: notifPrefs.twoFactorAlerts && notifPrefs.sms,
                          promotions: false,
                        },
                      });
                      await updateRecommendationEmailPreference({
                        enabled: recEmailPrefs.enabled,
                        frequency: recEmailPrefs.frequency,
                        mode: recEmailPrefs.mode,
                        unsubscribed: recEmailPrefs.unsubscribed,
                      });
                    } catch {
                      showToast('Failed to save notification settings', 'error');
                      return;
                    }
                    setNotifDirty(false);
                    showToast('Notification preferences saved ✓', 'success');
                  } else if (section === 'preferences') {
                    setPrefsDirty(false);
                    showToast('Display preferences saved ✓', 'success');
                  }
                }}
                className="px-5 py-2 rounded-[12px] font-semibold text-sm text-white flex items-center gap-2"
                style={{
                  background:
                    'var(--gradient-brand-cta)',
                  boxShadow:
                    'var(--shadow-cta-hover), var(--shadow-cta)',
                }}
              >
                Save Preferences →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivate modal */}
      <AnimatePresence>
        {deactivateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setDeactivateModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="rounded-2xl rx-settings-card p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Deactivate account?</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Type DEACTIVATE to confirm.</p>
              <input type="text" value={deactivateConfirm} onChange={(e) => setDeactivateConfirm(e.target.value)} placeholder="DEACTIVATE" className="w-full h-12 px-4 rounded-xl border mb-4 premium-input-exempt" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeactivateModal(false)} className="flex-1 py-2.5 rounded-xl border-2 font-semibold" style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="button" onClick={() => { if (deactivateConfirm === 'DEACTIVATE') { setDeactivateModal(false); setDeactivateConfirm(''); showToast('Account deactivated'); } }} disabled={deactivateConfirm !== 'DEACTIVATE'} className="flex-1 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: PRIMARY }}>Confirm Deactivation</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete modal (simplified multi-step) */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => { setDeleteModal(false); setDeleteStep(0); setDeletePassword(''); setDeleteConfirm(''); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="rounded-2xl rx-settings-card p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-2" style={{ color: ERROR }}>Delete account permanently</h3>
              {deleteStep === 0 && (
                <>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>This will delete your profile, orders history, and all data. This cannot be undone.</p>
                  <button type="button" onClick={() => setDeleteStep(1)} className="w-full py-2.5 rounded-xl font-semibold text-white" style={{ background: ERROR }}>Continue</button>
                </>
              )}
              {deleteStep === 1 && (
                <>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Enter your password</p>
                  <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border mb-4 premium-input-exempt" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="Password" />
                  <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Type DELETE MY ACCOUNT to confirm</p>
                  <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="w-full h-12 px-4 rounded-xl border mb-4 premium-input-exempt" style={{ borderColor: 'var(--border-card)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="DELETE MY ACCOUNT" />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setDeleteStep(0)} className="flex-1 py-2.5 rounded-xl border-2 font-semibold" style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}>Back</button>
                    <button type="button" onClick={() => { if (deleteConfirm === 'DELETE MY ACCOUNT') { setDeleteModal(false); showToast('Account deletion requested'); } }} disabled={deleteConfirm !== 'DELETE MY ACCOUNT'} className="flex-1 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50" style={{ background: ERROR }}>Delete Everything</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
