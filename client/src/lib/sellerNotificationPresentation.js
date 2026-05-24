import {
  Package,
  Truck,
  RotateCcw,
  AlertCircle,
  Wallet,
  MessageSquare,
  Star,
  Bell,
  Boxes,
} from 'lucide-react';

import { pickOsVariant, pickOsGlow } from './osNotificationVariants';

const CATEGORY_META = {
  new_order: {
    Icon: Package,
    label: 'Order',
    accent: 'var(--brand-primary)',
    surface: 'var(--brand-tint)',
  },
  shipping_delay: {
    Icon: Truck,
    label: 'Shipping',
    accent: 'var(--notif-type-deal, #f59e0b)',
    surface: 'color-mix(in srgb, #f59e0b 12%, var(--card-bg))',
  },
  shipping_soon: {
    Icon: Truck,
    label: 'Shipping',
    accent: 'var(--brand-primary)',
    surface: 'var(--brand-tint)',
  },
  return_opened: {
    Icon: RotateCcw,
    label: 'Return',
    accent: 'var(--notif-type-review, #a78bfa)',
    surface: 'color-mix(in srgb, #a78bfa 12%, var(--card-bg))',
  },
  dispute_opened: {
    Icon: AlertCircle,
    label: 'Dispute',
    accent: 'var(--badge-error-text, #dc2626)',
    surface: 'var(--badge-error-bg)',
  },
  payout_received: {
    Icon: Wallet,
    label: 'Payout',
    accent: '#10b981',
    surface: 'color-mix(in srgb, #10b981 12%, var(--card-bg))',
  },
  funds_released: {
    Icon: Wallet,
    label: 'Funds',
    accent: '#10b981',
    surface: 'color-mix(in srgb, #10b981 12%, var(--card-bg))',
  },
  order_refunded: {
    Icon: RotateCcw,
    label: 'Refund',
    accent: 'var(--text-muted)',
    surface: 'var(--bg-secondary)',
  },
  low_stock: {
    Icon: Boxes,
    label: 'Inventory',
    accent: 'var(--notif-type-deal, #f59e0b)',
    surface: 'color-mix(in srgb, #f59e0b 10%, var(--card-bg))',
  },
  new_review: {
    Icon: Star,
    label: 'Review',
    accent: 'var(--notif-type-review, #a78bfa)',
    surface: 'color-mix(in srgb, #a78bfa 12%, var(--card-bg))',
  },
  new_message: {
    Icon: MessageSquare,
    label: 'Message',
    accent: 'var(--notif-type-message, #3b82f6)',
    surface: 'color-mix(in srgb, #3b82f6 12%, var(--card-bg))',
  },
};

const TYPE_FALLBACK = {
  warning: CATEGORY_META.dispute_opened,
  error: CATEGORY_META.dispute_opened,
  success: CATEGORY_META.new_order,
  info: { Icon: Bell, label: 'Update', accent: 'var(--brand-primary)', surface: 'var(--brand-tint)' },
  system_announcement: { Icon: Bell, label: 'Update', accent: 'var(--brand-primary)', surface: 'var(--brand-tint)' },
  policy_update: { Icon: Bell, label: 'Policy', accent: 'var(--text-muted)', surface: 'var(--bg-secondary)' },
};

function resolveMediaUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  const base = String(import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
  if (!base) return raw;
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export function enrichSellerNotification(row, userId) {
  const readBy = row?.readBy || [];
  const unread = userId ? !readBy.some((id) => String(id) === String(userId)) : true;
  const category = row?.metadata?.category || row?.category || 'system_announcement';
  const meta = CATEGORY_META[category] || TYPE_FALLBACK[row?.type] || TYPE_FALLBACK.info;
  const thumbs = (row?.metadata?.productThumbnails || row?.productThumbnails || [])
    .map((src) => resolveMediaUrl(src))
    .filter(Boolean);
  const visualStyle = row?.metadata?.visualStyle || row?.visualStyle || {};
  const id = String(row._id || row.id || '');
  const variant = row?.metadata?.visualVariant || pickOsVariant(`${id}:${category}:${row?.createdAt || ''}`);
  const glow = pickOsGlow(`${id}-glow`);

  return {
    id: String(row._id || row.id),
    title: row.title || 'Update',
    message: row.message || '',
    createdAt: row.createdAt,
    unread,
    category,
    tone: row?.metadata?.tone || row?.tone,
    priority: row.priority || 'medium',
    actionLink: row.actionUrl || row.actionLink,
    actionLabel: row.actionText || row.actionLabel || 'Open',
    meta,
    osVariant: variant,
    osGlow: glow,
    thumbnails: Array.isArray(thumbs) ? thumbs.filter(Boolean).slice(0, 3) : [],
    showProductPreview: Boolean(visualStyle.showProductPreview && thumbs.length),
    compact: visualStyle.compact !== false,
    type: row.type,
  };
}

export function formatSellerNotificationTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
