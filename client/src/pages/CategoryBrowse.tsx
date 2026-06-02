import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
// @ts-ignore JSX module without TS typings
import BuyerLayout from '../components/buyer/BuyerLayout';
// @ts-ignore JSX module without TS typings
import PremiumCategoryChips from '../components/home/PremiumCategoryChips';
// @ts-ignore JSX module without TS typings
import { SearchProductCard } from '../components/SearchProductCard';
import { PageSeo } from '../components/seo/PageSeo';
import { categoriesAPI, productAPI } from '../services/api';
import { getPreferredSiteOrigin } from '../lib/siteOrigin';
import { buildLocaleAlternates } from '../utils/localeAlternateLinks';
import '../styles/category-browse.css';

type CategoryMeta = { slug: string; name: string; description: string; productCount?: number };

const ALL_META: CategoryMeta = {
  slug: 'all',
  name: 'All',
  description: 'Browse every product from verified sellers on Reaglex.',
};

function normalizeSlug(raw: string | undefined): string {
  const s = String(raw || '').trim().toLowerCase();
  return s || 'all';
}

function isAllCategory(slug: string): boolean {
  return slug === 'all' || slug === '';
}

async function fetchCategoryProducts(
  slug: string,
  page: number,
  q: string,
): Promise<{ items: any[]; totalPages: number; total: number }> {
  const params: Record<string, unknown> = {
    page,
    limit: 24,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };
  if (q.trim()) params.search = q.trim();
  if (!isAllCategory(slug)) params.categorySlug = slug;

  const data = await productAPI.getProducts(params);
  const items = Array.isArray(data) ? data : data.products || data.items || [];
  const totalPages =
    Number(data.pagination?.totalPages ?? data.pagination?.pages ?? 1) || 1;
  const total = Number(data.pagination?.total ?? items.length) || items.length;
  return { items, totalPages, total };
}

export default function CategoryBrowse() {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = normalizeSlug(slugParam);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const qParam = searchParams.get('q') || '';
  const [searchDraft, setSearchDraft] = useState(qParam);

  useEffect(() => {
    setSearchDraft(qParam);
  }, [qParam]);

  useEffect(() => {
    document.body.classList.add('cat-browse-active');
    return () => document.body.classList.remove('cat-browse-active');
  }, []);

  const activeId = isAllCategory(slug) ? 'all' : slug;

  const metaQuery = useQuery({
    queryKey: ['category-meta', slug],
    queryFn: async () => {
      if (isAllCategory(slug)) return ALL_META;
      const res = await categoriesAPI.getBySlug(slug);
      return res.category as CategoryMeta;
    },
    enabled: Boolean(slug),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const productsQuery = useQuery({
    queryKey: ['category-products', slug, page, qParam],
    queryFn: () => fetchCategoryProducts(slug, page, qParam),
    placeholderData: keepPreviousData,
    enabled: isAllCategory(slug) || metaQuery.isSuccess,
  });

  const meta = isAllCategory(slug) ? ALL_META : metaQuery.data ?? null;
  const products = productsQuery.data?.items ?? [];
  const totalPages = productsQuery.data?.totalPages ?? 1;
  const total = productsQuery.data?.total ?? 0;
  const loading = metaQuery.isLoading || productsQuery.isLoading;
  const notFound = !isAllCategory(slug) && metaQuery.isError;

  const origin = typeof window !== 'undefined' ? getPreferredSiteOrigin() : '';
  const canonicalPath = (() => {
    const params = new URLSearchParams();
    if (qParam.trim()) params.set('q', qParam.trim());
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return `/category/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`;
  })();
  const canonicalUrl = origin ? `${origin}${canonicalPath}` : canonicalPath;

  const jsonLd = useMemo(() => {
    if (!meta) return [];
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: origin ? `${origin}/` : '/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: meta.name,
          item: canonicalUrl,
        },
      ],
    };
    const collection = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: meta.name,
      description: meta.description,
      url: canonicalUrl,
      numberOfItems: meta.productCount ?? total,
    };
    return [breadcrumb, collection];
  }, [meta, canonicalUrl, origin, total]);

  const hreflangAlternates =
    meta && origin ? buildLocaleAlternates(origin, canonicalPath) : undefined;

  const applySearch = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams);
      const trimmed = value.trim();
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (searchDraft.trim() !== qParam.trim()) {
        applySearch(searchDraft);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchDraft, qParam, applySearch]);

  const handleCategorySelect = useCallback(
    (id: string) => {
      const nextSlug = id === 'all' ? 'all' : id;
      const params = new URLSearchParams();
      if (qParam.trim()) params.set('q', qParam.trim());
      const qs = params.toString();
      navigate(`/category/${encodeURIComponent(nextSlug)}${qs ? `?${qs}` : ''}`);
    },
    [navigate, qParam],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch(searchDraft);
  };

  if (!slugParam) {
    return <Navigate to="/category/all" replace />;
  }

  const titleBase = meta ? `${meta.name} | Reaglex` : 'Categories | Reaglex';
  const title = page > 1 ? `${titleBase} — Page ${page}` : titleBase;
  const resultLabel = qParam.trim()
    ? `${total} result${total === 1 ? '' : 's'} for “${qParam.trim()}”`
    : `${total} product${total === 1 ? '' : 's'}`;

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

      <div className="cat-browse">
        <div className="cat-browse-toolbar">
          <div className="cat-browse-search-wrap">
            <form className="cat-browse-search" onSubmit={handleSearchSubmit} role="search">
              <Search size={18} strokeWidth={2} className="cat-browse-search__icon" aria-hidden />
              <input
                type="search"
                className="cat-browse-search__input"
                placeholder="Search in this category…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                aria-label="Search products"
                enterKeyHint="search"
                autoComplete="off"
              />
              {searchDraft.length > 0 && (
                <button
                  type="button"
                  className="cat-browse-search__clear"
                  onClick={() => {
                    setSearchDraft('');
                    applySearch('');
                  }}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </form>
          </div>

          <div className="cat-browse-cats">
            <PremiumCategoryChips
              activeId={activeId}
              onSelect={handleCategorySelect}
              selectMode
            />
          </div>
        </div>

        <div className="cat-browse-body">
          {notFound && !loading && (
            <div className="cat-browse-empty">
              <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Category not found
              </p>
              <button
                type="button"
                className="text-sm font-semibold"
                style={{ color: 'var(--brand-primary)' }}
                onClick={() => navigate('/category/all')}
              >
                Browse all products
              </button>
            </div>
          )}

          {!notFound && loading && products.length === 0 && (
            <div className="cat-browse-grid" aria-hidden>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="cat-browse-skeleton" />
              ))}
            </div>
          )}

          {!notFound && !loading && (
            <p className="cat-browse-meta" aria-live="polite">
              {isAllCategory(slug) && !qParam.trim()
                ? 'All categories'
                : meta?.name || 'Products'}
              {' · '}
              {resultLabel}
            </p>
          )}

          {!notFound && products.length > 0 && (
            <ul className="cat-browse-grid">
              {products.map((p: any, i: number) => (
                <li key={String(p._id || p.id || i)}>
                  <SearchProductCard product={p} index={i} />
                </li>
              ))}
            </ul>
          )}

          {!notFound && !loading && products.length === 0 && (
            <p className="cat-browse-empty">
              {qParam.trim()
                ? 'No products match your search. Try another term or category.'
                : 'No products in this category yet.'}
            </p>
          )}

          {!notFound && totalPages > 1 && (
            <nav className="cat-browse-pagination" aria-label="Pagination">
              {page > 1 && (
                <Link to={pageUrl(slug, page - 1, qParam)}>Previous</Link>
              )}
              {page < totalPages && (
                <Link to={pageUrl(slug, page + 1, qParam)}>Next</Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}

function pageUrl(slug: string, page: number, q: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (q.trim()) params.set('q', q.trim());
  const qs = params.toString();
  return `/category/${encodeURIComponent(slug)}${qs ? `?${qs}` : ''}`;
}
