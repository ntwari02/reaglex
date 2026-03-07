import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/contexts/ThemeContext';
import { profileAPI, adminAPI, adminOrdersAPI, adminFinanceAPI, adminSupportAPI, adminReviewsAPI } from '@/lib/api';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle2,
  Edit,
  Save,
  X,
  Camera,
  CreditCard,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Settings,
  LogOut,
  Smartphone,
  Globe,
  Key,
  AlertCircle,
  DollarSign,
  Building2,
  Users,
  FileText,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';

interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'mobile';
  label: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

// Backend address shape (profile API)
interface BackendAddress {
  label: string;
  street: string;
  city: string;
  state?: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

// Backend payment method shape
interface BackendPaymentMethod {
  type: 'card' | 'bank' | 'mobile_money' | 'crypto';
  provider?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

const DEFAULT_NOTIFICATIONS = {
  email: { orderUpdates: true, promotions: true, securityAlerts: true, newsletter: false },
  push: { orderUpdates: true, promotions: false, messages: true, securityAlerts: true },
  sms: { orderUpdates: false, securityAlerts: true, promotions: false },
};

export function AdminProfile() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const { theme, toggleTheme, currency, language, setCurrency, setLanguage } = useTheme();

  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'addresses' | 'payments' | 'notifications' | 'preferences'>('overview');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeDisputes: 0,
    pendingReviews: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<Array<{ date: string; ip: string; location?: string; device?: string }>>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);

  const languages = [
    { code: 'en', name: 'English US', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
    { code: 'sw', name: 'Swahili', flag: '🇹🇿' },
  ];

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
    { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
    { code: 'RWF', symbol: 'Fr', name: 'Rwandan Franc', rate: 1200 },
    { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', rate: 130 },
  ];
  
  // Profile form state (initial from auth, then from API)
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: '',
    location: '',
    website: '',
    dateOfBirth: '',
  });

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Addresses state (UI shape; backend uses street/zipCode)
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Notification preferences (backend shape: orderUpdates, promotions, securityAlerts, newsletter / messages)
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  // Preferences (theme, language, currency from API; rest local)
  const [preferences, setPreferences] = useState({
    dashboardLayout: 'default',
    itemsPerPage: 25,
    autoRefresh: true,
    showAdvancedOptions: false,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  // Fetch full profile from API and map to state
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const { user: profileUser } = await profileAPI.getProfile();
      const u = profileUser as any;
      const fullName = u?.fullName ?? user.full_name ?? '';
      const email = u?.email ?? user.email ?? '';
      setFormData({
        full_name: fullName,
        email,
        phone: u?.phone ?? user.phone ?? '',
        bio: u?.bio ?? '',
        location: u?.location ?? '',
        website: u?.website ?? '',
        dateOfBirth: u?.dateOfBirth ? (typeof u.dateOfBirth === 'string' ? u.dateOfBirth : (u.dateOfBirth as Date).toISOString().slice(0, 10)) : '',
      });
      setAvatarPreview(u?.avatarUrl ?? user.avatar_url ?? null);
      setTwoFactorEnabled(!!u?.security?.twoFactorEnabled);

      const addrs: BackendAddress[] = u?.addresses ?? [];
      setAddresses(addrs.map((a: BackendAddress, idx: number) => ({
        id: idx.toString(),
        label: a.label,
        fullName: fullName,
        phone: u?.phone ?? '',
        address: a.street,
        city: a.city,
        country: a.country,
        postalCode: a.zipCode,
        isDefault: !!a.isDefault,
      })));

      const pms: BackendPaymentMethod[] = u?.paymentMethods ?? [];
      setPaymentMethods(pms.map((pm: BackendPaymentMethod, idx: number) => ({
        id: idx.toString(),
        type: pm.type === 'mobile_money' ? 'mobile' : (pm.type as 'card'),
        label: (pm.provider || pm.type) + (pm.last4 ? ` •••• ${pm.last4}` : ''),
        last4: pm.last4,
        expiryMonth: pm.expiryMonth,
        expiryYear: pm.expiryYear,
        isDefault: !!pm.isDefault,
      })));

      const notif = u?.notifications;
      if (notif?.email || notif?.push || notif?.sms) {
        setNotifications({
          email: { ...DEFAULT_NOTIFICATIONS.email, ...notif.email },
          push: { ...DEFAULT_NOTIFICATIONS.push, ...notif.push },
          sms: { ...DEFAULT_NOTIFICATIONS.sms, ...notif.sms },
        });
      }

      const prefs = u?.preferences;
      if (prefs) {
        setCurrency(prefs.currency || 'RWF');
        setLanguage(prefs.language || 'en');
      }
      try {
        const his = await profileAPI.getLoginHistory();
        setLoginHistory(his.loginHistory || []);
      } catch {
        setLoginHistory([]);
      }
    } catch (e: any) {
      setProfileError(e?.message || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // Fetch admin stats (only for admin role)
  const fetchStats = useCallback(async () => {
    if (user?.role !== 'admin') {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const [userStats, sellerStats, ordersDash, financeDash, supportDash, reviewsDash] = await Promise.allSettled([
        adminAPI.getUserStats(),
        adminAPI.getSellerStats(),
        adminOrdersAPI.getDashboard(),
        adminFinanceAPI.getDashboard(),
        adminSupportAPI.getDashboard(),
        adminReviewsAPI.getDashboard(),
      ]);

      const totalUsers = userStats.status === 'fulfilled' ? (userStats.value as any).totalCustomers ?? 0 : 0;
      const totalSellers = sellerStats.status === 'fulfilled' ? (sellerStats.value as any).totalSellers ?? 0 : 0;
      const ordersData = ordersDash.status === 'fulfilled' ? (ordersDash.value as any) : null;
      const totalOrders = ordersData?.totalOrdersToday ?? ordersData?.pendingOrders ?? 0;
      const financeData = financeDash.status === 'fulfilled' ? (financeDash.value as any) : null;
      const totalRevenue = financeData?.metrics?.totalRevenue ?? financeData?.metrics?.revenue ?? ordersData?.revenueToday ?? 0;
      const supportData = supportDash.status === 'fulfilled' ? (supportDash.value as any) : null;
      const activeDisputes = supportData?.metrics?.activeDisputes ?? supportData?.metrics?.openTickets ?? 0;
      const reviewsData = reviewsDash.status === 'fulfilled' ? (reviewsDash.value as any) : null;
      const pendingReviews = reviewsData?.stats?.pendingModeration ?? reviewsData?.stats?.pending ?? 0;

      setStats({
        totalUsers: Number(totalUsers),
        totalSellers: Number(totalSellers),
        totalOrders: Number(totalOrders),
        totalRevenue: Number(totalRevenue),
        activeDisputes: Number(activeDisputes),
        pendingReviews: Number(pendingReviews),
      });
    } finally {
      setStatsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchStats();
  }, [user, navigate, fetchProfile, fetchStats]);

  // Refetch login history when Security tab is opened
  useEffect(() => {
    if (activeTab !== 'security' || !user) return;
    setLoginHistoryLoading(true);
    profileAPI.getLoginHistory()
      .then((res) => setLoginHistory(res.loginHistory || []))
      .catch(() => setLoginHistory([]))
      .finally(() => setLoginHistoryLoading(false));
  }, [activeTab, user]);

  if (!user) {
    return null;
  }

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setProfileError(null);
    try {
      const { user: updated } = await profileAPI.updateProfile({
        fullName: formData.full_name,
        phone: formData.phone || undefined,
        bio: formData.bio || undefined,
        location: formData.location || undefined,
        website: formData.website || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
      });
      const u = updated as any;
      if (u && setUser) {
        setUser({
          ...user,
          full_name: u.fullName ?? user.full_name,
          phone: u.phone ?? user.phone,
          avatar_url: u.avatarUrl ?? user.avatar_url,
        });
      }
      setShowEditModal(false);
    } catch (e: any) {
      setProfileError(e?.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    try {
      const res = await profileAPI.uploadAvatar(file);
      const url = (res as any).avatarUrl;
      if (url) {
        setAvatarPreview(url);
        if (setUser) setUser({ ...user, avatar_url: url });
      }
    } catch (_) {
      setAvatarPreview(user?.avatar_url || null);
    }
  };

  const handleAddAddress = async () => {
    const newAddr: BackendAddress = {
      label: 'New Address',
      street: '',
      city: '',
      zipCode: '',
      country: 'Rwanda',
      isDefault: addresses.length === 0,
    };
    try {
      const res = await profileAPI.addAddress(newAddr);
      const addrs = (res as any).addresses ?? [];
      const fullName = formData.full_name;
      const phone = formData.phone || '';
      setAddresses(addrs.map((a: BackendAddress, idx: number) => ({
        id: idx.toString(),
        label: a.label,
        fullName,
        phone,
        address: a.street,
        city: a.city,
        country: a.country,
        postalCode: a.zipCode,
        isDefault: !!a.isDefault,
      })));
    } catch (_) {}
  };

  const handleDeleteAddress = async (id: string) => {
    const index = addresses.findIndex((a) => a.id === id);
    if (index < 0) return;
    try {
      const res = await profileAPI.deleteAddress(index);
      const addrs = (res as any).addresses ?? [];
      const fullName = formData.full_name;
      const phone = formData.phone || '';
      setAddresses(addrs.map((a: BackendAddress, idx: number) => ({
        id: idx.toString(),
        label: a.label,
        fullName,
        phone,
        address: a.street,
        city: a.city,
        country: a.country,
        postalCode: a.zipCode,
        isDefault: !!a.isDefault,
      })));
    } catch (_) {}
  };

  const handleSetDefaultAddress = async (id: string) => {
    const index = addresses.findIndex((a) => a.id === id);
    if (index < 0) return;
    const addr = addresses[index];
    try {
      const res = await profileAPI.updateAddress(index, {
        label: addr.label,
        street: addr.address,
        city: addr.city,
        zipCode: addr.postalCode,
        country: addr.country,
        isDefault: true,
      });
      const addrs = (res as any).addresses ?? [];
      const fullName = formData.full_name;
      const phone = formData.phone || '';
      setAddresses(addrs.map((a: BackendAddress, idx: number) => ({
        id: idx.toString(),
        label: a.label,
        fullName,
        phone,
        address: a.street,
        city: a.city,
        country: a.country,
        postalCode: a.zipCode,
        isDefault: !!a.isDefault,
      })));
    } catch (_) {}
  };

  const handleAddPaymentMethod = () => {
    alert('Payment method addition would be handled by a payment provider integration.');
  };

  const handleDeletePaymentMethod = async (id: string) => {
    const index = paymentMethods.findIndex((p) => p.id === id);
    if (index < 0) return;
    try {
      const res = await profileAPI.deletePaymentMethod(index);
      const pms = (res as any).paymentMethods ?? [];
      setPaymentMethods(pms.map((pm: BackendPaymentMethod, idx: number) => ({
        id: idx.toString(),
        type: pm.type === 'mobile_money' ? 'mobile' : (pm.type as 'card'),
        label: (pm.provider || pm.type) + (pm.last4 ? ` •••• ${pm.last4}` : ''),
        last4: pm.last4,
        expiryMonth: pm.expiryMonth,
        expiryYear: pm.expiryYear,
        isDefault: !!pm.isDefault,
      })));
    } catch (_) {}
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    try {
      await profileAPI.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
    } catch (e: any) {
      setPasswordError(e?.message || 'Failed to change password');
    }
  };

  const handleSaveNotifications = async () => {
    setNotificationsSaving(true);
    try {
      await profileAPI.updateNotificationSettings(notifications);
    } catch (_) {}
    finally {
      setNotificationsSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setPreferencesSaving(true);
    try {
      await profileAPI.updatePreferences({ theme: theme as 'light' | 'dark' | 'auto', language, currency });
    } catch (_) {}
    finally {
      setPreferencesSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
            <User className="w-8 h-8 text-emerald-500" />
            Admin Profile & Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Manage your admin account settings and preferences</p>
        </div>
      </div>

      {profileError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl">
          {profileError}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-24 sm:h-32" />
        <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 -mt-12 sm:-mt-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative">
              {profileLoading ? (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 overflow-hidden shadow-lg">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={formData.full_name || 'Admin'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                      {(formData.full_name || formData.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {profileLoading ? '...' : formData.full_name || user.full_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold">
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.email}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowEditModal(true)}
                  disabled={profileLoading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: statsLoading ? '—' : stats.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total Sellers', value: statsLoading ? '—' : stats.totalSellers.toLocaleString(), icon: Building2, color: 'text-orange-600 dark:text-orange-400' },
          { label: 'Total Orders', value: statsLoading ? '—' : stats.totalOrders.toLocaleString(), icon: FileText, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Total Revenue', value: statsLoading ? '—' : `$${(stats.totalRevenue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-green-600 dark:text-green-400' },
          { label: 'Active Disputes', value: statsLoading ? '—' : stats.activeDisputes.toString(), icon: AlertCircle, color: 'text-red-600 dark:text-red-400' },
          { label: 'Pending Reviews', value: statsLoading ? '—' : stats.pendingReviews.toString(), icon: CheckCircle2, color: 'text-yellow-600 dark:text-yellow-400' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'addresses', label: 'Addresses', icon: MapPin },
          { id: 'payments', label: 'Payment Methods', icon: CreditCard },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'preferences', label: 'Preferences', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors duration-300 border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Personal Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.full_name}</p>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.email}</p>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.phone}</p>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.location}</p>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.website}</p>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-400 text-sm mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Bio
                  </label>
                  <p className="text-gray-900 dark:text-white">{formData.bio}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account Status</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Role</p>
                  <p className="text-gray-900 dark:text-white font-semibold">Super Admin</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Member Since</p>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Jan 2024'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Last Login</p>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {loginHistory.length > 0 ? new Date(loginHistory[0].date).toLocaleString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Account Status</p>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Lock className="w-6 h-6 text-emerald-500" />
              Change Password
            </h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {passwordError && (
                <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">Password updated successfully.</p>
              )}
              <Button
                onClick={handleChangePassword}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                Update Password
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-emerald-500" />
                  Two-Factor Authentication
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  twoFactorEnabled 
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <Button 
                  variant="outline"
                  className="border-gray-300 dark:border-gray-700"
                  disabled
                >
                  2FA (coming soon)
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Login History</h2>
            {loginHistoryLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : loginHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No login history yet.</p>
            ) : (
              <div className="space-y-3">
                {loginHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(entry.date).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{entry.device || 'Unknown'} • {entry.location || 'Unknown'}</p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-500">{entry.ip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Saved Addresses</h2>
            <Button
              onClick={handleAddAddress}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </div>
          <div className="grid gap-4">
            {addresses.map((address) => (
              <div key={address.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{address.label}</h3>
                      {address.isDefault && (
                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-xs font-semibold">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-white">{address.fullName}</p>
                    <p className="text-gray-600 dark:text-gray-400">{address.address}</p>
                    <p className="text-gray-600 dark:text-gray-400">{address.city}, {address.country} {address.postalCode}</p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{address.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefaultAddress(address.id)}
                        className="border-gray-300 dark:border-gray-700"
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
                      className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Methods</h2>
            <Button
              onClick={handleAddPaymentMethod}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
          <div className="grid gap-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{method.label}</p>
                      {method.expiryMonth && method.expiryYear && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </p>
                      )}
                      {method.isDefault && (
                        <span className="inline-block mt-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-xs font-semibold">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification preferences</h2>
            <Button onClick={handleSaveNotifications} disabled={notificationsSaving} className="bg-emerald-600 hover:bg-emerald-700">
              {notificationsSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-emerald-500" />
              Email Notifications
            </h2>
            <div className="space-y-3">
              {Object.entries(notifications.email).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      email: { ...notifications.email, [key]: e.target.checked }
                    })}
                    className="rounded border-gray-300 dark:border-gray-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-6 h-6 text-emerald-500" />
              Push Notifications
            </h2>
            <div className="space-y-3">
              {Object.entries(notifications.push).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      push: { ...notifications.push, [key]: e.target.checked }
                    })}
                    className="rounded border-gray-300 dark:border-gray-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Smartphone className="w-6 h-6 text-emerald-500" />
              SMS Alerts
            </h2>
            <div className="space-y-3">
              {Object.entries(notifications.sms).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      sms: { ...notifications.sms, [key]: e.target.checked }
                    })}
                    className="rounded border-gray-300 dark:border-gray-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={handleSavePreferences} disabled={preferencesSaving} className="bg-emerald-600 hover:bg-emerald-700">
              {preferencesSaving ? 'Saving…' : 'Save theme, language & currency'}
            </Button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6 text-emerald-500" />
              General Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleTheme}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'light'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {theme === 'light' ? 'Light' : 'Dark'} Mode
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Language</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowLanguageMenu(!showLanguageMenu);
                      setShowCurrencyMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <span>{languages.find(l => l.code === language)?.name || 'English US'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {showLanguageMenu && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setShowLanguageMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2"
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowCurrencyMenu(!showCurrencyMenu);
                      setShowLanguageMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <span>{currencies.find(c => c.code === currency)?.name || 'US Dollar'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {showCurrencyMenu && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                      {currencies.map((curr) => (
                        <button
                          key={curr.code}
                          onClick={() => {
                            setCurrency(curr.code);
                            setShowCurrencyMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {curr.symbol} {curr.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items Per Page</label>
                <select
                  value={preferences.itemsPerPage}
                  onChange={(e) => setPreferences({ ...preferences, itemsPerPage: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Auto Refresh</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Automatically refresh dashboard data</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.autoRefresh}
                  onChange={(e) => setPreferences({ ...preferences, autoRefresh: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Show Advanced Options</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Display advanced configuration options</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.showAdvancedOptions}
                  onChange={(e) => setPreferences({ ...preferences, showAdvancedOptions: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-700"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Admin Profile</DialogTitle>
            <DialogDescription>
              Update your admin identity details. These changes apply to your admin account only.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={user.full_name || 'Admin'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl font-bold">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Camera className="h-4 w-4" />
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Admin name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="+250 788 000 000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/70 text-gray-900 dark:text-gray-300 text-sm focus:outline-none cursor-not-allowed"
                  disabled
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Email is managed via authentication settings.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="City, Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Short summary of your role and responsibilities…"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

