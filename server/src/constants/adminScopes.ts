/** Admin panel permission scopes (subset of full super-admin). */
export const ADMIN_SCOPES = [
  'dashboard',
  'users',
  'sellers',
  'kyc',
  'products',
  'orders',
  'finance',
  'subscriptions',
  'support',
  'returns',
  'logistics',
  'notifications',
  'live_commerce',
  'marketing',
  'reviews',
  'collections',
  'compliance',
  'system',
  'security',
  'settings',
] as const;

export type AdminScope = (typeof ADMIN_SCOPES)[number];

export type AdminStaffTier = 'super' | 'scoped';

export type AdminStaffPreset =
  | 'super_admin'
  | 'finance_admin'
  | 'support_admin'
  | 'marketing_admin'
  | 'logistics_admin'
  | 'security_admin'
  | 'operations_assistant'
  | 'catalog_admin'
  | 'commerce_admin';

export type AdminPresetCategory =
  | 'full'
  | 'finance'
  | 'support'
  | 'marketing'
  | 'logistics'
  | 'security'
  | 'operations'
  | 'catalog'
  | 'commerce';

export const ADMIN_STAFF_PRESETS: Record<
  AdminStaffPreset,
  {
    label: string;
    description: string;
    tier: AdminStaffTier;
    scopes: AdminScope[];
    category: AdminPresetCategory;
    highlights: string[];
  }
> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full access to every admin area and team management.',
    tier: 'super',
    scopes: [],
    category: 'full',
    highlights: ['All categories', 'Team & roles', 'Platform AI', 'Security SOC'],
  },
  finance_admin: {
    label: 'Finance',
    description: 'Payments, escrow, payouts, seller subscriptions, and order financial view.',
    tier: 'scoped',
    scopes: ['dashboard', 'finance', 'subscriptions', 'orders', 'compliance', 'settings'],
    category: 'finance',
    highlights: ['Finance hub', 'Escrow', 'Subscriptions', 'Order totals'],
  },
  support_admin: {
    label: 'Support',
    description: 'Support center, returns, buyers, and order operations (no finance mutations).',
    tier: 'scoped',
    scopes: ['dashboard', 'support', 'returns', 'users', 'orders', 'sellers', 'settings'],
    category: 'support',
    highlights: ['Tickets', 'Returns', 'Order lookup', 'Buyer assist'],
  },
  marketing_admin: {
    label: 'Marketing',
    description: 'Campaigns, abandoned cart, home AI feed, collections, reviews, live commerce.',
    tier: 'scoped',
    scopes: [
      'dashboard',
      'marketing',
      'collections',
      'notifications',
      'reviews',
      'live_commerce',
      'products',
      'settings',
    ],
    category: 'marketing',
    highlights: ['Marketing center', 'Email automation', 'Notifications', 'Live commerce'],
  },
  logistics_admin: {
    label: 'Logistics',
    description: 'Logistics hub, fleet, carriers, and shipment-linked orders.',
    tier: 'scoped',
    scopes: ['dashboard', 'logistics', 'orders', 'sellers', 'settings'],
    category: 'logistics',
    highlights: ['Logistics center', 'Fleet', 'Order tracking'],
  },
  security_admin: {
    label: 'Security & compliance',
    description: 'Security SOC, system monitor, KYC queues, compliance, seller risk.',
    tier: 'scoped',
    scopes: ['dashboard', 'security', 'system', 'kyc', 'compliance', 'sellers', 'users', 'settings'],
    category: 'security',
    highlights: ['Security analysis', 'System health', 'KYC', 'Compliance'],
  },
  operations_assistant: {
    label: 'Operations',
    description: 'Day-to-day ops: users, sellers, catalog, orders, KYC (no finance or security tools).',
    tier: 'scoped',
    scopes: ['dashboard', 'users', 'sellers', 'products', 'orders', 'kyc', 'support', 'returns', 'settings'],
    category: 'operations',
    highlights: ['Users', 'Sellers', 'Products', 'Orders'],
  },
  catalog_admin: {
    label: 'Catalog',
    description: 'Products, metadata, collections, reviews, and seller catalog quality.',
    tier: 'scoped',
    scopes: ['dashboard', 'products', 'collections', 'reviews', 'sellers', 'settings'],
    category: 'catalog',
    highlights: ['Product moderation', 'Collections', 'Reviews'],
  },
  commerce_admin: {
    label: 'Commerce',
    description: 'Orders, support, logistics, live selling, and growth notifications.',
    tier: 'scoped',
    scopes: [
      'dashboard',
      'orders',
      'support',
      'returns',
      'logistics',
      'live_commerce',
      'marketing',
      'notifications',
      'settings',
    ],
    category: 'commerce',
    highlights: ['Orders', 'Support', 'Logistics', 'Marketing tools'],
  },
};

/** API path prefix → required scope(s); first match wins. */
export const ADMIN_API_SCOPE_RULES: Array<{ prefix: string; scopes: AdminScope[] }> = [
  { prefix: '/api/payments/admin', scopes: ['finance'] },
  { prefix: '/api/admin/finance', scopes: ['finance'] },
  { prefix: '/api/admin/seller-subscriptions', scopes: ['subscriptions'] },
  { prefix: '/api/admin/support', scopes: ['support'] },
  { prefix: '/api/admin/returns', scopes: ['returns'] },
  { prefix: '/api/admin/logistics', scopes: ['logistics'] },
  { prefix: '/api/admin/notifications', scopes: ['notifications'] },
  { prefix: '/api/admin/marketing', scopes: ['marketing'] },
  { prefix: '/api/admin/reviews', scopes: ['reviews'] },
  { prefix: '/api/admin/collections', scopes: ['collections'] },
  { prefix: '/api/admin/compliance', scopes: ['compliance'] },
  { prefix: '/api/admin/kyc-queues', scopes: ['kyc'] },
  { prefix: '/api/admin/products', scopes: ['products'] },
  { prefix: '/api/admin/orders', scopes: ['orders'] },
  { prefix: '/api/admin/intelligence', scopes: ['dashboard'] },
  { prefix: '/api/recommendation-emails', scopes: ['marketing'] },
  { prefix: '/api/live-commerce/admin', scopes: ['live_commerce'] },
  { prefix: '/api/affiliate/admin', scopes: ['marketing'] },
  { prefix: '/api/verification/suspicious', scopes: ['products'] },
  { prefix: '/api/verification/seller-trust/adjust', scopes: ['products', 'sellers'] },
  { prefix: '/api/admin/live', scopes: ['live_commerce'] },
  { prefix: '/api/admin/site', scopes: ['settings'] },
  { prefix: '/api/admin/sellers', scopes: ['sellers'] },
  { prefix: '/api/admin/users', scopes: ['users'] },
  { prefix: '/api/admin', scopes: ['users'] }, // legacy /api/admin/buyers, /api/admin/sellers
  { prefix: '/api/system', scopes: ['system'] },
  { prefix: '/api/security-analysis', scopes: ['security'] },
  { prefix: '/api/admin/marketplace-ai', scopes: ['marketing'] },
];

/** Admin UI route segment → scope */
export const ADMIN_UI_ROUTE_SCOPES: Record<string, AdminScope | 'super'> = {
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
