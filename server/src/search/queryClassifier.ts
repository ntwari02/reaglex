import type { QueryIntent } from './intelligenceSearch.types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_RE = /^\+?[\d\s\-().]{8,20}$/;
const ORDER_RE = /^(?:#?)?(?:ORD|ORDER)[\s\-#]?(\w+)$/i;
const PAYMENT_RE = /^(?:#?)?(?:PAY|PAYMENT|TXN)[\s\-#]?(\w+)$/i;
const PLATE_RE = /^[A-Z]{2,4}[\s\-]?\d{2,4}[A-Z]{0,3}$/i;
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export function classifyQuery(raw: string): { intent: QueryIntent; normalized: string; label: string } {
  const q = String(raw || '').trim();
  const lower = q.toLowerCase();

  if (!q) {
    return { intent: 'general', normalized: '', label: 'Search anything' };
  }

  if (OBJECT_ID_RE.test(q)) {
    return { intent: 'object_id', normalized: q, label: 'Record ID' };
  }

  if (EMAIL_RE.test(q)) {
    return { intent: 'email', normalized: lower, label: 'Email address' };
  }

  const digitsOnly = q.replace(/\D/g, '');
  if (PHONE_RE.test(q) && digitsOnly.length >= 8) {
    return { intent: 'phone', normalized: digitsOnly, label: 'Phone number' };
  }

  if (ORDER_RE.test(q) || /^ord[\w\-]+$/i.test(q.replace(/\s/g, ''))) {
    return { intent: 'order_id', normalized: q.replace(/^#/, '').toUpperCase(), label: 'Order reference' };
  }

  if (PAYMENT_RE.test(q) || lower.includes('flutterwave') || lower.startsWith('flw_')) {
    return { intent: 'payment_ref', normalized: q, label: 'Payment reference' };
  }

  if (PLATE_RE.test(q.replace(/\s/g, ''))) {
    return { intent: 'plate', normalized: q.replace(/\s/g, '').toUpperCase(), label: 'Vehicle plate' };
  }

  return { intent: 'general', normalized: q, label: 'General search' };
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
