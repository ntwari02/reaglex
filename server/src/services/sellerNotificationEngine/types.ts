export type SellerNotificationEvent =
  | 'new_order'
  | 'shipping_delay'
  | 'shipping_soon'
  | 'return_opened'
  | 'dispute_opened'
  | 'payout_received'
  | 'funds_released'
  | 'order_refunded'
  | 'order_cancelled'
  | 'low_stock'
  | 'new_review'
  | 'new_message'
  | 'subscription_upgraded'
  | 'subscription_renewed'
  | 'subscription_plan_changed'
  | 'subscription_payment_failed'
  | 'subscription_limit_reached';

/** Stripe / Notion / Linear-style tones */
export type SellerNotificationTone =
  | 'soft'
  | 'medium'
  | 'operational'
  | 'reassuring'
  | 'clear-operational';

export interface SellerNotificationContext {
  sellerId: string;
  orderId?: string;
  orderNumber?: string;
  caseNumber?: string;
  disputeNumber?: string;
  amount?: number;
  currency?: string;
  affectedCount?: number;
  productImages?: string[];
  productNames?: string[];
  hoursSinceUpdate?: number;
  daysSinceShipped?: number;
  /** Seller recently viewed or acted on this order/thread */
  sellerActiveOnOrder?: boolean;
  reminderCount?: number;
  planName?: string;
  previousPlanName?: string;
  renewalDate?: string;
  /** Short preview for buyer messages */
  messagePreview?: string;
}

export interface SellerNotificationVisualStyle {
  showProductPreview: boolean;
  compact: boolean;
  thumbnailCount: number;
}

export interface SellerNotificationCopy {
  title: string;
  message: string;
  tone: SellerNotificationTone;
  priority: 'low' | 'medium' | 'high';
  actionLabel: string;
  deepLink: string;
  visualStyle: SellerNotificationVisualStyle;
  inboxType: 'info' | 'warning' | 'success' | 'system_announcement';
  source: 'gemini' | 'fallback';
}

/** Strict JSON shape from Gemini */
export interface SellerNotificationGeminiPayload {
  title: string;
  message: string;
  tone: string;
  priority: 'low' | 'medium' | 'high';
  actionLabel: string;
  deepLink: string;
  visualStyle: SellerNotificationVisualStyle;
}
