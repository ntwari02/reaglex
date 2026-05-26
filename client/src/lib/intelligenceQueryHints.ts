/** Client-side mirror of server query understanding — instant feedback while typing (no AI). */

export type LocalQueryIntent =
  | 'email'
  | 'phone'
  | 'order_id'
  | 'payment_ref'
  | 'plate'
  | 'object_id'
  | 'general';

export interface LocalQueryUnderstanding {
  intent: LocalQueryIntent;
  intentLabel: string;
  summary: string;
  searchScope: string[];
  tips: string[];
  keywords: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_RE = /^\+?[\d\s\-().]{8,20}$/;
const ORDER_RE = /^(?:#?)?(?:ORD|ORDER)[\s\-#]?(\w+)$/i;
const PAYMENT_RE = /^(?:#?)?(?:PAY|PAYMENT|TXN)[\s\-#]?(\w+)$/i;
const PLATE_RE = /^[A-Z]{2,4}[\s\-]?\d{2,4}[A-Z]{0,3}$/i;
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

function classifyLocal(raw: string): { intent: LocalQueryIntent; label: string } {
  const q = raw.trim();
  const lower = q.toLowerCase();
  if (!q) return { intent: 'general', label: 'Search anything' };
  if (OBJECT_ID_RE.test(q)) return { intent: 'object_id', label: 'Record ID' };
  if (EMAIL_RE.test(q)) return { intent: 'email', label: 'Email address' };
  const digits = q.replace(/\D/g, '');
  if (PHONE_RE.test(q) && digits.length >= 8) return { intent: 'phone', label: 'Phone number' };
  if (ORDER_RE.test(q) || /^ord[\w\-]+$/i.test(q.replace(/\s/g, '')))
    return { intent: 'order_id', label: 'Order reference' };
  if (PAYMENT_RE.test(q) || lower.includes('flutterwave') || lower.startsWith('flw_'))
    return { intent: 'payment_ref', label: 'Payment reference' };
  if (PLATE_RE.test(q.replace(/\s/g, ''))) return { intent: 'plate', label: 'Vehicle plate' };
  return { intent: 'general', label: 'General search' };
}

const CONTEXT: Array<{ re: RegExp; keywords: string[]; scope: string[]; tip: string }> = [
  { re: /\b(payment|paid|refund|flutterwave|momo|escrow)\b/i, keywords: ['payment'], scope: ['Payments'], tip: 'Links to orders & sellers' },
  { re: /\b(dispute|chargeback|complaint)\b/i, keywords: ['dispute'], scope: ['Disputes'], tip: 'Shows disputes + tickets' },
  { re: /\b(order|tracking|delivery|shipped)\b/i, keywords: ['order'], scope: ['Orders'], tip: 'Order + payment trail' },
  { re: /\b(seller|store|vendor)\b/i, keywords: ['seller'], scope: ['Sellers'], tip: 'Seller + products' },
];

export function explainQueryLocally(raw: string): LocalQueryUnderstanding {
  const base = classifyLocal(raw);
  const q = raw.trim();
  const scope = new Set<string>();
  const tips: string[] = [];
  const keywords: string[] = [];

  if (base.intent === 'email') scope.add('Users').add('Orders');
  if (base.intent === 'phone') scope.add('Users').add('Orders').add('Sellers');
  if (base.intent === 'order_id') scope.add('Orders').add('Payments');
  if (base.intent === 'payment_ref') scope.add('Payments').add('Orders');
  if (base.intent === 'general') ['Users', 'Orders', 'Payments'].forEach((s) => scope.add(s));

  for (const c of CONTEXT) {
    if (c.re.test(q)) {
      c.keywords.forEach((k) => keywords.push(k));
      c.scope.forEach((s) => scope.add(s));
      if (!tips.includes(c.tip)) tips.push(c.tip);
    }
  }

  let summary = 'Type a name, phone, email, order #, or payment reference';
  if (q.length >= 2) {
    if (base.intent === 'phone') summary = 'Will find accounts & orders with this phone';
    else if (base.intent === 'email') summary = 'Will find users, sellers & orders for this email';
    else if (base.intent === 'order_id') summary = 'Will open this order with seller, buyer & payments';
    else if (base.intent === 'payment_ref') summary = 'Will trace payment → order → seller';
    else if (keywords.includes('payment') && keywords.includes('order'))
      summary = 'Payment + order context — full transaction dossier';
    else if (keywords.includes('dispute')) summary = 'Dispute lookup — case, order & parties';
    else summary = `Searching platform for “${q.length > 36 ? q.slice(0, 36) + '…' : q}”`;
  }

  return {
    intent: base.intent,
    intentLabel: base.label,
    summary,
    searchScope: Array.from(scope),
    tips: tips.slice(0, 2),
    keywords,
  };
}

export const EXAMPLE_QUERIES = [
  { label: 'Order ID', value: 'ORD-' },
  { label: 'Phone', value: '+1' },
  { label: 'Payment', value: 'flw_' },
  { label: 'Email', value: 'customer@' },
] as const;
