import {
  Home,
  LayoutGrid,
  Tag,
  Sparkles,
  TrendingUp,
  Store,
  Package,
  Heart,
  Clock,
  MapPin,
  CreditCard,
  Gift,
  Settings,
  Moon,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { explorePath } from '../explore/exploreConfig';

export const MENU_EASE = [0.22, 1, 0.36, 1];
export const MENU_MS = 0.22;

export const QUICK_ACCESS = [
  { id: 'orders', icon: Package, title: 'Orders', sub: '3 recent', to: '/account?tab=orders', accent: '#FF6A00' },
  { id: 'deals', icon: Tag, title: 'Deals', sub: 'Hot offers', to: '/search?sort=discount', accent: '#7C5CFF' },
  { id: 'saved', icon: Heart, title: 'Saved', sub: '12 items', to: '/account?tab=wishlist', accent: '#5B8DEF', countKey: 'wishlist' },
  { id: 'viewed', icon: Clock, title: 'Viewed', sub: '23 items', to: explorePath('viewed'), accent: '#E879A8', countKey: 'viewed' },
  { id: 'ai', icon: Sparkles, title: 'AI Picks', sub: 'For you', to: explorePath('ai'), accent: '#FF6A00' },
];

export const SHOP_ITEMS = [
  { id: 'home', icon: Home, label: 'Home', to: '/' },
  { id: 'categories', icon: LayoutGrid, label: 'Categories', to: '/products' },
  { id: 'deals', icon: Tag, label: 'Deals', to: '/search?sort=discount' },
  { id: 'new', icon: Flame, label: 'New Arrivals', to: explorePath('new') },
  { id: 'trending', icon: TrendingUp, label: 'Trending', to: explorePath('trending') },
  { id: 'stores', icon: Store, label: 'Stores', to: '/products' },
];

export const ACCOUNT_ITEMS = [
  { id: 'orders', icon: Package, label: 'Orders', to: '/account?tab=orders', tab: 'orders' },
  { id: 'saved', icon: Heart, label: 'Saved', to: '/account?tab=wishlist', tab: 'wishlist' },
  { id: 'viewed', icon: Clock, label: 'Recently Viewed', to: explorePath('viewed') },
  { id: 'addresses', icon: MapPin, label: 'Addresses', to: '/account?tab=addresses', tab: 'addresses' },
  { id: 'payments', icon: CreditCard, label: 'Payments', to: '/account?tab=payments', tab: 'payments' },
  { id: 'rewards', icon: Gift, label: 'Rewards', to: '/account?tab=rewards', tab: 'rewards' },
];

export const SETTINGS_ITEMS = [
  { id: 'settings', icon: Settings, label: 'Settings', action: 'settings' },
  { id: 'dark', icon: Moon, label: 'Dark Mode', action: 'dark' },
  { id: 'help', icon: HelpCircle, label: 'Help & Support', to: '/faq' },
];

export function greetingPeriod() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

export function displayName(user) {
  if (!user) return 'Guest';
  return user.firstName || user.name?.split?.(' ')?.[0] || user.username || user.email?.split?.('@')?.[0] || 'Shopper';
}
