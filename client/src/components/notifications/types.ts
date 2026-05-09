import type { LucideIcon } from 'lucide-react';

export type NotificationChannel = 'email' | 'in-app' | 'sms' | 'push' | 'system-alert';

export type Recipient = {
  email: string;
  fullName?: string;
};

export type TargetGroupOption = 'All Customers' | 'All Sellers' | 'Specific User' | 'Custom Segment';

export type TemplateCategory = 'Promo' | 'Transactional' | 'Alert' | 'Welcome';

export type NotificationTemplate = {
  id: string;
  name: string;
  snippet: string;
  subject?: string;
  content: string;
  type: string;
  category: TemplateCategory;
  updatedAt?: string;
};

export type NotificationHistoryItem = {
  id: string;
  title: string;
  channel: NotificationChannel;
  sentAt: string;
  status: 'sent' | 'queued' | 'failed';
  subject: string;
  body: string;
  recipientCount: number;
};

export type ReadabilityResult = {
  fleschScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  estimatedReadMinutes: number;
  spamWarnings: string[];
};

export type ChannelTabDefinition = {
  id: NotificationChannel;
  label: string;
  icon: LucideIcon;
};

export type ToastType = 'success' | 'error';

export type ToastState = {
  id: number;
  message: string;
  type: ToastType;
  persist?: boolean;
};
