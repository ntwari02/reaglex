import type { EmailCategory } from './copyEngine';
import { timeGreeting, pickCta } from './copyEngine';
import {
  renderAction,
  renderBodyParagraphs,
  renderMetaCard,
  renderProductGrid,
  type ProductCardInput,
} from './components';
import { renderEmailDocument, type EmailAccent } from './layout';
import { toAbsoluteEmailUrl } from './emailUrls';

export type RichNotificationOptions = {
  appName?: string;
  name: string;
  category: EmailCategory;
  headline: string;
  message: string;
  actionUrl: string;
  actionLabel?: string;
  preheader?: string;
  accent?: EmailAccent;
  metaRows?: Array<{ label: string; value: string }>;
  products?: ProductCardInput[];
  footerNote?: string;
};

const CATEGORY_ACCENT: Partial<Record<EmailCategory, EmailAccent>> = {
  order: 'success',
  payment: 'brand',
  shipping: 'brand',
  refund: 'warning',
  return: 'warning',
  marketplace: 'neutral',
  message: 'brand',
  recommendation: 'promo',
  cart: 'promo',
  subscription: 'brand',
  billing: 'neutral',
  live: 'promo',
  auth_security: 'danger',
};

export function getRichNotificationEmailHtml(options: RichNotificationOptions): string {
  const appName = options.appName || 'Spacilly';
  const seed = `${options.category}:${options.headline}:${options.name}`;
  const greeting = timeGreeting(options.name);
  const cta = options.actionLabel || pickCta(options.category, seed);
  const accent = options.accent || CATEGORY_ACCENT[options.category] || 'brand';

  const bodyParts = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">${greeting},</p>`,
    renderBodyParagraphs([options.message]),
  ];

  if (options.metaRows?.length) {
    bodyParts.push(renderMetaCard(options.metaRows));
  }

  if (options.products?.length) {
    bodyParts.push(renderProductGrid(options.products));
  }

  bodyParts.push(renderAction(toAbsoluteEmailUrl(options.actionUrl), cta));

  return renderEmailDocument({
    appName,
    preheader: options.preheader || options.message.slice(0, 120),
    headline: options.headline,
    accent,
    bodyHtml: bodyParts.join(''),
    footerNote: options.footerNote,
  });
}
