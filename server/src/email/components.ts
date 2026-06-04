import { BRAND, escapeHtml, emailButton } from './layout';
import { toAbsoluteMediaUrl } from './emailUrls';

export type ProductCardInput = {
  id: string;
  name: string;
  imageUrl?: string;
  price: number;
  priceText?: string;
  discount?: number;
  rating?: number;
  description?: string;
  viewUrl: string;
  ctaLabel?: string;
};

const PLACEHOLDER_IMG =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14"%3ENo image%3C/text%3E%3C/svg%3E';

function formatPrice(p: ProductCardInput): string {
  if (p.priceText) return p.priceText;
  if (Number.isFinite(p.price)) return `$${Number(p.price).toFixed(2)}`;
  return '';
}

function productCardHtml(p: ProductCardInput, ctaPool: string[]): string {
  const imgRaw = p.imageUrl ? toAbsoluteMediaUrl(p.imageUrl) : '';
  const img = (imgRaw && imgRaw.startsWith('http') ? imgRaw : PLACEHOLDER_IMG).trim();
  const price = escapeHtml(formatPrice(p));
  const name = escapeHtml(p.name);
  const desc = escapeHtml(String(p.description || '').slice(0, 88));
  const discount = Number(p.discount || 0);
  const discountBadge =
    discount > 0
      ? `<span style="display:inline-block;margin-left:6px;font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:#fee2e2;color:#b91c1c;vertical-align:middle;">-${Math.round(discount)}%</span>`
      : '';
  const rating =
    p.rating != null && p.rating > 0
      ? `<p style="margin:0 0 8px;font-size:12px;color:#f59e0b;">★ ${escapeHtml(String(p.rating.toFixed(1)))}</p>`
      : '';
  const cta = escapeHtml(p.ctaLabel || ctaPool[hash(p.id) % ctaPool.length]);

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;background:#ffffff;">
  <tr>
    <td style="padding:0;line-height:0;background:#f9fafb;">
      <a href="${escapeHtml(p.viewUrl)}" style="text-decoration:none;">
        <img src="${escapeHtml(img)}" alt="${name}" width="280" height="220" class="product-img" style="display:block;width:100%;max-width:280px;height:220px;object-fit:cover;background:#f3f4f6;border:0;" />
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 14px 16px;vertical-align:top;min-height:140px;height:140px;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:${BRAND.text};line-height:1.35;max-height:2.7em;overflow:hidden;">${name}</p>
      ${rating}
      <p style="margin:0 0 10px;font-size:12px;color:${BRAND.muted};line-height:1.45;max-height:2.9em;overflow:hidden;">${desc || '&nbsp;'}</p>
      <p style="margin:0 0 12px;font-size:16px;font-weight:900;color:${BRAND.text};line-height:1.2;">${price}${discountBadge}</p>
      <a href="${escapeHtml(p.viewUrl)}" style="display:inline-block;padding:10px 14px;border-radius:10px;background:${BRAND.accent};color:#ffffff;font-weight:800;font-size:12px;text-decoration:none;">${cta}</a>
    </td>
  </tr>
</table>`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const PRODUCT_CTAS = ['View item', 'See details', 'Shop now', 'Explore', 'Grab deal'];

/**
 * Responsive 2-column product grid (1 column on mobile via .stack-column).
 */
export function renderProductGrid(products: ProductCardInput[]): string {
  const list = Array.isArray(products) ? products.filter((p) => p?.name) : [];
  if (!list.length) return '';

  const rows: string[] = [];
  for (let i = 0; i < list.length; i += 2) {
    const left = list[i];
    const right = list[i + 1];
    rows.push(`
<tr>
  <td class="stack-column product-col-pad" width="50%" valign="top" style="width:50%;padding:0 8px 16px 0;vertical-align:top;">
    ${productCardHtml(left, PRODUCT_CTAS)}
  </td>
  <td class="stack-column product-col-pad" width="50%" valign="top" style="width:50%;padding:0 0 16px 8px;vertical-align:top;">
    ${right ? productCardHtml(right, PRODUCT_CTAS) : '&nbsp;'}
  </td>
</tr>`);
  }

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
  ${rows.join('')}
</table>`;
}

export function renderMetaCard(rows: Array<{ label: string; value: string }>): string {
  if (!rows.length) return '';
  const lines = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:8px 0;font-size:12px;color:${BRAND.muted};width:38%;vertical-align:top;">${escapeHtml(r.label)}</td>
      <td style="padding:8px 0;font-size:14px;color:${BRAND.text};font-weight:600;word-break:break-word;">${escapeHtml(r.value)}</td>
    </tr>`,
    )
    .join('');
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background:#f9fafb;border-radius:12px;border-left:4px solid ${BRAND.primary};">
  <tr><td style="padding:16px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lines}</table>
  </td></tr>
</table>`;
}

export function renderOtpBlock(code: string, variant: 'verify' | 'reset' = 'verify'): string {
  const bg = variant === 'reset' ? '#fee2e2' : '#fef3c7';
  const border = variant === 'reset' ? '#f97316' : '#f59e0b';
  const color = variant === 'reset' ? '#9a3412' : '#92400e';
  return `
<p style="text-align:center;margin:20px 0;">
  <span style="display:inline-block;padding:18px 28px;background:${bg};border:2px dashed ${border};border-radius:16px;font-size:30px;font-weight:800;letter-spacing:10px;color:${color};font-family:ui-monospace,monospace;">${escapeHtml(code)}</span>
</p>`;
}

export function renderBodyParagraphs(paragraphs: string[]): string {
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#4b5563;">${escapeHtml(p)}</p>`,
    )
    .join('');
}

export function renderAction(ctaHref: string, ctaLabel: string, variant: 'primary' | 'dark' = 'primary'): string {
  return emailButton(ctaHref, ctaLabel, variant);
}

export function renderUnsubscribeLinks(preferencesUrl: string, unsubscribeUrl: string): string {
  return `
<p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${BRAND.muted};text-align:center;">
  <a href="${escapeHtml(preferencesUrl)}" style="color:${BRAND.primary};font-weight:600;">Email preferences</a>
  &nbsp;·&nbsp;
  <a href="${escapeHtml(unsubscribeUrl)}" style="color:${BRAND.primary};font-weight:600;">Unsubscribe</a>
</p>`;
}
