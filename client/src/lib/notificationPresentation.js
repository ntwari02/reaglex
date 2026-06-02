import {
  Package,
  MessageSquare,
  Bell,
  Tag,
  Star,
  AlertCircle,
  Truck,
  CheckCircle2,
  Box,
  Clock3,
  Radio,
  Sparkles,
  Shield,
  ShoppingBag,
} from 'lucide-react';

export const ORDER_STATUSES = ['pending', 'processing', 'packed', 'shipped', 'delivered'];

import { pickOsVariant, pickOsGlow } from './osNotificationVariants';

function resolveMediaUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  const base = String(import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
  if (!base) return raw;
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

const MESSAGE_TO_STATUS = {
  'order placed': 'pending',
  'order is being processed': 'processing',
  'order packed': 'packed',
  'order shipped': 'shipped',
  'order delivered': 'delivered',
  'order cancelled': 'cancelled',
};

export function parseOrderStatus(notification) {
  if (notification?.orderStatus) return notification.orderStatus;
  const msg = String(notification?.message || '').toLowerCase();
  for (const [key, status] of Object.entries(MESSAGE_TO_STATUS)) {
    if (msg.includes(key)) return status;
  }
  return 'processing';
}

export function getOrderProgress(status) {
  if (status === 'cancelled') {
    return { steps: ORDER_STATUSES, currentIndex: -1, percent: 0, cancelled: true };
  }
  const idx = ORDER_STATUSES.indexOf(status);
  const currentIndex = idx >= 0 ? idx : 0;
  const percent = Math.round(((currentIndex + 1) / ORDER_STATUSES.length) * 100);
  return { steps: ORDER_STATUSES, currentIndex, percent, cancelled: false };
}

const STEP_LABELS = {
  pending: 'Placed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const STEP_ICONS = {
  pending: Clock3,
  processing: Box,
  packed: Package,
  shipped: Truck,
  delivered: CheckCircle2,
};

export function getOrderStepPresentation(step) {
  return {
    label: STEP_LABELS[step] || step,
    Icon: STEP_ICONS[step] || Package,
  };
}

export const TYPE_META = {
  order: {
    Icon: Package,
    label: 'Order',
    accent: 'var(--brand-primary)',
    surface: 'var(--brand-tint)',
    border: 'var(--brand-border-subtle)',
  },
  message: {
    Icon: MessageSquare,
    label: 'Message',
    accent: 'var(--notif-type-message)',
    surface: 'color-mix(in srgb, var(--notif-type-message) 12%, var(--card-bg))',
    border: 'color-mix(in srgb, var(--notif-type-message) 28%, transparent)',
  },
  system: {
    Icon: Bell,
    label: 'System',
    accent: 'var(--notif-type-system)',
    surface: 'color-mix(in srgb, var(--notif-type-system) 12%, var(--card-bg))',
    border: 'color-mix(in srgb, var(--notif-type-system) 28%, transparent)',
  },
  deal: {
    Icon: Tag,
    label: 'Deal',
    accent: 'var(--notif-type-deal)',
    surface: 'color-mix(in srgb, var(--notif-type-deal) 12%, var(--card-bg))',
    border: 'color-mix(in srgb, var(--notif-type-deal) 28%, transparent)',
  },
  review: {
    Icon: Star,
    label: 'Review',
    accent: 'var(--notif-type-review)',
    surface: 'color-mix(in srgb, var(--notif-type-review) 12%, var(--card-bg))',
    border: 'color-mix(in srgb, var(--notif-type-review) 28%, transparent)',
  },
  alert: {
    Icon: AlertCircle,
    label: 'Alert',
    accent: 'var(--badge-error-text)',
    surface: 'var(--badge-error-bg)',
    border: 'var(--badge-error-border)',
  },
  live: {
    Icon: Radio,
    label: 'Live',
    accent: 'var(--brand-primary)',
    surface: 'var(--brand-tint)',
    border: 'var(--brand-border-subtle)',
  },
  ai: {
    Icon: Sparkles,
    label: 'AI Pick',
    accent: 'var(--rxn-glow-teal, #2dd4bf)',
    surface: 'color-mix(in srgb, #2dd4bf 14%, var(--card-bg))',
    border: 'color-mix(in srgb, #2dd4bf 30%, transparent)',
    glow: 'color-mix(in srgb, #2dd4bf 45%, transparent)',
  },
  security: {
    Icon: Shield,
    label: 'Security',
    accent: 'var(--rxn-glow-blue, #60a5fa)',
    surface: 'color-mix(in srgb, #60a5fa 12%, var(--card-bg))',
    border: 'color-mix(in srgb, #60a5fa 28%, transparent)',
    glow: 'color-mix(in srgb, #60a5fa 40%, transparent)',
  },
};

export function formatDealCountdown(ms) {
  if (!ms || ms <= 0) return '00h : 00m : 00s';
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}h : ${String(m).padStart(2, '0')}m : ${String(s).padStart(2, '0')}s`;
}

function inferPresentationType(row) {
  const type = row?.type || 'system';
  const category = row?.metadata?.category;
  if (category === 'live_now' || type === 'live') return 'live';
  if (category === 'return_submitted' || category === 'return_update') return 'alert';
  if (category === 'new_message' || type === 'message') return 'message';
  const blob = `${row?.title || ''} ${row?.message || ''}`.toLowerCase();
  if (type === 'system' && (blob.includes('security') || blob.includes('login'))) return 'security';
  if (blob.includes('ai pick') || blob.includes('picked for you') || row?.aiMeta) return 'ai';
  if (type === 'order' && blob.includes('confirmed')) return 'order';
  return type;
}

export function enrichNotification(row) {
  const rawType = row?.type || 'system';
  const presentationType = inferPresentationType(row);
  const id = String(row.id || row._id || '');
  const osVariant =
    row?.metadata?.visualVariant ||
    row?.osVariant ||
    pickOsVariant(`${id}:${rawType}:${row?.createdAt || ''}`);
  const osGlow = row?.osGlow || pickOsGlow(`${id}-glow`);
  const visualStyle = row?.metadata?.visualStyle || row?.visualStyle || {};
  const thumbnails = (
    row?.productThumbnails ||
    row?.metadata?.productThumbnails ||
    row?.aiThumbs ||
    row?.productImages ||
    []
  )
    .map((src) => resolveMediaUrl(src))
    .filter(Boolean);
  const base = {
    ...row,
    type: rawType,
    presentationType,
    osVariant,
    osGlow,
    thumbnails: Array.isArray(thumbnails) ? thumbnails.filter(Boolean).slice(0, 3) : [],
    actionUrl: row.actionUrl || row.actionLink,
    actionText: row.actionText || row.actionLabel,
    visualStyle,
    showProductPreview: Boolean(
      visualStyle.showProductPreview !== false && thumbnails.length > 0,
    ),
    compact: visualStyle.compact !== false,
  };
  const blob = `${base.title || ''} ${base.message || ''}`.toLowerCase();

  if (rawType === 'order') {
    const orderStatus = parseOrderStatus(base);
    const statusLabel =
      orderStatus === 'shipped'
        ? 'In transit'
        : orderStatus === 'delivered'
          ? 'Delivered'
          : orderStatus === 'processing'
            ? 'Processing'
            : blob.includes('confirmed')
              ? 'Confirmed'
              : 'Order update';
    return {
      ...base,
      orderStatus,
      statusLabel,
      progress: getOrderProgress(orderStatus),
      statusTone:
        orderStatus === 'shipped' ? 'transit' : orderStatus === 'delivered' ? 'success' : 'confirmed',
    };
  }

  if (presentationType === 'ai') {
    return {
      ...base,
      aiThumbs: row?.aiThumbs || row?.productImages || [],
    };
  }

  if (rawType === 'deal') {
    const endsAt = row?.endsAt || row?.dealEndsAt || Date.now() + 2 * 3600000 + 18 * 60000;
    return { ...base, dealEndsAt: endsAt };
  }

  return base;
}

export function getTypeMeta(type, presentationType) {
  return TYPE_META[presentationType || type] || TYPE_META[type] || TYPE_META.system;
}

/** Primary CTA label for detail panel and cards. */
export function getNotificationActionLabel(n, t) {
  if (!n) return '';
  if (n.actionText) return String(n.actionText);
  const tr = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);
  if (n.type === 'order') return tr('notifications.actions.trackOrder', 'Track order');
  if (n.type === 'live') return tr('notifications.actions.watchLive', 'Watch live');
  if (n.type === 'message') return tr('notifications.actions.reply', 'Reply');
  if (n.type === 'deal') return tr('notifications.actions.shopNow', 'Shop now');
  if (n.presentationType === 'ai') return tr('notifications.actions.shopNow', 'View picks');
  if (n.type === 'review') return tr('notifications.actions.rateNow', 'Rate now');
  if (n.actionUrl) return tr('notifications.actions.open', 'Open');
  return '';
}

/** Resolve in-app path when user taps a notification row. */
export function getNotificationHref(n) {
  if (!n) return null;
  if (n.actionUrl) {
    const url = String(n.actionUrl);
    if (url.startsWith('/')) return url;
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      /* ignore */
    }
  }
  if (n.type === 'live') {
    if (n.liveSessionId) return `/live/${n.liveSessionId}`;
    const url = String(n.actionUrl || '');
    const m = url.match(/\/live\/([a-f0-9]{24})/i);
    if (m) return `/live/${m[1]}`;
  }
  if (n.type === 'order' && n.orderId) return `/track/${n.orderId}`;
  if (n.type === 'message') {
    if (n.threadId) return `/account?tab=messages&thread=${n.threadId}`;
    return '/account?tab=messages';
  }
  if (n.type === 'deal') return '/search?sort=discount';
  if (n.type === 'review') return '/account?tab=reviews';
  return null;
}
