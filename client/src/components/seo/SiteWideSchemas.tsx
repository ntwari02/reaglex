import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { resolveAssetUrl } from '@/lib/config';
import { getPreferredSiteOrigin } from '@/lib/siteOrigin';

/**
 * Global structured data emitted on every page once.
 * Bundled as a single `@graph` so Google/Bing/LinkedIn parse Organization,
 * WebSite, SearchAction, and brand `sameAs` chain together (avoids duplicates).
 *
 * NOTE: per-page JSON-LD (`Product`, `BreadcrumbList`, `FAQPage`,
 * `CollectionPage`, `AboutPage`, `ContactPage`) is emitted by `PageSeo`.
 * Keep that split — duplicating Organization at the page level breaks
 * Rich Results validation in Search Console.
 */
export function SiteWideSchemas() {
  const origin = typeof window !== 'undefined' ? getPreferredSiteOrigin() : '';

  const json = useMemo(() => {
    if (!origin) return '';
    const logoUrl = resolveAssetUrl('/logo.jpg') || `${origin}/logo.jpg`;
    const sameAs = [
      'https://www.facebook.com/spacilly',
      'https://twitter.com/spacilly',
      'https://x.com/spacilly',
      'https://www.linkedin.com/company/spacilly',
      'https://www.instagram.com/spacilly',
      'https://www.youtube.com/@spacilly',
      'https://www.tiktok.com/@spacilly',
    ];

    const payload = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: 'Spacilly',
          alternateName: ['Spacilly Marketplace', 'Spacilly-X'],
          url: `${origin}/`,
          logo: {
            '@type': 'ImageObject',
            url: logoUrl,
            width: 512,
            height: 512,
          },
          image: logoUrl,
          slogan: 'Escrow-protected marketplace',
          description:
            'Spacilly is an escrow-protected ecommerce marketplace connecting buyers and verified sellers worldwide.',
          foundingDate: '2024-01-01',
          areaServed: ['RW', 'KE', 'UG', 'TZ', 'BI', 'CD', 'NG', 'ZA', 'US', 'GB', 'AE'],
          knowsLanguage: ['en', 'fr', 'rw', 'sw'],
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: 'support@spacilly.com',
              areaServed: 'Worldwide',
              availableLanguage: ['en', 'fr', 'rw', 'sw'],
            },
            {
              '@type': 'ContactPoint',
              contactType: 'sales',
              email: 'sales@spacilly.com',
              areaServed: 'Worldwide',
              availableLanguage: ['en'],
            },
          ],
          sameAs,
        },
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          url: `${origin}/`,
          name: 'Spacilly',
          alternateName: 'Spacilly Marketplace',
          publisher: { '@id': `${origin}/#organization` },
          inLanguage: ['en', 'fr', 'rw', 'sw'],
          potentialAction: [
            {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${origin}/search?q={search_term_string}`,
              },
              'query-input': 'required name=search_term_string',
            },
          ],
        },
      ],
    };
    return JSON.stringify(payload);
  }, [origin]);

  if (!json) return null;

  return (
    <Helmet>
      <script type="application/ld+json">{json}</script>
    </Helmet>
  );
}
