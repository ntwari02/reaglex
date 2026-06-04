/**
 * Shared builder for marketing / recommendation emails (AI copy + product cards).
 */
import { formatUsdAsCurrency } from '../utils/money';
import { generateMarketingEmailCopy, type MarketingCampaign, type MarketingCopyResult } from './emailCopyAi.service';
import type { ProductCardInput } from './components';

type ProductSource = {
  _id: unknown;
  name?: string;
  price?: number;
  discount?: number;
  images?: string[];
  description?: string;
  category?: string;
  reason?: string;
};

function resolveImageUrl(img: string, serverUrl: string): string {
  if (!img) return '';
  if (img.startsWith('http')) return img;
  const base = serverUrl.replace(/\/$/, '');
  return `${base}${img.startsWith('/') ? img : `/${img}`}`;
}

export async function buildMarketingEmailContent(input: {
  userId: string;
  firstName: string;
  campaign: MarketingCampaign;
  mode?: 'deals_only' | 'mixed';
  cartTemplate?: string;
  allowPersonalized?: boolean;
  products: ProductSource[];
  historyId: string;
  displayCurrency: string;
  serverUrl: string;
  copy?: MarketingCopyResult;
}): Promise<{ copy: MarketingCopyResult; products: ProductCardInput[] }> {
  const copyInputProducts = input.products.map((p) => ({
    id: String(p._id),
    name: String(p.name || ''),
    category: p.category ? String(p.category) : undefined,
    reason: p.reason ? String(p.reason) : undefined,
    discount: Number(p.discount || 0),
  }));

  const copy =
    input.copy ||
    (await generateMarketingEmailCopy({
      userId: input.userId,
      firstName: input.firstName,
      campaign: input.campaign,
      mode: input.mode,
      cartTemplate: input.cartTemplate,
      allowPersonalized: input.allowPersonalized,
      products: copyInputProducts,
    }));

  const apiBase = input.serverUrl.replace(/\/$/, '');
  const products: ProductCardInput[] = [];

  for (const p of input.products) {
    const id = String(p._id);
    const img = Array.isArray(p.images) && p.images[0] ? String(p.images[0]) : '';
    const conv = await formatUsdAsCurrency(Number(p.price || 0), input.displayCurrency);
    const fallbackDesc = String(p.description || '').slice(0, 90);
    products.push({
      id,
      name: String(p.name || ''),
      imageUrl: resolveImageUrl(img, input.serverUrl),
      price: Number(p.price || 0),
      priceText: conv.formatted,
      discount: Number(p.discount || 0),
      description: copy.productDescriptions[id] || fallbackDesc,
      viewUrl: `${apiBase}/api/recommendation-emails/track/click/${input.historyId}/${id}`,
      ctaLabel: copy.ctaLabel,
    });
  }

  return { copy, products };
}
