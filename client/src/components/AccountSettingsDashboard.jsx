import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Palette, AlertTriangle, Edit3, Camera, Mail, Phone, MapPin, Calendar,
  Eye, EyeOff, Shield, Smartphone, Monitor, Loader2, Check, X, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

const PRIMARY = '#f97316';
const SUCCESS = '#10b981';
const ERROR = '#ef4444';
const WARNING = '#f59e0b';
const EASE = [0.25, 0.46, 0.45, 0.94];
const CARD_STYLE = { boxShadow: '0 4px 20px rgba(0,0,0,0.06)', borderRadius: 16 };

const SETTINGS_TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'preferences', label: 'Preferences', icon: '🎨' },
  { id: 'danger', label: 'Danger Zone', icon: '🗑️' },
];

const COUNTRIES = [
  { code: 'RW', flag: '🇷🇼', name: 'Rwanda' },
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
];

export default function AccountSettingsDashboard() {
  const [sp, setSp] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);

  const section = sp.get('section') || 'profile';
  useEffect(() => {
    if (sp.get('tab') === 'settings' && !sp.get('section')) setSp((prev) => { const n = new URLSearchParams(prev); n.set('section', 'profile'); return n; });
  }, []);
  const setSection = useCallback((s) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      n.set('tab', 'settings');
      n.set('section', s);
      return n;
    });
  }, [setSp]);

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
    orderPlaced: true, orderShipped: true, outForDelivery: true, orderDelivered: true, returnUpdates: true,
    flashSale: true, wishlistNew: false, weeklyDigest: true, recommendations: false,
    newDevice: true, passwordChanged: true, profileUpdated: true,
    newMessage: true, readReceipt: false,
    inApp: true, email: true, sms: false, push: false,
  });
  const [notifDirty, setNotifDirty] = useState(false);

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

  const unsavedBySection = { profile: profileDirty, security: false, notifications: notifDirty, preferences: prefsDirty, danger: false };
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

  const initials = ((profileForm.firstName || '') + (profileForm.lastName || '')).trim() || (user?.full_name || 'U').slice(0, 2);
  const tabIndex = SETTINGS_TABS.findIndex((t) => t.id === section);

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.2, ease: EASE }}
        className="relative flex overflow-x-auto gap-1 pb-2 scrollbar-hide border-b border-gray-200"
        style={{ scrollbarWidth: 'none' }}
      >
        {SETTINGS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (unsavedBySection[section] && section !== t.id) {
                if (window.confirm('Save changes before leaving?')) {
                  if (section === 'profile') saveProfile();
                  setSection(t.id);
                }
              } else setSection(t.id);
            }}
            className="relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
            style={{ color: section === t.id ? PRIMARY : '#64748b' }}
          >
            <span>{t.icon}</span>
            {t.label}
            {unsavedBySection[t.id] && <span className="w-2 h-2 rounded-full bg-orange-500 ml-0.5" />}
          </button>
        ))}
        <motion.div
          className="absolute bottom-0 h-0.5 rounded-full"
          style={{ background: PRIMARY, width: `${100 / SETTINGS_TABS.length}%` }}
          initial={false}
          animate={{ left: `${tabIndex * (100 / SETTINGS_TABS.length)}%` }}
          transition={{ duration: 0.25, ease: EASE }}
        />
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {section === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="space-y-6"
          >
            {/* Avatar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div
                  className="relative rounded-full w-24 h-24 flex items-center justify-center text-2xl font-bold text-white cursor-pointer overflow-hidden"
                  style={{ background: PRIMARY }}
                  onMouseEnter={() => setAvatarOverlay(true)}
                  onMouseLeave={() => { setAvatarOverlay(false); setAvatarMenuOpen(false); }}
                  onClick={() => setAvatarMenuOpen((v) => !v)}
                >
                  {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : initials.toUpperCase().slice(0, 2)}
                  <AnimatePresence>
                    {avatarOverlay && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 transition-opacity duration-200"
                      >
                        <Camera className="w-8 h-8 text-white mb-1" />
                        <span className="text-xs text-white font-medium">Change Photo</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {avatarMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-3 py-2 rounded-xl bg-white border border-gray-200 shadow-lg z-10 min-w-[180px]"
                  >
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">📷 Upload Photo</button>
                    <button type="button" onClick={() => setAvatarMenuOpen(false)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">🔗 Use URL</button>
                    <button type="button" onClick={() => setAvatarMenuOpen(false)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600">🗑️ Remove Photo</button>
                  </motion.div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />

              {/* Profile completion bar */}
              <div className="w-full max-w-md mt-6">
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: '#64748b' }}>Profile Completion</span>
                  <span style={{ color: PRIMARY, fontWeight: 600 }}>{profileCompletion}%</span>
                </div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                  className="h-2 rounded-full bg-gray-200 overflow-hidden"
                >
                  <div className="h-full rounded-full" style={{ background: PRIMARY }} />
                </motion.div>
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                  {profileCompletion >= 80 ? 'Looking good!' : profileCompletion >= 65 ? 'Add phone to reach 80%' : 'Add more details to complete your profile'}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {!profileForm.phone && <button type="button" onClick={() => { setProfileEdit(true); handleProfileChange('phone', ''); }} className="px-2 py-1 rounded-lg text-xs font-medium border border-orange-200" style={{ color: PRIMARY }}>+ Add Phone</button>}
                  {!profileForm.bio && <button type="button" onClick={() => setProfileEdit(true)} className="px-2 py-1 rounded-lg text-xs font-medium border border-orange-200" style={{ color: PRIMARY }}>+ Add Bio</button>}
                  {!profileForm.city && <button type="button" onClick={() => setProfileEdit(true)} className="px-2 py-1 rounded-lg text-xs font-medium border border-orange-200" style={{ color: PRIMARY }}>+ Add Location</button>}
                </div>
              </div>
            </motion.div>

            {/* Personal Information card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="rounded-2xl bg-white p-7"
              style={CARD_STYLE}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg" style={{ color: '#0f172a' }}>Personal Information</h3>
                <button type="button" onClick={() => setProfileEdit((e) => !e)} className="p-2 rounded-lg hover:bg-gray-100" title="Edit">
                  <Edit3 className="w-4 h-4" style={{ color: PRIMARY }} />
                </button>
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
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8', letterSpacing: 1 }}>{f.label}</label>
                    {profileEdit ? (
                      f.type === 'select' ? (
                        <select
                          value={profileForm[f.key] || ''}
                          onChange={(e) => handleProfileChange(f.key, e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border-2 outline-none transition-all"
                          style={{ borderColor: '#e5e7eb' }}
                        >
                          <option value="">Select</option>
                          {(f.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : f.type === 'country' ? (
                        <select
                          value={profileForm.country || 'RW'}
                          onChange={(e) => handleProfileChange('country', e.target.value)}
                          className="w-full h-12 px-4 rounded-xl border-2 outline-none transition-all"
                          style={{ borderColor: '#e5e7eb' }}
                        >
                          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                        </select>
                      ) : (
                        <div className="relative">
                          <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
                          <input
                            type={f.type}
                            value={profileForm[f.key] || ''}
                            onChange={(e) => handleProfileChange(f.key, e.target.value)}
                            className="w-full h-12 pl-10 pr-10 rounded-xl border-2 outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                            style={{ borderColor: '#e5e7eb' }}
                          />
                          {profileForm[f.key] && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                        </div>
                      )
                    ) : (
                      <p className="h-12 flex items-center px-0" style={{ color: '#0f172a' }}>{profileForm[f.key] || '—'}</p>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="mt-5">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Bio / About</label>
                {profileEdit ? (
                  <div className="relative">
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => handleProfileChange('bio', e.target.value.slice(0, 200))}
                      rows={4}
                      placeholder="Tell buyers and sellers about yourself..."
                      className="w-full px-4 py-3 rounded-xl border-2 outline-none resize-none"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                    <span className={`absolute bottom-2 right-3 text-xs ${profileForm.bio.length >= 200 ? 'text-red-500' : profileForm.bio.length >= 180 ? 'text-orange-500' : 'text-gray-400'}`}>
                      {profileForm.bio.length} / 200
                    </span>
                  </div>
                ) : (
                  <p style={{ color: '#0f172a' }}>{profileForm.bio || '—'}</p>
                )}
              </div>
              {profileEdit && (
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setProfileEdit(false); setProfileDirty(false); }} className="px-4 py-2.5 rounded-xl border-2 font-semibold text-sm" style={{ borderColor: '#e5e7eb', color: '#64748b' }}>Cancel</button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white flex items-center gap-2"
                    style={{ background: profileSaved ? SUCCESS : PRIMARY }}
                  >
                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : profileSaved ? <>Saved <Check className="w-4 h-4" /></> : <>Save Changes <ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {section === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
            <div className="rounded-2xl bg-white p-7" style={CARD_STYLE}>
              <h3 className="font-bold text-lg mb-5 flex items-center gap-2" style={{ color: '#0f172a' }}>🔒 Change Password</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Current Password</label>
                  <div className="relative">
                    <input type={showCurrentPass ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full h-12 pl-4 pr-12 rounded-xl border-2" style={{ borderColor: '#e5e7eb' }} />
                    <button type="button" onClick={() => setShowCurrentPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">{showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>New Password</label>
                  <div className="relative">
                    <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-12 pl-4 pr-12 rounded-xl border-2" style={{ borderColor: '#e5e7eb' }} />
                    <button type="button" onClick={() => setShowNewPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2">{showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full" style={{ background: newPassword.length >= i * 3 ? (i >= 3 ? SUCCESS : i >= 2 ? WARNING : PRIMARY) : '#e5e7eb' }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirmPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-12 pl-4 pr-12 rounded-xl border-2" style={{ borderColor: '#e5e7eb' }} />
                    {confirmPassword && <span className="absolute right-3 top-1/2 -translate-y-1/2">{newPassword === confirmPassword ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}</span>}
                  </div>
                </div>
                <button type="button" onClick={updatePassword} disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8 || passwordSaving} className="px-5 py-2.5 rounded-xl font-semibold text-white flex items-center gap-2 disabled:opacity-50" style={{ background: PRIMARY }}>
                  {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Update Password →
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-7" style={CARD_STYLE}>
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2" style={{ color: '#0f172a' }}>🛡️ Two-Factor Authentication</h3>
              <p className="text-sm mb-4" style={{ color: '#64748b' }}>Add extra security to your account</p>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${twoFaEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{twoFaEnabled ? 'Enabled' : 'Disabled'}</span>
                <button type="button" onClick={() => setTwoFaEnabled((v) => !v)} className={`relative w-12 h-6 rounded-full transition-colors ${twoFaEnabled ? '' : 'bg-gray-200'}`} style={{ background: twoFaEnabled ? PRIMARY : undefined }}>
                  <motion.div animate={{ x: twoFaEnabled ? 24 : 4 }} className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-7" style={CARD_STYLE}>
              <h3 className="font-bold text-lg mb-4" style={{ color: '#0f172a' }}>📱 Active Sessions</h3>
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{s.current ? '💻' : '📱'}</span>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#0f172a' }}>{s.device}</p>
                      <p className="text-xs" style={{ color: '#64748b' }}>{s.location} · <span style={{ color: s.current ? SUCCESS : '#94a3b8' }}>{s.time}</span></p>
                    </div>
                  </div>
                  {s.current ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100" style={{ color: SUCCESS }}>This device</span> : <button type="button" className="text-xs font-semibold" style={{ color: ERROR }}>Sign Out</button>}
                </div>
              ))}
              <button type="button" className="mt-4 px-4 py-2 rounded-xl border-2 font-semibold text-sm" style={{ borderColor: ERROR, color: ERROR }}>Sign Out All Other Devices</button>
            </div>
            <div className="rounded-2xl bg-white p-7" style={CARD_STYLE}>
              <h3 className="font-bold text-lg mb-4" style={{ color: '#0f172a' }}>Login History</h3>
              <div className="space-y-2">
                {loginHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                    <span style={{ color: '#64748b' }}>{h.date}</span>
                    <span style={{ color: '#64748b' }}>{h.device} · {h.location}</span>
                    <span className={`font-medium ${h.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{h.status === 'success' ? 'Success' : 'Failed'}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="mt-3 text-sm font-semibold" style={{ color: PRIMARY }}>View Full History</button>
            </div>
          </motion.div>
        )}

        {section === 'notifications' && (
          <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="rounded-2xl bg-white p-7" style={CARD_STYLE}>
            <h3 className="font-bold text-lg mb-6" style={{ color: '#0f172a' }}>🔔 Notification Preferences</h3>
            {[
              { title: 'Order Updates', keys: ['orderPlaced', 'orderShipped', 'outForDelivery', 'orderDelivered', 'returnUpdates'], labels: ['Order placed confirmation', 'Order shipped', 'Out for delivery', 'Order delivered', 'Return/refund updates'] },
              { title: 'Deals & Promotions', keys: ['flashSale', 'wishlistNew', 'weeklyDigest', 'recommendations'], labels: ['Flash sale alerts', 'New arrivals in wishlist categories', 'Weekly deals digest', 'Personalized recommendations'] },
              { title: 'Account & Security', keys: ['newDevice', 'passwordChanged', 'profileUpdated'], labels: ['Login from new device', 'Password changed', 'Profile updated'] },
              { title: 'Messages', keys: ['newMessage', 'readReceipt'], labels: ['New message from seller', 'Message read receipt'] },
            ].map((group) => (
              <div key={group.title} className="mb-8">
                <h4 className="font-semibold text-sm mb-4" style={{ color: '#475569' }}>{group.title}</h4>
                <div className="space-y-3">
                  {group.keys.map((key, i) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: '#0f172a' }}>{group.labels[i]}</span>
                      <button type="button" onClick={() => { setNotifPrefs((p) => ({ ...p, [key]: !p[key] })); setNotifDirty(true); }} className={`w-12 h-6 rounded-full transition-colors ${notifPrefs[key] ? '' : 'bg-gray-200'}`} style={{ background: notifPrefs[key] ? PRIMARY : undefined }}>
                        <motion.div animate={{ x: notifPrefs[key] ? 24 : 4 }} className="w-5 h-5 rounded-full bg-white shadow" style={{ marginTop: 2 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <h4 className="font-semibold text-sm mb-4" style={{ color: '#475569' }}>Receive notifications via</h4>
            <div className="space-y-3">
              {[
                { key: 'inApp', label: '🔔 In-app', desc: 'Always on' },
                { key: 'email', label: '📧 Email', desc: user?.email },
                { key: 'sms', label: '📱 SMS', desc: 'Add phone' },
                { key: 'push', label: '🖥️ Push (browser)', desc: 'Enable in browser' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div><span className="text-sm font-medium" style={{ color: '#0f172a' }}>{label}</span>{desc && <p className="text-xs" style={{ color: '#94a3b8' }}>{desc}</p>}</div>
                  {key !== 'inApp' && (
                    <button type="button" onClick={() => { setNotifPrefs((p) => ({ ...p, [key]: !p[key] })); setNotifDirty(true); }} className={`w-12 h-6 rounded-full ${notifPrefs[key] ? '' : 'bg-gray-200'}`} style={{ background: notifPrefs[key] ? PRIMARY : undefined }}>
                      <motion.div animate={{ x: notifPrefs[key] ? 24 : 4 }} className="w-5 h-5 rounded-full bg-white shadow" style={{ marginTop: 2 }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => { setNotifDirty(false); showToast('Preferences saved'); }} className="mt-6 px-5 py-2.5 rounded-xl font-semibold text-white" style={{ background: PRIMARY }}>Save Preferences →</button>
          </motion.div>
        )}

        {section === 'preferences' && (
          <motion.div key="preferences" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="rounded-2xl bg-white p-7" style={CARD_STYLE}>
            <h3 className="font-bold text-lg mb-6" style={{ color: '#0f172a' }}>Display Preferences</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Language</label>
                <select value={prefs.language} onChange={(e) => { setPrefs((p) => ({ ...p, language: e.target.value })); setPrefsDirty(true); }} className="h-12 px-4 rounded-xl border-2 w-full max-w-xs" style={{ borderColor: '#e5e7eb' }}>
                  <option value="en">🇬🇧 English</option>
                  <option value="rw">🇷🇼 Kinyarwanda</option>
                  <option value="fr">🇫🇷 French</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Currency</label>
                <select value={prefs.currency} onChange={(e) => { setPrefs((p) => ({ ...p, currency: e.target.value })); setPrefsDirty(true); }} className="h-12 px-4 rounded-xl border-2 w-full max-w-xs" style={{ borderColor: '#e5e7eb' }}>
                  <option value="USD">$ USD</option>
                  <option value="RWF">RWF</option>
                  <option value="EUR">€ EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>Theme</label>
                <div className="flex gap-2">
                  {['light', 'dark', 'system'].map((t) => (
                    <button key={t} type="button" onClick={() => { setPrefs((p) => ({ ...p, theme: t })); setPrefsDirty(true); }} className={`px-4 py-2 rounded-xl text-sm font-medium ${prefs.theme === t ? 'text-white' : ''}`} style={{ background: prefs.theme === t ? PRIMARY : '#f1f5f9', color: prefs.theme === t ? 'white' : '#64748b' }}>{t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '💻 System'}</button>
                  ))}
                </div>
              </div>
            </div>
            <h3 className="font-bold text-lg mt-8 mb-4" style={{ color: '#0f172a' }}>Privacy</h3>
            {[
              { key: 'showProfile', label: 'Show my profile to sellers' },
              { key: 'personalizedRec', label: 'Allow personalized recommendations' },
              { key: 'shareHistory', label: 'Share purchase history for better deals' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#0f172a' }}>{label}</span>
                <button type="button" onClick={() => { setPrefs((p) => ({ ...p, [key]: !p[key] })); setPrefsDirty(true); }} className={`relative w-12 h-6 rounded-full ${prefs[key] ? '' : 'bg-gray-200'}`} style={{ background: prefs[key] ? PRIMARY : undefined }}>
                  <motion.div animate={{ x: prefs[key] ? 24 : 4 }} className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {section === 'danger' && (
          <motion.div key="danger" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="rounded-2xl p-7 border-2" style={{ ...CARD_STYLE, borderColor: '#fee2e2', background: 'white' }}>
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2" style={{ color: ERROR }}>⚠️ Danger Zone</h3>
            <p className="text-sm mb-6" style={{ color: '#64748b' }}>These actions are irreversible. Please proceed with caution.</p>
            <div className="space-y-6">
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#0f172a' }}>Deactivate Account</p>
                <p className="text-xs mb-2" style={{ color: '#64748b' }}>Temporarily disable your account. You can reactivate anytime.</p>
                <button type="button" onClick={() => setDeactivateModal(true)} className="px-4 py-2 rounded-xl border-2 font-semibold text-sm" style={{ borderColor: PRIMARY, color: PRIMARY }}>Deactivate Account</button>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#0f172a' }}>Delete Account</p>
                <p className="text-xs mb-2" style={{ color: '#64748b' }}>Permanently delete your account and all data. This cannot be undone.</p>
                <button type="button" onClick={() => setDeleteModal(true)} className="px-4 py-2 rounded-xl font-semibold text-sm text-white" style={{ background: ERROR }}>Delete Account</button>
              </div>
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: '#0f172a' }}>📥 Download a copy of all your data</p>
                <button type="button" onClick={() => { setDataExportRequested(true); showToast('We\'ll email you a download link within 24 hours.'); }} className="px-4 py-2 rounded-xl border-2 font-semibold text-sm" style={{ borderColor: '#e5e7eb', color: '#475569' }}>Request Data Export</button>
                {dataExportRequested && <p className="text-xs mt-2" style={{ color: SUCCESS }}>Your data is being prepared. We'll email you a download link within 24 hours.</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky save bar */}
      <AnimatePresence>
        {hasUnsaved && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-t shadow-lg"
          >
            <p className="font-medium text-sm" style={{ color: '#0f172a' }}>You have unsaved changes</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setProfileDirty(false); setNotifDirty(false); setPrefsDirty(false); setProfileEdit(false); }} className="px-4 py-2 rounded-xl border-2 font-semibold text-sm" style={{ borderColor: '#e5e7eb', color: '#64748b' }}>Discard</button>
              <button type="button" onClick={() => { if (section === 'profile') saveProfile(); else if (section === 'notifications') { setNotifDirty(false); showToast('Preferences saved'); } else if (section === 'preferences') { setPrefsDirty(false); showToast('Preferences saved'); } }} className="px-5 py-2 rounded-xl font-semibold text-sm text-white" style={{ background: PRIMARY }}>Save Changes →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deactivate modal */}
      <AnimatePresence>
        {deactivateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={() => setDeactivateModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="rounded-2xl bg-white p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-2" style={{ color: '#0f172a' }}>Deactivate account?</h3>
              <p className="text-sm mb-4" style={{ color: '#64748b' }}>Type DEACTIVATE to confirm.</p>
              <input type="text" value={deactivateConfirm} onChange={(e) => setDeactivateConfirm(e.target.value)} placeholder="DEACTIVATE" className="w-full h-12 px-4 rounded-xl border-2 mb-4" style={{ borderColor: '#e5e7eb' }} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeactivateModal(false)} className="flex-1 py-2.5 rounded-xl border-2 font-semibold" style={{ borderColor: '#e5e7eb' }}>Cancel</button>
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
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="rounded-2xl bg-white p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-lg mb-2" style={{ color: ERROR }}>Delete account permanently</h3>
              {deleteStep === 0 && (
                <>
                  <p className="text-sm mb-4" style={{ color: '#64748b' }}>This will delete your profile, orders history, and all data. This cannot be undone.</p>
                  <button type="button" onClick={() => setDeleteStep(1)} className="w-full py-2.5 rounded-xl font-semibold text-white" style={{ background: ERROR }}>Continue</button>
                </>
              )}
              {deleteStep === 1 && (
                <>
                  <p className="text-sm mb-2" style={{ color: '#64748b' }}>Enter your password</p>
                  <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 mb-4" style={{ borderColor: '#e5e7eb' }} placeholder="Password" />
                  <p className="text-sm mb-2" style={{ color: '#64748b' }}>Type DELETE MY ACCOUNT to confirm</p>
                  <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 mb-4" style={{ borderColor: '#e5e7eb' }} placeholder="DELETE MY ACCOUNT" />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setDeleteStep(0)} className="flex-1 py-2.5 rounded-xl border-2 font-semibold" style={{ borderColor: '#e5e7eb' }}>Back</button>
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
