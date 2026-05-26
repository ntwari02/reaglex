import type { AdminScope } from './adminScopes';

export type AdminNavCategoryId =
  | 'overview'
  | 'platform'
  | 'people'
  | 'catalog'
  | 'commerce'
  | 'revenue'
  | 'growth'
  | 'administration';

export interface AdminNavItemDef {
  routeId: string;
  label: string;
  scope: AdminScope | 'super';
  description: string;
}

export interface AdminNavCategoryDef {
  id: AdminNavCategoryId;
  label: string;
  description: string;
  items: AdminNavItemDef[];
}

/** Classified admin sidebar — maps website areas to permission scopes. */
export const ADMIN_NAV_CATALOG: AdminNavCategoryDef[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Command center and registry search',
    items: [
      { routeId: 'dashboard', label: 'Dashboard', scope: 'dashboard', description: 'KPIs and health summary' },
      { routeId: 'team', label: 'Admin team', scope: 'super', description: 'Roles, presets, platform AI' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform & security',
    description: 'System health, security SOC, compliance',
    items: [
      { routeId: 'system-analysis', label: 'System analysis', scope: 'system', description: 'API monitor, workers, infra' },
      { routeId: 'security-analysis', label: 'Security analysis', scope: 'security', description: 'Threats, auth, fraud signals' },
      { routeId: 'compliance', label: 'Data compliance', scope: 'compliance', description: 'Certificates, privacy, retention' },
    ],
  },
  {
    id: 'people',
    label: 'People & trust',
    description: 'Buyers, sellers, verification',
    items: [
      { routeId: 'users', label: 'Users', scope: 'users', description: 'Buyer accounts and status' },
      { routeId: 'sellers', label: 'Sellers', scope: 'sellers', description: 'Stores, performance, strikes' },
      { routeId: 'kyc-queues', label: 'KYC queues', scope: 'kyc', description: 'Identity and seller verification' },
    ],
  },
  {
    id: 'catalog',
    label: 'Catalog',
    description: 'Products, metadata, collections, reviews',
    items: [
      { routeId: 'products', label: 'Products', scope: 'products', description: 'Moderation and catalog QA' },
      { routeId: 'product-metadata', label: 'Product metadata', scope: 'products', description: 'SEO, badges, enrichment' },
      { routeId: 'collections', label: 'Collections', scope: 'collections', description: 'Curated storefront groups' },
      { routeId: 'reviews', label: 'Reviews', scope: 'reviews', description: 'Ratings moderation' },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce ops',
    description: 'Orders, support, logistics, live selling',
    items: [
      { routeId: 'orders', label: 'Orders', scope: 'orders', description: 'Fulfillment and disputes' },
      { routeId: 'support', label: 'Support', scope: 'support', description: 'Tickets and inbox' },
      { routeId: 'returns', label: 'Returns', scope: 'returns', description: 'Return cases and refunds' },
      { routeId: 'logistics', label: 'Logistics', scope: 'logistics', description: 'Fleet, shipping, carriers' },
      { routeId: 'live-commerce', label: 'Live commerce', scope: 'live_commerce', description: 'Live sessions and seller permissions' },
    ],
  },
  {
    id: 'revenue',
    label: 'Finance',
    description: 'Payments, escrow, subscriptions',
    items: [
      { routeId: 'finance', label: 'Finance hub', scope: 'finance', description: 'Payouts, escrow, transactions' },
      { routeId: 'seller-subscriptions', label: 'Seller subscriptions', scope: 'subscriptions', description: 'Plans, billing, limits' },
    ],
  },
  {
    id: 'growth',
    label: 'Marketing',
    description: 'Campaigns, email automation, notifications',
    items: [
      { routeId: 'marketing', label: 'Marketing center', scope: 'marketing', description: 'Campaigns, abandon cart, AI feed' },
      { routeId: 'notifications', label: 'Notifications', scope: 'notifications', description: 'Push, email studio, broadcasts' },
    ],
  },
  {
    id: 'administration',
    label: 'Account',
    description: 'Profile and personal settings',
    items: [
      { routeId: 'settings', label: 'Profile & settings', scope: 'settings', description: 'Your admin profile' },
    ],
  },
];

export const ADMIN_PRESET_CATEGORIES: Record<string, AdminNavCategoryId[]> = {
  super_admin: ['overview', 'platform', 'people', 'catalog', 'commerce', 'revenue', 'growth', 'administration'],
  finance_admin: ['overview', 'revenue', 'commerce', 'administration'],
  support_admin: ['overview', 'commerce', 'people', 'administration'],
  marketing_admin: ['overview', 'growth', 'catalog', 'administration'],
  logistics_admin: ['overview', 'commerce', 'administration'],
  security_admin: ['overview', 'platform', 'people', 'administration'],
  operations_assistant: ['overview', 'people', 'catalog', 'commerce', 'administration'],
  catalog_admin: ['overview', 'catalog', 'people', 'administration'],
  commerce_admin: ['overview', 'commerce', 'growth', 'catalog', 'administration'],
};
