import { productAPI } from '../../services/api';
import { queryClient } from '../../lib/queryClient';
import { productKeys } from './productKeys';

type ProductRef = {
  slug?: string | null;
  _id?: string | null;
  id?: string | null;
};

async function fetchProductDetail(slug?: string, id?: string) {
  const data = slug
    ? await productAPI.getProductBySlug(slug)
    : await productAPI.getProductById(String(id));
  return data.product || data;
}

/** Write the same payload under slug and id keys so PDP never refetches on canonical redirect. */
export function cacheProductDetail(product: unknown) {
  if (!product || typeof product !== 'object') return;
  const p = product as ProductRef;
  const slug = typeof p.slug === 'string' ? p.slug.trim() : '';
  const id = String(p._id || p.id || '').trim();
  if (slug) queryClient.setQueryData(productKeys.detailBySlug(slug), product);
  if (id) queryClient.setQueryData(productKeys.detailById(id), product);
}

export function prefetchProduct(product: ProductRef) {
  const slug = product.slug?.trim();
  const id = String(product._id || product.id || '').trim();
  if (!slug && !id) return;

  const slugKey = slug ? productKeys.detailBySlug(slug) : null;
  const idKey = id ? productKeys.detailById(id) : null;
  if (slugKey && queryClient.getQueryData(slugKey)) return;
  if (idKey && queryClient.getQueryData(idKey)) return;

  void (async () => {
    try {
      const data = slug
        ? await fetchProductDetail(slug)
        : await fetchProductDetail(undefined, id);
      if (data) cacheProductDetail(data);
    } catch {
      /* hover/tap prefetch is best-effort */
    }
  })();
}
