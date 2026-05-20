export type NotificationVariant =
  | 'order_confirmed'
  | 'shipping'
  | 'out_for_delivery'
  | 'delivered'
  | 'live'
  | 'upcoming'
  | 'ai'
  | 'flash_sale'
  | 'escrow'
  | 'security'
  | 'system'
  | 'social'
  | 'deal'
  | 'message';

export type NotificationFilterId =
  | 'all'
  | 'unread'
  | 'orders'
  | 'deals'
  | 'live'
  | 'ai'
  | 'system';

export type TimelineGroup = 'NOW' | 'TODAY' | 'EARLIER' | 'THIS_WEEK' | 'PROMOTIONS' | 'LIVE_EVENTS';

export interface RawBuyerNotification {
  id: string;
  type: 'order' | 'message' | 'system' | 'deal' | 'review' | string;
  title: string;
  message: string;
  time: string;
  createdAt?: string;
  unread: boolean;
  orderId?: string;
  threadId?: string;
  productName?: string;
  productPrice?: number;
  status?: string;
  countdownEnd?: number;
}

export interface NormalizedNotification extends RawBuyerNotification {
  variant: NotificationVariant;
  timeline: TimelineGroup;
  progress?: number;
  viewerCount?: string;
  countdownEnd?: number;
  teaserImage?: string;
  metaLabel?: string;
}

export const FILTER_TABS: { id: NotificationFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'orders', label: 'Orders' },
  { id: 'deals', label: 'Deals' },
  { id: 'live', label: 'Live' },
  { id: 'ai', label: 'AI' },
];

/** Full-page mobile center — matches All Notifications mockup tabs */
export const CENTER_FILTER_TABS: { id: NotificationFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'deals', label: 'Deals' },
  { id: 'system', label: 'System' },
  { id: 'ai', label: 'AI' },
];

export const DRAWER_FILTER_TABS: { id: NotificationFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'deals', label: 'Deals' },
  { id: 'live', label: 'Live' },
  { id: 'ai', label: 'AI' },
];
