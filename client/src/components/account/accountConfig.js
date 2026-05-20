import {
  Bell,
  CreditCard,
  Eye,
  Globe,
  Headphones,
  Heart,
  HelpCircle,
  Key,
  Languages,
  LogOut,
  MapPin,
  Moon,
  Package,
  Palette,
  RefreshCw,
  Shield,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Truck,
  User,
  Wallet,
  Zap,
  Clock,
  CheckCircle,
  RotateCcw,
  XCircle,
  FileText,
  MessageCircle,
  HardDrive,
  FlaskConical,
  Info,
  Lock,
  Monitor,
} from 'lucide-react';

export const ORDER_STATUS_SHORTCUTS = [
  { id: 'topay', label: 'To Pay', icon: Clock, panel: 'orders', badgeKey: 'pending' },
  { id: 'toship', label: 'To Ship', icon: Package, panel: 'orders', badgeKey: 'processing' },
  { id: 'shipped', label: 'Shipped', icon: Truck, panel: 'orders', badgeKey: 'shipped' },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle, panel: 'orders', badgeKey: 'delivered' },
  { id: 'returns', label: 'Returns', icon: RotateCcw, panel: 'returns' },
];

export const QUICK_STAT_CARDS = [
  { id: 'wallet', label: 'Wallet', icon: Wallet, panel: 'payments' },
  { id: 'orders', label: 'Orders', icon: Package, panel: 'orders' },
  { id: 'rewards', label: 'Rewards', icon: Sparkles, panel: 'overview' },
  { id: 'membership', label: 'Membership', icon: Star, panel: 'overview' },
];

export const ACCOUNT_MENU_GROUPS = [
  {
    id: 'shopping',
    title: 'SHOPPING',
    items: [
      { id: 'wishlist', title: 'Wishlist', subtitle: 'Saved products', icon: Heart, panel: 'wishlist' },
      { id: 'recent', title: 'Recently Viewed', subtitle: 'Your browsing trail', icon: Eye, panel: 'overview' },
      { id: 'coupons', title: 'Coupons', subtitle: 'Active offers', icon: Ticket, panel: 'overview' },
      { id: 'saved', title: 'Saved Items', subtitle: 'Collections', icon: ShoppingBag, panel: 'wishlist' },
      { id: 'addresses', title: 'Addresses', subtitle: 'Delivery locations', icon: MapPin, panel: 'addresses' },
      { id: 'payments', title: 'Payment Methods', subtitle: 'Cards & wallets', icon: CreditCard, panel: 'payments' },
      { id: 'orders', title: 'Orders', subtitle: 'Track purchases', icon: Package, panel: 'orders' },
      { id: 'refunds', title: 'Refunds', subtitle: 'Returns & disputes', icon: RefreshCw, panel: 'returns' },
    ],
  },
  {
    id: 'personalization',
    title: 'PERSONALIZATION',
    items: [
      { id: 'appearance', title: 'Appearance', subtitle: 'Cinema & ambient themes', icon: Moon, layer: 'appearance' },
      { id: 'accent', title: 'Accent Color', subtitle: 'Brand highlight', icon: Palette, layer: 'appearance' },
      { id: 'motion', title: 'Motion Preferences', subtitle: 'Animation intensity', icon: Zap, layer: 'appearance' },
      { id: 'language', title: 'Language', subtitle: 'English', icon: Languages, panel: 'settings', settingsSection: 'preferences' },
      { id: 'region', title: 'Region', subtitle: 'Country & currency', icon: Globe, panel: 'settings', settingsSection: 'preferences' },
      { id: 'density', title: 'Interface Density', subtitle: 'Comfortable', icon: Monitor, layer: 'appearance' },
    ],
  },
  {
    id: 'security',
    title: 'SECURITY & PRIVACY',
    items: [
      { id: 'privacy', title: 'Privacy', subtitle: 'Data & visibility', icon: Shield, panel: 'settings', settingsSection: 'profile' },
      { id: 'password', title: 'Password', subtitle: 'Update credentials', icon: Key, panel: 'settings', settingsSection: 'security' },
      { id: 'devices', title: 'Login Devices', subtitle: 'Active sessions', icon: Smartphone, panel: 'settings', settingsSection: 'security' },
      { id: '2fa', title: '2FA', subtitle: 'Extra protection', icon: Lock, panel: 'settings', settingsSection: 'security' },
      { id: 'logs', title: 'Security Logs', subtitle: 'Recent activity', icon: FileText, panel: 'settings', settingsSection: 'security' },
    ],
  },
  {
    id: 'support',
    title: 'SUPPORT',
    items: [
      { id: 'help', title: 'Help Center', subtitle: 'Guides & FAQs', icon: HelpCircle, external: '/help' },
      { id: 'chat', title: 'Live Chat', subtitle: 'Talk to support', icon: MessageCircle, external: '/help' },
      { id: 'contact', title: 'Contact', subtitle: 'Get in touch', icon: Headphones, external: '/help' },
      { id: 'terms', title: 'Terms', subtitle: 'Policies', icon: FileText, external: '/help' },
      { id: 'about', title: 'About Reaglex', subtitle: 'Version & info', icon: Info, external: '/help' },
    ],
  },
  {
    id: 'system',
    title: 'SYSTEM',
    items: [
      { id: 'cache', title: 'Cache Management', subtitle: 'Clear local data', icon: HardDrive, panel: 'settings' },
      { id: 'storage', title: 'Storage Usage', subtitle: 'App footprint', icon: HardDrive, panel: 'settings' },
      { id: 'experimental', title: 'Experimental Features', subtitle: 'Preview tools', icon: FlaskConical, panel: 'settings' },
      { id: 'version', title: 'App Version', subtitle: 'Reaglex SPA', icon: Info, panel: 'settings' },
    ],
  },
];

export const SETTINGS_GROUPS = [
  {
    id: 'general',
    title: 'GENERAL',
    items: [
      { id: 'profile', title: 'Personal Information', subtitle: 'Name, email, phone', icon: User, popup: 'editProfile' },
      { id: 'security', title: 'Security', subtitle: '2FA, password', icon: Shield, panel: 'settings' },
      { id: 'privacy', title: 'Privacy', subtitle: 'Visibility & data', icon: Lock, panel: 'settings' },
      { id: 'notifications', title: 'Notification Preferences', subtitle: 'Alerts & email', icon: Bell, panel: 'settings' },
    ],
  },
  {
    id: 'preferences',
    title: 'PREFERENCES',
    items: [
      { id: 'appearance', title: 'Appearance', subtitle: 'Cinema / Ambient', icon: Moon, layer: 'appearance' },
      { id: 'language', title: 'Language', subtitle: 'English', icon: Languages, panel: 'settings' },
      { id: 'currency', title: 'Currency', subtitle: 'Display currency', icon: Wallet, panel: 'settings' },
      { id: 'region', title: 'Country / Region', subtitle: 'Shipping region', icon: Globe, panel: 'settings' },
      { id: 'blocked', title: 'Blocked Users', subtitle: 'Manage blocks', icon: XCircle, panel: 'settings' },
    ],
  },
  {
    id: 'about',
    title: 'ABOUT',
    items: [
      { id: 'help', title: 'Help & Support', subtitle: 'Contact us', icon: HelpCircle, external: '/help' },
      { id: 'terms', title: 'Terms & Conditions', subtitle: 'Legal', icon: FileText, external: '/help' },
      { id: 'about', title: 'About Reaglex', subtitle: 'Our story', icon: Info, external: '/help' },
    ],
  },
];

export const DANGER_ITEMS = [
  { id: 'logout', title: 'Log Out', subtitle: 'Sign out of this device', icon: LogOut, popup: 'logout', danger: true },
  { id: 'delete', title: 'Delete Account', subtitle: 'Permanent action', icon: Trash2, panel: 'settings', danger: true },
];

export const PANEL_TITLES = {
  orders: 'My Orders',
  wishlist: 'Wishlist',
  addresses: 'Addresses',
  payments: 'Payment Methods',
  returns: 'Returns',
  reviews: 'My Reviews',
  settings: 'Account Settings',
  overview: 'Overview',
};
