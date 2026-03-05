export type HelpCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  gradient: string;
  description: string;
  articleCount: number;
};

export type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  readTime: string;
  helpfulCount: number;
  excerpt: string;
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'orders',
    slug: 'orders-tracking',
    name: 'Orders & Tracking',
    icon: '📦',
    gradient: 'linear-gradient(135deg,#f97316,#ea580c)',
    description: 'Track orders, view shipping updates, and resolve delivery issues.',
    articleCount: 18,
  },
  {
    id: 'payments',
    slug: 'payments-billing',
    name: 'Payments & Billing',
    icon: '💳',
    gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
    description: 'Manage payment methods, billing details, and transaction history.',
    articleCount: 14,
  },
  {
    id: 'escrow',
    slug: 'escrow-protection',
    name: 'Escrow Protection',
    icon: '🛡️',
    gradient: 'linear-gradient(135deg,#059669,#047857)',
    description: 'Learn how escrow holds, releases, and protects your payments.',
    articleCount: 10,
  },
  {
    id: 'returns',
    slug: 'returns-refunds',
    name: 'Returns & Refunds',
    icon: '↩',
    gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    description: 'Understand our return policy, refund timelines, and disputes.',
    articleCount: 16,
  },
  {
    id: 'account',
    slug: 'account-profile',
    name: 'Account & Profile',
    icon: '👤',
    gradient: 'linear-gradient(135deg,#0891b2,#0e7490)',
    description: 'Update your profile, manage security, and control preferences.',
    articleCount: 12,
  },
  {
    id: 'sellers',
    slug: 'seller-information',
    name: 'Seller Information',
    icon: '🏪',
    gradient: 'linear-gradient(135deg,#d97706,#b45309)',
    description: 'Become a seller, manage your store, and review fees.',
    articleCount: 20,
  },
  {
    id: 'technical',
    slug: 'app-technical',
    name: 'App & Technical',
    icon: '📱',
    gradient: 'linear-gradient(135deg,#db2777,#be185d)',
    description: 'Fix app issues, browser problems, and technical errors.',
    articleCount: 8,
  },
  {
    id: 'security',
    slug: 'security-privacy',
    name: 'Security & Privacy',
    icon: '🔒',
    gradient: 'linear-gradient(135deg,#374151,#1f2937)',
    description: 'Keep your account secure and understand how we protect your data.',
    articleCount: 11,
  },
  {
    id: 'deals',
    slug: 'deals-promotions',
    name: 'Deals & Promotions',
    icon: '🎁',
    gradient: 'linear-gradient(135deg,#f59e0b,#d97706)',
    description: 'Learn about flash sales, vouchers, and loyalty rewards.',
    articleCount: 9,
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'escrow-how-it-works',
    slug: 'how-does-reaglex-escrow-work',
    title: 'How does Reaglex escrow work?',
    categoryId: 'escrow',
    readTime: '3 min read',
    helpfulCount: 892,
    excerpt:
      'Understand how your money is held securely in escrow until your order is delivered and approved.',
  },
  {
    id: 'orders-tracking-order',
    slug: 'how-to-track-my-order',
    title: 'How to track my order?',
    categoryId: 'orders',
    readTime: '2 min read',
    helpfulCount: 1200,
    excerpt:
      'Learn where to find your tracking link, delivery estimates, and real-time shipment updates.',
  },
  {
    id: 'returns-policy',
    slug: 'what-is-the-return-policy',
    title: 'What is the return policy?',
    categoryId: 'returns',
    readTime: '4 min read',
    helpfulCount: 756,
    excerpt:
      'Everything you need to know about eligible items, 30-day windows, and how refunds are processed.',
  },
  {
    id: 'payments-add-method',
    slug: 'how-to-add-a-payment-method',
    title: 'How to add a payment method?',
    categoryId: 'payments',
    readTime: '2 min read',
    helpfulCount: 634,
    excerpt:
      'Step-by-step guide to securely adding cards, mobile money, and other payment options.',
  },
  {
    id: 'sellers-become',
    slug: 'how-to-become-a-seller',
    title: 'How to become a seller?',
    categoryId: 'sellers',
    readTime: '5 min read',
    helpfulCount: 1500,
    excerpt:
      'Create your Reaglex store, verify your identity, and start listing products in minutes.',
  },
  {
    id: 'payments-declined',
    slug: 'why-was-my-payment-declined',
    title: 'Why was my payment declined?',
    categoryId: 'payments',
    readTime: '3 min read',
    helpfulCount: 445,
    excerpt:
      'Common reasons for declined payments and how to quickly resolve them.',
  },
];

