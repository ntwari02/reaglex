import type { NavigateFunction } from 'react-router-dom';
import { SERVER_URL } from './config';
import { buyerProductPath } from './productUrl';
import { prefetchProduct } from '../hooks/queries/prefetchProduct';

function resolvePreviewImage(product: Record<string, unknown>) {
  const primary = Array.isArray(product.images)
    ? (product.images as { is_primary?: boolean }[]).find((img) => img?.is_primary) ||
      (product.images as unknown[])[0]
    : product.images;
  const raw =
    primary ||
    product.image ||
    product.imageUrl ||
    product.thumbnail ||
    product.thumbnailUrl;
  if (!raw) return undefined;
  const value =
    typeof raw === 'object' && raw !== null
      ? (raw as { url?: string; src?: string }).url ||
        (raw as { url?: string; src?: string }).src
      : String(raw);
  if (!value) return undefined;
  return value.startsWith('http') ? value : `${SERVER_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

import { resolveProductPriceUsd } from './resolveProductPrice';

export function buildProductPreview(product: Record<string, unknown>) {
  const id = String(product._id || product.id || '');
  return {
    id,
    title: String(product.title || product.name || 'Product'),
    image: resolvePreviewImage(product),
    price: resolveProductPriceUsd(product),
    listingPriceAmount: product.listingPriceAmount,
    listingCurrency: product.listingCurrency,
    listingExchangeRate: product.listingExchangeRate,
  };
}

export function warmProductRoute(product: Record<string, unknown>) {
  prefetchProduct(product as { slug?: string; _id?: string; id?: string });
}

export function navigateToProduct(
  navigate: NavigateFunction,
  product: Record<string, unknown>,
) {
  warmProductRoute(product);
  navigate(buyerProductPath(product as Parameters<typeof buyerProductPath>[0]), {
    state: { productPreview: buildProductPreview(product) },
  });
}
