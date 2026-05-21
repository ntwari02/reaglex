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
} from 'lucide-react';

export const ORDER_STATUSES = ['pending', 'processing', 'packed', 'shipped', 'delivered'];

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
};

export function enrichNotification(row) {
  const type = row?.type || 'system';
  const base = { ...row, type };
  if (type === 'order') {
    const orderStatus = parseOrderStatus(base);
    return {
      ...base,
      orderStatus,
      progress: getOrderProgress(orderStatus),
    };
  }
  return base;
}

export function getTypeMeta(type) {
  return TYPE_META[type] || TYPE_META.system;
}
