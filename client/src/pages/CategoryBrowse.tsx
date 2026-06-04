import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
// @ts-ignore JSX module without TS typings
import BuyerLayout from '../components/buyer/BuyerLayout';
// @ts-ignore JSX module without TS typings
import { SearchProductCard } from '../components/SearchProductCard';
import { PageSeo } from '../components/seo/PageSeo';
import { categoriesAPI, productAPI } from '../services/api';
import { getPreferredSiteOrigin } from '../lib/siteOrigin';
import { buildLocaleAlternates } from '../utils/localeAlternateLinks';

type CategoryMeta = { slug: string; name: string; description: string; productCount?: number };

export default function CategoryBrowse() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = String(slugParam || '').trim().toLowerCase();
  const [searchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [meta, setMeta] = useState<CategoryMeta | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? getPreferredSiteOrigin() : '';

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const catRes = await categoriesAPI.getBySlug(slug);
        if (!alive) return;
        setMeta(catRes.category);
        const data = await productAPI.getProducts({
          categorySlug: slug,
          page,
          limit: 24,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        } as Record<string, unknown>);
        if (!alive) return;
        const items = Array.isArray(data) ? data : data.products || data.items || [];
        setProducts(items);
        setTotalPages(
          Number(data.pagination?.totalPages ?? data.pagination?.pages ?? 1) || 1,
        );
      } catch {
        if (!alive) return;
        setError('not_found');
        setMeta(null);
        setProducts([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, page]);

  const canonicalPath = `/category/${encodeURIComponent(slug)}${page > 1 ? `?page=${page}` : ''}`;
  const canonicalUrl = origin ? `${origin}${canonicalPath}` : canonicalPath;

  const jsonLd = useMemo(() => {
    if (!meta) return [];
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin ? `${origin}/` : '/' },
        { '@type': 'ListItem', position: 2, name: 'Products', item: origin ? `${origin}/products` : '/products' },
        { '@type': 'ListItem', position: 3, name: meta.name, item: canonicalUrl },
      ],
    };
    const collection = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: meta.name,
      description: meta.description,
      url: canonicalUrl,
      numberOfItems: meta.productCount,
    };
    return [breadcrumb, collection];
  }, [meta, canonicalUrl, origin]);

  const hreflangAlternates =
    meta && origin ? buildLocaleAlternates(origin, canonicalPath) : undefined;

  if (!slug) {
    return (
      <BuyerLayout>
        <div className="max-w-xl mx-auto px-4 py-20 text-center">Invalid category.</div>
      </BuyerLayout>
    );
  }

  const titleBase = meta ? `${meta.name} | Reaglex` : 'Category | Reaglex';
  const title = page > 1 ? `${titleBase} — Page ${page}` : titleBase;

  return (
    <BuyerLayout>
      <PageSeo
        title={title}
        description={
          meta?.description ||
          `Browse ${meta?.name || 'products'} from verified sellers on Reaglex.`
        }
        canonicalUrl={canonicalUrl || undefined}
        keywords={meta ? `${meta.name}, buy online, Reaglex marketplace` : undefined}
        ogType="website"
        jsonLd={jsonLd}
        hreflangAlternates={hreflangAlternates}
      />

      <div className="min-h-screen pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
          <nav className="text-sm flex flex-wrap items-center gap-1 mb-6" aria-label="Breadcrumb">
            <Link to="/" className="hover:underline" style={{ color: 'var(--link-color)' }}>
              Home
            </Link>
            <ChevronRight className="w-4 h-4 opacity-45 flex-shrink-0" aria-hidden />
            <Link to="/products" className="hover:underline" style={{ color: 'var(--link-color)' }}>
              Products
            </Link>
            <ChevronRight className="w-4 h-4 opacity-45 flex-shrink-0" aria-hidden />
            <span style={{ color: 'var(--text-muted)' }}>{meta?.name || slug}</span>
          </nav>

          {loading && (
            <div className="py-24 text-center" style={{ color: 'var(--text-secondary)' }}>
              Loading category…
            </div>
          )}

          {error === 'not_found' && !loading && (
            <div className="py-24 text-center space-y-3">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Category not found
              </h1>
              <Link to="/products" style={{ color: 'var(--link-color)' }} className="underline">
                Browse all products
              </Link>
            </div>
          )}

          {!loading && !error && meta && (
            <>
              <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                  {meta.name}
                </h1>
                <p className="max-w-2xl text-base" style={{ color: 'var(--text-secondary)' }}>
                  {meta.description}
                </p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                  {typeof meta.productCount === 'number' ? `${meta.productCount} listings` : null}
                </p>
              </header>

              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 list-none p-0 m-0">
                {products.map((p: any, i: number) => (
                  <li key={String(p._id || p.id || i)}>
                    <SearchProductCard product={p} index={i} />
                  </li>
                ))}
              </ul>

              {products.length === 0 && (
                <p className="py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
                  No products in this category yet.
                </p>
              )}

              {totalPages > 1 && (
                <nav className="flex justify-center gap-2 mt-10" aria-label="Pagination">
                  {page > 1 && (
                    <Link
                      className="px-4 py-2 rounded-xl border font-medium"
                      style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
                      to={`${categoryPath(slug)}?page=${page - 1}`}
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      className="px-4 py-2 rounded-xl border font-medium"
                      style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
                      to={`${categoryPath(slug)}?page=${page + 1}`}
                    >
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}

function categoryPath(s: string) {
  return `/category/${encodeURIComponent(s)}`;
}
