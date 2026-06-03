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

export function prefetchProduct(product: ProductRef) {
  const slug = product.slug?.trim();
  const id = String(product._id || product.id || '').trim();

  if (slug) {
    void queryClient.prefetchQuery({
      queryKey: productKeys.detailBySlug(slug),
      queryFn: () => fetchProductDetail(slug),
      staleTime: 5 * 60 * 1000,
    });
    return;
  }

  if (id) {
    void queryClient.prefetchQuery({
      queryKey: productKeys.detailById(id),
      queryFn: () => fetchProductDetail(undefined, id),
      staleTime: 5 * 60 * 1000,
    });
  }
}
