import BuyerLayout from '../components/buyer/BuyerLayout';
import { PageSeo } from '../components/seo/PageSeo';
import { getPreferredSiteOrigin } from '../lib/siteOrigin';
import { buildLocaleAlternates } from '../utils/localeAlternateLinks';

export default function About() {
  const origin = getPreferredSiteOrigin();
  const canonical = origin ? `${origin}/about` : '/about';
  const hreflangAlternates = origin ? buildLocaleAlternates(origin, '/about') : undefined;
  const aboutLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Spacilly',
    url: canonical,
    description:
      'Spacilly is an escrow-protected global marketplace connecting buyers and verified sellers.',
    ...(origin
      ? {
          mainEntity: { '@id': `${origin}/#organization` },
          isPartOf: { '@id': `${origin}/#website` },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'About', item: canonical },
            ],
          },
        }
      : {}),
  };
  return (
    <BuyerLayout>
      <PageSeo
        title="About Spacilly | Marketplace & buyer protection"
        description="Spacilly is a global marketplace with escrow-protected checkout, verified sellers, and fast support—built for confident online shopping."
        canonicalUrl={canonical}
        ogImage={origin ? `${origin}/logo.jpg` : undefined}
        ogType="website"
        hreflangAlternates={hreflangAlternates}
        jsonLd={aboutLd}
      />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6" style={{ color: 'var(--text-primary)' }}>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">About Spacilly</h1>
        <p className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Spacilly connects buyers and sellers with secure payments, dispute resolution, and tooling
          designed for real commerce at scale. We focus on transparency, trust signals, and reliable
          fulfilment so every order is trackable and protected.
        </p>
        <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Headquartered with operations across East Africa and global payment partners, Spacilly blends
          localized checkout with international standards for privacy, security, and accessibility.
        </p>
      </div>
    </BuyerLayout>
  );
}
