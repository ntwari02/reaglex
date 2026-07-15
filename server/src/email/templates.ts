/**
 * HTML email templates — responsive layout, varied copy via copyEngine.
 */
import { timeGreeting, pickCta } from './copyEngine';
import {
  renderAction,
  renderBodyParagraphs,
  renderMetaCard,
  renderOtpBlock,
  renderProductGrid,
  renderUnsubscribeLinks,
  type ProductCardInput,
} from './components';
import { renderEmailDocument, type EmailAccent } from './layout';
import { toAbsoluteEmailUrl } from './emailUrls';
import { getRichNotificationEmailHtml } from './notificationEmail';

export { getRichNotificationEmailHtml } from './notificationEmail';
export type { RichNotificationOptions } from './notificationEmail';
export type { ProductCardInput } from './components';

function doc(appName: string, headline: string, accent: EmailAccent, body: string, opts?: { subtitle?: string; preheader?: string; footerNote?: string }) {
  return renderEmailDocument({
    appName,
    headline,
    subtitle: opts?.subtitle,
    preheader: opts?.preheader,
    accent,
    bodyHtml: body,
    footerNote: opts?.footerNote,
  });
}

export function getWelcomeEmailHtml(options: { name: string; loginUrl: string; appName?: string }) {
  const appName = options.appName || 'Spacilly';
  const greeting = timeGreeting(options.name);
  const intro = pickCta('auth_welcome', `welcome:${options.name}`);
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111827;">${greeting},</p>`,
    renderBodyParagraphs([
      'Welcome aboard — your account is ready. Explore sellers, track orders, and shop with escrow protection.',
      'We’re glad you’re here. Jump in whenever you’re ready.',
    ]),
    renderAction(options.loginUrl, intro),
  ].join('');
  return doc(appName, 'Welcome to the marketplace', 'brand', body, {
    preheader: 'Your account is ready — start exploring',
    footerNote: `You received this because you created an account on ${appName}.`,
  });
}

export function getVerificationEmailHtml(options: {
  name: string;
  verifyUrl: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const expires = options.expiresIn || '24 hours';
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs([
      'Please confirm your email to secure your account and unlock the full experience.',
      `This link expires in ${expires}. You can also verify with a one-time code on the sign-in page.`,
    ]),
    renderAction(options.verifyUrl, pickCta('auth_verify', options.verifyUrl)),
  ].join('');
  return doc(appName, 'Confirm your email', 'brand', body, { preheader: 'One quick step to verify your address' });
}

export function getVerificationOtpEmailHtml(options: {
  name: string;
  code: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const expires = options.expiresIn || '10 minutes';
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs(['Enter this code on the verification screen. Do not share it with anyone.']),
    renderOtpBlock(options.code, 'verify'),
    `<p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Expires in <strong>${expires}</strong></p>`,
  ].join('');
  return doc(appName, 'Your verification code', 'brand', body);
}

export function getPasswordResetEmailHtml(options: {
  name: string;
  resetUrl: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const expires = options.expiresIn || '1 hour';
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs([
      'We received a request to reset your password. If you made this request, use the button below.',
      `The link expires in ${expires}. If you did not request a reset, ignore this email — your password will stay the same.`,
    ]),
    renderAction(options.resetUrl, pickCta('auth_reset', options.resetUrl)),
  ].join('');
  return doc(appName, 'Reset your password', 'warning', body, { preheader: 'Password reset requested' });
}

export function getPasswordResetOtpEmailHtml(options: {
  name: string;
  code: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const expires = options.expiresIn || '15 minutes';
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs(['Use this code on the password reset screen.']),
    renderOtpBlock(options.code, 'reset'),
    `<p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Expires in <strong>${expires}</strong></p>`,
  ].join('');
  return doc(appName, 'Password reset code', 'warning', body);
}

export function getLoginNotificationEmailHtml(options: {
  name: string;
  deviceInfo: string;
  ipAddress: string;
  role: string;
  appName?: string;
  loginUrl?: string;
  signedInAt?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const loginUrl = options.loginUrl || '#';
  const when = options.signedInAt || new Date().toUTCString();
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs(['Your account was signed in successfully. If this was you, no action is needed.']),
    renderMetaCard([
      { label: 'When', value: when },
      { label: 'Role', value: options.role },
      { label: 'Device', value: options.deviceInfo },
      { label: 'IP address', value: options.ipAddress },
    ]),
    renderBodyParagraphs(['If this wasn’t you, change your password and contact support immediately.']),
    renderAction(loginUrl, 'Review account', 'dark'),
  ].join('');
  return doc(appName, 'New sign-in detected', 'success', body, { footerNote: 'Automated security notice.' });
}

export function getSecurityAlertEmailHtml(options: {
  name: string;
  message: string;
  appName?: string;
  loginUrl?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const loginUrl = options.loginUrl || '#';
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs([options.message, 'Secure your account if you did not authorize this activity.']),
    renderAction(loginUrl, 'Secure my account', 'dark'),
  ].join('');
  return doc(appName, 'Security alert', 'danger', body);
}

export function getDeviceApprovalEmailHtml(options: {
  name: string;
  approveUrl: string;
  deviceInfo: string;
  ipAddress: string;
  appName?: string;
  expiresIn?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const expires = options.expiresIn || '15 minutes';
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs([
      'A new sign-in was requested from another device. Approve only if you recognize this activity.',
      `The approval link expires in ${expires}.`,
    ]),
    renderMetaCard([
      { label: 'Device', value: options.deviceInfo },
      { label: 'IP address', value: options.ipAddress },
    ]),
    renderAction(options.approveUrl, 'Approve this device'),
  ].join('');
  return doc(appName, 'Approve new device', 'warning', body);
}

/** Legacy generic notification — prefer getRichNotificationEmailHtml */
export function getNotificationEmailHtml(options: {
  subject: string;
  body: string;
  appName?: string;
  actionUrl?: string;
  actionLabel?: string;
  name?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const plain = options.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return getRichNotificationEmailHtml({
    appName,
    name: options.name || 'there',
    category: 'general',
    headline: options.subject,
    message: plain,
    actionUrl: options.actionUrl || '#',
    actionLabel: options.actionLabel,
    preheader: plain.slice(0, 100),
  });
}

export function getRecommendationDealsEmailHtml(options: {
  appName?: string;
  name: string;
  title: string;
  headline?: string;
  intro?: string;
  shopCtaLabel?: string;
  products: ProductCardInput[];
  unsubscribeUrl: string;
  preferencesUrl: string;
  openPixelUrl?: string;
  shopMoreUrl?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const shopUrl = options.shopMoreUrl || '/search?q=recommended';
  const shopCta = options.shopCtaLabel || pickCta('recommendation', options.name);
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs([options.intro || 'Here are personalized picks based on your recent shopping activity.']),
    renderProductGrid(options.products),
    renderAction(shopUrl, shopCta, 'dark'),
    renderUnsubscribeLinks(options.preferencesUrl, options.unsubscribeUrl),
    options.openPixelUrl
      ? `<img src="${options.openPixelUrl}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;border:0;" />`
      : '',
  ].join('');
  return doc(appName, options.headline || options.title, 'promo', body, {
    preheader: options.intro?.slice(0, 100) || 'Personalized picks inside',
    footerNote: 'Marketing email — manage preferences or unsubscribe below.',
  });
}

export function getAbandonedCartEmailHtml(options: {
  appName?: string;
  name: string;
  title: string;
  headline?: string;
  intro?: string;
  cartUrl: string;
  cartCtaLabel?: string;
  products: ProductCardInput[];
}) {
  const appName = options.appName || 'Spacilly';
  const cartCta = options.cartCtaLabel || pickCta('cart', options.name);
  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs([
      options.intro || 'You left items in your cart — they may sell out or change price.',
    ]),
    renderAction(options.cartUrl, cartCta),
    renderProductGrid(options.products),
  ].join('');
  return doc(appName, options.headline || options.title, 'promo', body, {
    preheader: 'Your saved items are waiting',
    footerNote: 'Cart reminder from your recent visit.',
  });
}

export function getSubscriptionBillingEmailHtml(options: {
  appName?: string;
  name: string;
  variant: 'activated' | 'renewed' | 'payment_failed' | 'upgraded' | 'invoice';
  planName?: string;
  amountText?: string;
  renewalDate?: string;
  actionUrl: string;
  actionLabel?: string;
}) {
  const appName = options.appName || 'Spacilly';
  const accent =
    options.variant === 'payment_failed' ? 'danger' : options.variant === 'upgraded' ? 'success' : 'brand';
  const headlines: Record<typeof options.variant, string> = {
    activated: 'Your subscription is active',
    renewed: 'Subscription renewed',
    payment_failed: 'Payment could not be processed',
    upgraded: 'Plan upgraded',
    invoice: 'New invoice available',
  };
  const intros: Record<typeof options.variant, string> = {
    activated: options.planName
      ? `Welcome to ${options.planName}. Your seller tools and limits are now unlocked.`
      : 'Your subscription is live — manage billing anytime from your dashboard.',
    renewed: options.amountText
      ? `We processed ${options.amountText} for this billing cycle.${options.renewalDate ? ` Next renewal: ${options.renewalDate}.` : ''}`
      : 'Your plan renewed successfully. Invoice details are in billing history.',
    payment_failed:
      'We could not charge your default payment method. Update billing to avoid service interruption.',
    upgraded: options.planName
      ? `You are now on ${options.planName}. New limits apply immediately.`
      : 'Your subscription tier was updated successfully.',
    invoice: 'A new invoice was added to your billing history. Download it from your subscription page.',
  };
  const rows = [];
  if (options.planName) rows.push({ label: 'Plan', value: options.planName });
  if (options.amountText) rows.push({ label: 'Amount', value: options.amountText });
  if (options.renewalDate) rows.push({ label: 'Next renewal', value: options.renewalDate });

  const body = [
    `<p style="margin:0 0 12px;font-size:16px;font-weight:600;">${timeGreeting(options.name)},</p>`,
    renderBodyParagraphs([intros[options.variant]]),
    rows.length ? renderMetaCard(rows) : '',
    renderAction(options.actionUrl, options.actionLabel || pickCta('subscription', options.name)),
  ].join('');
  return doc(appName, headlines[options.variant], accent, body, {
    preheader: intros[options.variant].slice(0, 100),
    footerNote: 'Subscription & billing notification.',
  });
}

export function getNewsletterWelcomeEmailHtml(options: { shopUrl: string; appName?: string }) {
  const appName = options.appName || 'Spacilly';
  const body = [
    renderBodyParagraphs([
      'Thanks for subscribing — you’ll get curated deals, new arrivals, and marketplace highlights.',
      'You can unsubscribe anytime from the link in any email.',
    ]),
    renderAction(options.shopUrl, 'Start shopping'),
  ].join('');
  return doc(appName, "You're on the list", 'brand', body);
}
