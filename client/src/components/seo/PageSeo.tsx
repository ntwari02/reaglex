import { Helmet } from 'react-helmet-async';

export type PageSeoProps = {
  title: string;
  description?: string;
  canonicalUrl?: string;
  /** Absolute URLs preferred for OG / Twitter images */
  ogImage?: string;
  twitterImage?: string;
  ogType?: string;
  noIndex?: boolean;
  /** When set, overrides default robots / googlebot content (e.g. `noindex,follow`) */
  robotsContent?: string;
  keywords?: string;
  jsonLd?: unknown | unknown[];
  /** hreflang + regional alternates */
  hreflangAlternates?: { hrefLang: string; href: string }[];
};

function normalizeJsonLd(ld: unknown | unknown[]): string {
  if (Array.isArray(ld)) return JSON.stringify(ld.filter(Boolean));
  return JSON.stringify(ld);
}

/** Production-grade meta: title, canonical, OG, Twitter, robots, optional JSON-LD. */
export function PageSeo({
  title,
  description,
  canonicalUrl,
  ogImage,
  twitterImage,
  ogType = 'website',
  noIndex,
  robotsContent,
  keywords,
  jsonLd,
  hreflangAlternates,
}: PageSeoProps) {
  const img = twitterImage || ogImage;
  const robots =
    robotsContent ||
    (noIndex
      ? 'noindex,nofollow'
      : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
      {hreflangAlternates?.map((a) => (
        <link key={`${a.hrefLang}:${a.href}`} rel="alternate" hrefLang={a.hrefLang} href={a.href} />
      ))}

      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Spacilly" />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      {ogImage ? <meta property="og:image:secure_url" content={ogImage} /> : null}
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {img ? <meta name="twitter:image" content={img} /> : null}

      {jsonLd != null && (Array.isArray(jsonLd) ? jsonLd.filter(Boolean).length > 0 : true) ? (
        <script type="application/ld+json">{normalizeJsonLd(jsonLd as unknown)}</script>
      ) : null}
    </Helmet>
  );
}
