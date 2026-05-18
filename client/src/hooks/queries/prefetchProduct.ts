import { productAPI } from '../../services/api';
import { queryClient } from '../../lib/queryClient';
import { productKeys } from './productKeys';

type ProductRef = {
  slug?: string | null;
  _id?: string | null;
  id?: string | null;
};

export function prefetchProduct(product: ProductRef) {
  const slug = product.slug?.trim();
  const id = String(product._id || product.id || '').trim();

  if (slug) {
    void queryClient.prefetchQuery({
      queryKey: productKeys.detailBySlug(slug),
      queryFn: () => productAPI.getProductBySlug(slug),
      staleTime: 5 * 60 * 1000,
    });
    return;
  }

  if (id) {
    void queryClient.prefetchQuery({
      queryKey: productKeys.detailById(id),
      queryFn: () => productAPI.getProductById(id),
      staleTime: 5 * 60 * 1000,
    });
  }
}
