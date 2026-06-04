import type { QueryIntent } from './intelligenceSearch.types';
import { classifyQuery } from './queryClassifier';

export interface QueryUnderstanding {
  intent: QueryIntent;
  intentLabel: string;
  normalized: string;
  /** Shown while admin types — what the system believes they need */
  summary: string;
  /** Which data domains will be queried (transparent, no AI) */
  searchScope: string[];
  tips: string[];
  keywords: string[];
  /** Relationship expansion is heavier — only when useful */
  allowGraphExpansion: boolean;
}

const CONTEXT_RULES: Array<{
  pattern: RegExp;
  keywords: string[];
  scope: string[];
  tip: string;
  boostGraph?: boolean;
}> = [
  {
    pattern: /\b(payment|paid|pay|refund|flutterwave|flw_|momo|stripe|escrow|transaction|txn)\b/i,
    keywords: ['payment'],
    scope: ['Payments', 'Orders'],
    tip: 'Shows payment records and linked orders',
    boostGraph: true,
  },
  {
    pattern: /\b(dispute|chargeback|complaint|refund request)\b/i,
    keywords: ['dispute'],
    scope: ['Disputes', 'Orders', 'Support'],
    tip: 'Includes disputes and related tickets',
    boostGraph: true,
  },
  {
    pattern: /\b(order|delivery|shipped|tracking|package)\b/i,
    keywords: ['order'],
    scope: ['Orders', 'Payments'],
    tip: 'Order timeline, seller, and payment method',
    boostGraph: true,
  },
  {
    pattern: /\b(seller|store|vendor|merchant)\b/i,
    keywords: ['seller'],
    scope: ['Sellers', 'Products', 'Orders'],
    tip: 'Seller profile, products, and payouts',
    boostGraph: true,
  },
  {
    pattern: /\b(customer|buyer|client)\b/i,
    keywords: ['buyer'],
    scope: ['Users', 'Orders'],
    tip: 'Buyer identity and purchase history',
    boostGraph: true,
  },
  {
    pattern: /\b(ticket|support|help)\b/i,
    keywords: ['support'],
    scope: ['Support tickets'],
    tip: 'Support threads linked to sellers or orders',
  },
  {
    pattern: /\b(vehicle|driver|fleet|plate|delivery van)\b/i,
    keywords: ['logistics'],
    scope: ['Fleet & vehicles'],
    tip: 'Driver, plate, and delivery partner records',
  },
];

const INTENT_SUMMARIES: Record<QueryIntent, (q: string) => string> = {
  email: () => 'Finding accounts and orders tied to this email',
  phone: () => 'Finding users, sellers, and guest orders with this phone',
  order_id: (q) => `Looking up order ${q.replace(/^#/, '')} and linked payments`,
  payment_ref: () => 'Tracing this payment to its order, seller, and buyer',
  plate: () => 'Matching fleet / delivery vehicle records',
  object_id: () => 'Resolving this database record across all modules',
  general: (q) =>
    q.length < 3
      ? 'Type a name, phone, email, or order reference'
      : `Searching names, orders, payments, and support for “${q.slice(0, 40)}${q.length > 40 ? '…' : ''}”`,
};

const INTENT_SCOPES: Record<QueryIntent, string[]> = {
  email: ['Users', 'Sellers', 'Orders (guest email)'],
  phone: ['Users', 'Sellers', 'Orders (guest phone)', 'Fleet'],
  order_id: ['Orders', 'Payments', 'Disputes', 'Returns'],
  payment_ref: ['Payments', 'Orders', 'Sellers'],
  plate: ['Fleet drivers'],
  object_id: ['All record types'],
  general: ['Users', 'Orders', 'Payments', 'Products', 'Support'],
};

export function explainQuery(raw: string): QueryUnderstanding {
  const base = classifyQuery(raw);
  const q = base.normalized || String(raw || '').trim();
  const lower = q.toLowerCase();

  const keywords: string[] = [];
  const scopeSet = new Set<string>(INTENT_SCOPES[base.intent]);
  const tips: string[] = [];
  let boostGraph = ['email', 'phone', 'order_id', 'payment_ref', 'object_id'].includes(base.intent);

  for (const rule of CONTEXT_RULES) {
    if (rule.pattern.test(lower)) {
      keywords.push(...rule.keywords);
      rule.scope.forEach((s) => scopeSet.add(s));
      if (rule.tip && !tips.includes(rule.tip)) tips.push(rule.tip);
      if (rule.boostGraph) boostGraph = true;
    }
  }

  let summary = INTENT_SUMMARIES[base.intent](q);
  if (keywords.includes('payment') && keywords.includes('order')) {
    summary = 'Payment issue on an order — showing order, seller, method, and transactions';
  } else if (keywords.includes('dispute')) {
    summary = 'Dispute or complaint — showing case, order, buyer, and seller';
  } else if (keywords.includes('seller') && base.intent === 'phone') {
    summary = 'Phone lookup — seller account, orders, and payouts';
  }

  return {
    intent: base.intent,
    intentLabel: base.label,
    normalized: q,
    summary,
    searchScope: Array.from(scopeSet),
    tips: tips.slice(0, 3),
    keywords,
    allowGraphExpansion: boostGraph,
  };
}

export const INTELLIGENCE_EXAMPLE_QUERIES = [
  { label: 'Order #', value: 'ORD-', hint: 'Order reference' },
  { label: 'Customer phone', value: '+233', hint: 'Phone' },
  { label: 'Payment ref', value: 'flw_', hint: 'Flutterwave' },
  { label: 'Seller email', value: '@', hint: 'Email' },
] as const;
