/**
 * Central registry of platform feature switches.
 * Defaults are ON — missing keys are treated as enabled.
 */

export type SystemFeatureCategory =
  | 'discovery'
  | 'live_commerce'
  | 'payments'
  | 'ai'
  | 'buyer_experience'
  | 'seller'
  | 'communications';

export type SystemFeatureImpact = 'low' | 'medium' | 'high' | 'critical';

export type SystemFeatureSyncTarget =
  | { model: 'MarketplaceAIConfig'; field: 'enabled' }
  | { model: 'LiveCommerceSettings'; field: 'globallyEnabled' }
  | { model: 'AdminIntelligenceConfig'; field: 'platformAiEnabled' }
  | { model: 'PlatformShippingPolicy'; field: 'codEnabled' };

export interface SystemFeatureDefinition {
  key: string;
  label: string;
  category: SystemFeatureCategory;
  description: string;
  howItWorks: string;
  buyerImpact: string;
  adminImpact: string;
  impact: SystemFeatureImpact;
  defaultEnabled: boolean;
  hubRoute?: string;
  hubLabel?: string;
  sync?: SystemFeatureSyncTarget;
}

export const SYSTEM_FEATURE_CATEGORY_LABELS: Record<SystemFeatureCategory, string> = {
  discovery: 'Discovery & recommendations',
  live_commerce: 'Live commerce',
  payments: 'Checkout & payments',
  ai: 'AI & automation',
  buyer_experience: 'Buyer experience',
  seller: 'Seller tools',
  communications: 'Emails & notifications',
};

export const SYSTEM_FEATURE_REGISTRY: SystemFeatureDefinition[] = [
  {
    key: 'marketplace_ai_recommendations',
    label: 'AI product recommendations',
    category: 'discovery',
    description: 'Personalized home feed sections ranked by the marketplace AI engine.',
    howItWorks:
      'Uses local ranking (CTR, trust, freshness) — no paid API per request. When off, the home feed returns empty AI sections and falls back to static catalog lists where configured.',
    buyerImpact: 'Home page may show fewer personalized blocks; trending/new arrivals still work if those modules are on.',
    adminImpact: 'Marketing → AI ranking modes have no effect until re-enabled.',
    impact: 'critical',
    defaultEnabled: true,
    hubRoute: '/admin/marketing',
    hubLabel: 'Marketing center',
    sync: { model: 'MarketplaceAIConfig', field: 'enabled' },
  },
  {
    key: 'marketplace_ai_sponsored',
    label: 'Sponsored placements in feed',
    category: 'discovery',
    description: 'Paid/sponsored product slots inside AI-ranked sections.',
    howItWorks: 'Injects sponsored candidates when quality score passes admin thresholds.',
    buyerImpact: 'Feed shows only organic rankings.',
    adminImpact: 'Sponsored campaigns in feed pause.',
    impact: 'medium',
    defaultEnabled: true,
    hubRoute: '/admin/marketing',
    hubLabel: 'Marketing center',
  },
  {
    key: 'live_commerce',
    label: 'Live commerce (global)',
    category: 'live_commerce',
    description: 'Live shopping streams, seller go-live, and buyer live pages.',
    howItWorks: 'Master kill switch synced with Live Commerce admin settings.',
    buyerImpact: 'Live tab and streams hidden; active sessions should be ended by admins.',
    adminImpact: 'Live Commerce control panel shows disabled state.',
    impact: 'critical',
    defaultEnabled: true,
    hubRoute: '/admin/live-commerce',
    hubLabel: 'Live commerce',
    sync: { model: 'LiveCommerceSettings', field: 'globallyEnabled' },
  },
  {
    key: 'live_commerce_chat',
    label: 'Live session chat',
    category: 'live_commerce',
    description: 'Real-time chat during live streams.',
    howItWorks: 'Chat messages are blocked when off; stream video may still work if live commerce is on.',
    buyerImpact: 'Viewers cannot send chat messages.',
    adminImpact: 'Moderation queues for live chat idle.',
    impact: 'medium',
    defaultEnabled: true,
    hubRoute: '/admin/live-commerce',
    hubLabel: 'Live commerce',
  },
  {
    key: 'live_commerce_auctions',
    label: 'Live auctions & instant buy',
    category: 'live_commerce',
    description: 'Auctions, instant buy, and auto-bid during live sessions.',
    howItWorks: 'Disables bidding UI and server acceptance of live bids.',
    buyerImpact: 'Watch-only live streams.',
    adminImpact: 'Auction reports stop updating.',
    impact: 'high',
    defaultEnabled: true,
    hubRoute: '/admin/live-commerce',
    hubLabel: 'Live commerce',
  },
  {
    key: 'cod_checkout',
    label: 'Cash on delivery (COD)',
    category: 'payments',
    description: 'Pay-on-delivery option at checkout for eligible destinations.',
    howItWorks: 'Synced with Rwanda shipping policy COD toggle.',
    buyerImpact: 'COD payment method hidden at checkout.',
    adminImpact: 'Logistics → Rwanda Policy COD setting follows this switch.',
    impact: 'high',
    defaultEnabled: true,
    hubRoute: '/admin/logistics',
    hubLabel: 'Logistics',
    sync: { model: 'PlatformShippingPolicy', field: 'codEnabled' },
  },
  {
    key: 'escrow_payments',
    label: 'Escrow on online orders',
    category: 'payments',
    description: 'Hold buyer funds until delivery confirmation for card/MoMo orders.',
    howItWorks: 'When off, new orders skip escrow hold (use only for maintenance — affects trust).',
    buyerImpact: 'Faster capture; reduced buyer protection on disputes.',
    adminImpact: 'Finance escrow reports may show fewer holds.',
    impact: 'critical',
    defaultEnabled: true,
    hubRoute: '/admin/finance',
    hubLabel: 'Finance hub',
  },
  {
    key: 'momo_payments',
    label: 'MTN MoMo checkout',
    category: 'payments',
    description: 'MTN Mobile Money as a checkout provider.',
    howItWorks: 'Hides MoMo gateway at checkout; existing MoMo orders unaffected.',
    buyerImpact: 'Must use card or other enabled methods.',
    adminImpact: 'Finance → gateways: MoMo tests still available.',
    impact: 'high',
    defaultEnabled: true,
    hubRoute: '/admin/finance',
    hubLabel: 'Finance hub',
  },
  {
    key: 'airtel_payments',
    label: 'Airtel Money checkout',
    category: 'payments',
    description: 'Airtel Money as a checkout provider.',
    howItWorks: 'Hides Airtel gateway at checkout.',
    buyerImpact: 'Must use other payment methods.',
    adminImpact: 'Finance gateway configuration unchanged.',
    impact: 'high',
    defaultEnabled: true,
    hubRoute: '/admin/finance',
    hubLabel: 'Finance hub',
  },
  {
    key: 'admin_intelligence_gemini',
    label: 'Admin Gemini assist (Ctrl+K)',
    category: 'ai',
    description: 'Optional Gemini assist in admin intelligence search.',
    howItWorks: 'Synced with Team → Smart search master switch.',
    buyerImpact: 'No buyer-facing change.',
    adminImpact: 'Admin search runs without AI summaries.',
    impact: 'low',
    defaultEnabled: true,
    hubRoute: '/admin/team',
    hubLabel: 'Admin team',
    sync: { model: 'AdminIntelligenceConfig', field: 'platformAiEnabled' },
  },
  {
    key: 'marketing_ai_tools',
    label: 'Marketing AI tools',
    category: 'ai',
    description: 'AI campaign ideas, copy, and segment suggestions in marketing hub.',
    howItWorks: 'Marketing hub AI panels return disabled state.',
    buyerImpact: 'No direct change unless campaigns stop sending.',
    adminImpact: 'Marketing → AI Tools unavailable.',
    impact: 'medium',
    defaultEnabled: true,
    hubRoute: '/admin/marketing',
    hubLabel: 'Marketing center',
  },
  {
    key: 'buyer_assistant_chat',
    label: 'Buyer assistant chat (FAB)',
    category: 'buyer_experience',
    description: 'Floating AI assistant and command palette on storefront.',
    howItWorks: 'Hides the global assistant widget in buyer app shell.',
    buyerImpact: 'Assistant button removed; help center still available.',
    adminImpact: 'No admin UI change.',
    impact: 'medium',
    defaultEnabled: true,
  },
  {
    key: 'buyer_location_picker',
    label: 'Deliver-to city picker',
    category: 'buyer_experience',
    description: 'Header location bar and delivery destination selection.',
    howItWorks: 'Hides location UI; checkout may still use address fields.',
    buyerImpact: 'Shipping quotes may use default city until address entered.',
    adminImpact: 'Logistics destinations still editable.',
    impact: 'medium',
    defaultEnabled: true,
    hubRoute: '/admin/logistics',
    hubLabel: 'Logistics',
  },
  {
    key: 'product_wishlist',
    label: 'Wishlist',
    category: 'buyer_experience',
    description: 'Save products to wishlist across devices when logged in.',
    howItWorks: 'Wishlist buttons and API return disabled for buyers.',
    buyerImpact: 'Cannot add or view wishlist.',
    adminImpact: 'Wishlist analytics pause.',
    impact: 'medium',
    defaultEnabled: true,
  },
  {
    key: 'product_reviews',
    label: 'Product reviews',
    category: 'buyer_experience',
    description: 'Buyer ratings and reviews on product pages.',
    howItWorks: 'Review forms hidden; existing reviews may still display read-only.',
    buyerImpact: 'Cannot submit new reviews.',
    adminImpact: 'Reviews hub moderation queue slows.',
    impact: 'medium',
    defaultEnabled: true,
    hubRoute: '/admin/reviews',
    hubLabel: 'Reviews',
  },
  {
    key: 'buyer_referrals',
    label: 'Referral program',
    category: 'buyer_experience',
    description: 'Buyer invite links and referral rewards.',
    howItWorks: 'Referral dashboard and signup attribution disabled.',
    buyerImpact: 'Referral tab hidden in account.',
    adminImpact: 'Marketing referral settings have no effect.',
    impact: 'medium',
    defaultEnabled: true,
    hubRoute: '/admin/marketing',
    hubLabel: 'Marketing center',
  },
  {
    key: 'recommendation_emails',
    label: 'Recommendation emails',
    category: 'communications',
    description: 'Automated product recommendation emails to buyers.',
    howItWorks: 'Workers skip recommendation email sends.',
    buyerImpact: 'No personalized product emails.',
    adminImpact: 'Marketing email tests may still run manually.',
    impact: 'medium',
    defaultEnabled: true,
    hubRoute: '/admin/marketing',
    hubLabel: 'Marketing center',
  },
  {
    key: 'abandoned_cart_emails',
    label: 'Abandoned cart recovery',
    category: 'communications',
    description: 'Reminder emails for carts left at checkout.',
    howItWorks: 'Cart recovery workers skip new sends.',
    buyerImpact: 'No cart reminder emails.',
    adminImpact: 'Abandoned cart reports flatline.',
    impact: 'medium',
    defaultEnabled: true,
    hubRoute: '/admin/marketing',
    hubLabel: 'Marketing center',
  },
  {
    key: 'web_push_notifications',
    label: 'Web push notifications',
    category: 'communications',
    description: 'Browser push opt-in and promotional pushes.',
    howItWorks: 'Opt-in cards hidden; server rejects new web push registrations.',
    buyerImpact: 'No browser push alerts.',
    adminImpact: 'Notification studio web push tools limited.',
    impact: 'low',
    defaultEnabled: true,
    hubRoute: '/admin/notifications',
    hubLabel: 'Notifications',
  },
  {
    key: 'seller_subscriptions',
    label: 'Seller subscription tiers',
    category: 'seller',
    description: 'Paid seller plans and subscription-gated features.',
    howItWorks: 'New subscription purchases blocked; existing tiers honored until expiry.',
    buyerImpact: 'Seller perks from subscriptions may lapse over time.',
    adminImpact: 'Seller subscriptions admin read-only.',
    impact: 'high',
    defaultEnabled: true,
    hubRoute: '/admin/seller-subscriptions',
    hubLabel: 'Seller subscriptions',
  },
  {
    key: 'hero_carousel',
    label: 'Home hero carousel',
    category: 'buyer_experience',
    description: 'Marketing hero slides on the buyer home page.',
    howItWorks: 'Hero section hidden; other home modules remain.',
    buyerImpact: 'Home opens without promotional carousel.',
    adminImpact: 'Site hero manager changes have no visible effect.',
    impact: 'low',
    defaultEnabled: true,
    hubRoute: '/admin/marketing',
    hubLabel: 'Marketing center',
  },
];

export const SYSTEM_FEATURE_KEYS = SYSTEM_FEATURE_REGISTRY.map((f) => f.key);

export const SYSTEM_FEATURE_BY_KEY = Object.fromEntries(
  SYSTEM_FEATURE_REGISTRY.map((f) => [f.key, f]),
) as Record<string, SystemFeatureDefinition>;

export const DISABLE_ACKNOWLEDGMENT =
  'I understand that disabling platform features may break buyer and seller experiences, reduce revenue, and require careful re-enablement. I accept responsibility for this change.';
