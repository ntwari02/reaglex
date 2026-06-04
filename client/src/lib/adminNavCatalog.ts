import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Store as StoreIcon,
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Truck,
  Megaphone,
  Star,
  FolderKanban,
  Settings,
  Activity,
  ShieldCheck,
  BadgePercent,
  Crown,
  RotateCcw,
  Bell,
  Radio,
  UserCog,
  SlidersHorizontal,
} from 'lucide-react';
import type { AdminScope } from './adminPermissions';
import type { Profile } from '../types';
import { canAccessAdminRoute, isSuperAdmin } from './adminPermissions';
import type { MenuItem } from '@/components/dashboard/Sidebar';

export type AdminNavCategoryId =
  | 'overview'
  | 'platform'
  | 'people'
  | 'catalog'
  | 'commerce'
  | 'revenue'
  | 'growth'
  | 'administration';

export interface AdminNavCategory {
  id: AdminNavCategoryId;
  label: string;
  description: string;
}

export const ADMIN_NAV_CATEGORIES: AdminNavCategory[] = [
  { id: 'overview', label: 'Overview', description: 'Dashboard, Admin team (super only)' },
  { id: 'platform', label: 'Platform & security', description: 'System, Security, Compliance' },
  { id: 'people', label: 'People & trust', description: 'Users, Sellers, KYC' },
  { id: 'catalog', label: 'Catalog', description: 'Products, metadata, Collections, Reviews' },
  { id: 'commerce', label: 'Commerce ops', description: 'Orders, Support, Returns, Logistics, Live commerce' },
  { id: 'revenue', label: 'Finance', description: 'Finance hub, Seller subscriptions' },
  { id: 'growth', label: 'Marketing', description: 'Marketing center, Notifications' },
  { id: 'administration', label: 'Account', description: 'Profile & settings' },
];

const ROUTE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  'system-analysis': Activity,
  'security-analysis': ShieldCheck,
  team: UserCog,
  users: Users,
  sellers: StoreIcon,
  'kyc-queues': ShieldCheck,
  products: Package,
  'product-metadata': BadgePercent,
  orders: ShoppingCart,
  finance: DollarSign,
  'seller-subscriptions': Crown,
  support: AlertTriangle,
  returns: RotateCcw,
  logistics: Truck,
  notifications: Bell,
  'live-commerce': Radio,
  marketing: Megaphone,
  reviews: Star,
  collections: FolderKanban,
  compliance: ShieldCheck,
  settings: Settings,
  'system-controls': SlidersHorizontal,
};

/** Route id → permission scope (mirrors server ADMIN_UI_ROUTE_SCOPES). */
export const ADMIN_ROUTE_SCOPES: Record<string, AdminScope | 'super'> = {
  dashboard: 'dashboard',
  'system-analysis': 'system',
  'security-analysis': 'security',
  users: 'users',
  sellers: 'sellers',
  'kyc-queues': 'kyc',
  products: 'products',
  'product-metadata': 'products',
  orders: 'orders',
  finance: 'finance',
  'seller-subscriptions': 'subscriptions',
  support: 'support',
  returns: 'returns',
  logistics: 'logistics',
  notifications: 'notifications',
  'live-commerce': 'live_commerce',
  marketing: 'marketing',
  reviews: 'reviews',
  collections: 'collections',
  compliance: 'compliance',
  settings: 'settings',
  team: 'super',
  'system-controls': 'super',
};

interface NavItemDef {
  routeId: string;
  label: string;
  categoryId: AdminNavCategoryId;
}

const NAV_ITEMS: NavItemDef[] = [
  { routeId: 'dashboard', label: 'Dashboard', categoryId: 'overview' },
  { routeId: 'team', label: 'Admin team', categoryId: 'overview' },
  { routeId: 'system-controls', label: 'System controls', categoryId: 'platform' },
  { routeId: 'system-analysis', label: 'System', categoryId: 'platform' },
  { routeId: 'security-analysis', label: 'Security', categoryId: 'platform' },
  { routeId: 'compliance', label: 'Compliance', categoryId: 'platform' },
  { routeId: 'users', label: 'Users', categoryId: 'people' },
  { routeId: 'sellers', label: 'Sellers', categoryId: 'people' },
  { routeId: 'kyc-queues', label: 'KYC queues', categoryId: 'people' },
  { routeId: 'products', label: 'Products', categoryId: 'catalog' },
  { routeId: 'product-metadata', label: 'Product metadata', categoryId: 'catalog' },
  { routeId: 'collections', label: 'Collections', categoryId: 'catalog' },
  { routeId: 'reviews', label: 'Reviews', categoryId: 'catalog' },
  { routeId: 'orders', label: 'Orders', categoryId: 'commerce' },
  { routeId: 'support', label: 'Support', categoryId: 'commerce' },
  { routeId: 'returns', label: 'Returns', categoryId: 'commerce' },
  { routeId: 'logistics', label: 'Logistics', categoryId: 'commerce' },
  { routeId: 'live-commerce', label: 'Live Commerce', categoryId: 'commerce' },
  { routeId: 'finance', label: 'Finance hub', categoryId: 'revenue' },
  { routeId: 'seller-subscriptions', label: 'Seller subscriptions', categoryId: 'revenue' },
  { routeId: 'marketing', label: 'Marketing center', categoryId: 'growth' },
  { routeId: 'notifications', label: 'Notifications', categoryId: 'growth' },
  { routeId: 'settings', label: 'Profile & settings', categoryId: 'administration' },
];

export interface AdminMenuSection {
  category: AdminNavCategory;
  items: MenuItem[];
}

function buildVisibleAdminMenuItems(
  user: Profile | null | undefined,
  badges?: Partial<Record<string, { text: string; tone: MenuItem['badgeTone'] }>>,
): MenuItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.routeId === 'team' || item.routeId === 'system-controls') return isSuperAdmin(user);
    return canAccessAdminRoute(user, item.routeId);
  }).map((item) => {
    const icon = ROUTE_ICONS[item.routeId] || LayoutDashboard;
    const badge = badges?.[item.routeId];
    return {
      id: item.routeId,
      label: item.label,
      icon,
      ...(badge ? { badge: badge.text, badgeTone: badge.tone } : {}),
    } satisfies MenuItem;
  });
}

/** Flat nav for super admins — full panel without section headers. */
export function buildAdminMenuItems(
  user: Profile | null | undefined,
  badges?: Partial<Record<string, { text: string; tone: MenuItem['badgeTone'] }>>,
): MenuItem[] {
  return buildVisibleAdminMenuItems(user, badges);
}

/** Classified nav for scoped sub-admins — only departments their role allows. */
export function buildAdminMenuSections(
  user: Profile | null | undefined,
  badges?: Partial<Record<string, { text: string; tone: MenuItem['badgeTone'] }>>,
): AdminMenuSection[] {
  if (isSuperAdmin(user)) return [];

  const visible = buildVisibleAdminMenuItems(user, badges);
  const sections: AdminMenuSection[] = [];
  for (const cat of ADMIN_NAV_CATEGORIES) {
    const items = visible.filter((m) => {
      const def = NAV_ITEMS.find((n) => n.routeId === m.id);
      return def?.categoryId === cat.id;
    });
    if (items.length > 0) sections.push({ category: cat, items });
  }
  return sections;
}

/** Flat list for route validation and legacy callers. */
export function getAllAdminRouteIds(): string[] {
  return NAV_ITEMS.map((n) => n.routeId);
}

export const ADMIN_PRESET_CATEGORY_LABELS: Record<string, string> = {
  full: 'Full access',
  finance: 'Finance',
  support: 'Support',
  marketing: 'Marketing',
  logistics: 'Logistics',
  security: 'Security',
  operations: 'Operations',
  catalog: 'Catalog',
  commerce: 'Commerce',
};

export const ADMIN_PRESET_CATEGORY_ORDER = [
  'full',
  'finance',
  'marketing',
  'commerce',
  'support',
  'logistics',
  'catalog',
  'operations',
  'security',
] as const;
