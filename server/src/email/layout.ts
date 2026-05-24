/**
 * Email-safe layout shell — table-based, inline styles, responsive media queries.
 */
import { toAbsoluteEmailUrl } from './emailUrls';

export const BRAND = {
  primary: '#059669',
  primaryDark: '#047857',
  accent: '#f97316',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#f3f4f6',
  card: '#ffffff',
};

export function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type EmailAccent = 'brand' | 'success' | 'warning' | 'danger' | 'promo' | 'neutral';

const ACCENT_COLORS: Record<EmailAccent, { bar: string; badge: string; badgeText: string }> = {
  brand: { bar: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`, badge: '#d1fae5', badgeText: '#065f46' },
  success: { bar: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', badge: '#d1fae5', badgeText: '#065f46' },
  warning: { bar: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', badge: '#fef3c7', badgeText: '#92400e' },
  danger: { bar: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', badge: '#fee2e2', badgeText: '#991b1b' },
  promo: { bar: `linear-gradient(135deg, ${BRAND.accent} 0%, #ea580c 100%)`, badge: '#ffedd5', badgeText: '#9a3412' },
  neutral: { bar: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)', badge: '#f3f4f6', badgeText: '#374151' },
};

export const RESPONSIVE_HEAD = `
<style type="text/css">
  body { margin:0 !important; padding:0 !important; width:100% !important; -webkit-text-size-adjust:100%; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
  @media only screen and (max-width: 620px) {
    .email-container { width:100% !important; max-width:100% !important; }
    .stack-column { display:block !important; width:100% !important; max-width:100% !important; padding-left:0 !important; padding-right:0 !important; }
    .product-col-pad { padding:0 0 16px 0 !important; }
    .product-img { height:200px !important; max-height:200px !important; }
    .btn-full { display:block !important; width:100% !important; text-align:center !important; box-sizing:border-box !important; }
    .hide-mobile { display:none !important; }
  }
</style>`;

export function emailButton(href: string, label: string, variant: 'primary' | 'dark' = 'primary'): string {
  const safeHref = toAbsoluteEmailUrl(href);
  const bg =
    variant === 'dark'
      ? 'background:#111827;'
      : `background:linear-gradient(135deg, ${BRAND.accent} 0%, #ea580c 100%);`;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto;">
  <tr>
    <td align="center" style="border-radius:12px;${bg}">
      <a href="${escapeHtml(safeHref)}" class="btn-full" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:700;color:#ffffff !important;text-decoration:none;border-radius:12px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function emailFooter(appName: string, note?: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:24px 8px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};border-top:1px solid ${BRAND.border};">
      <p style="margin:0 0 8px;font-weight:600;color:#374151;">${escapeHtml(appName)}</p>
      ${note ? `<p style="margin:0;">${escapeHtml(note)}</p>` : ''}
      <p style="margin:12px 0 0;">You received this because of activity on your account. Manage notifications in your account settings.</p>
    </td>
  </tr>
</table>`;
}

export type LayoutOptions = {
  appName: string;
  preheader?: string;
  headline: string;
  subtitle?: string;
  accent?: EmailAccent;
  bodyHtml: string;
  footerNote?: string;
};

export function renderEmailDocument(options: LayoutOptions): string {
  const appName = escapeHtml(options.appName);
  const headline = escapeHtml(options.headline);
  const subtitle = options.subtitle ? `<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.92);line-height:1.4;">${escapeHtml(options.subtitle)}</p>` : '';
  const accent = ACCENT_COLORS[options.accent || 'brand'];
  const preheader = options.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(options.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${headline}</title>
  ${RESPONSIVE_HEAD}
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:${accent.bar};border-radius:16px 16px 0 0;padding:28px 24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${appName}</p>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.25;letter-spacing:-0.02em;">${headline}</h1>
              ${subtitle}
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 16px 16px;padding:32px 24px 24px;">
              ${options.bodyHtml}
              ${emailFooter(options.appName, options.footerNote)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
