import { useEffect } from 'react';

function upsertMetaByName(name, content) {
  if (content == null) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(content));
}

function upsertMetaByProperty(property, content) {
  if (content == null) return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(content));
}

function upsertLinkRel(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(scriptId, json) {
  if (!json) {
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();
    return;
  }

  let el = document.getElementById(scriptId);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = scriptId;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(json);
}

/**
 * Simple client-side SEO updater for SPA crawlers:
 * - document title
 * - description
 * - canonical
 * - OpenGraph + Twitter tags
 * - robots noindex
 * - JSON-LD structured data
 */
export function useSeo({
  title,
  description,
  keywords,
  canonicalUrl,
  openGraph,
  twitter,
  noIndex = false,
  jsonLd,
  jsonLdScriptId = 'reaglex-jsonld',
}) {
  useEffect(() => {
    if (!title) return;
    document.title = title;

    if (description != null) upsertMetaByName('description', description);
    if (keywords != null) upsertMetaByName('keywords', keywords);

    if (canonicalUrl) upsertLinkRel('canonical', canonicalUrl);

    if (noIndex) {
      upsertMetaByName('robots', 'noindex,nofollow');
    }

    if (openGraph?.title) upsertMetaByProperty('og:title', openGraph.title);
    if (openGraph?.description) upsertMetaByProperty('og:description', openGraph.description);
    if (openGraph?.image) upsertMetaByProperty('og:image', openGraph.image);

    if (twitter?.card) upsertMetaByName('twitter:card', twitter.card);
    if (twitter?.title) upsertMetaByName('twitter:title', twitter.title);
    if (twitter?.description) upsertMetaByName('twitter:description', twitter.description);
    if (twitter?.image) upsertMetaByName('twitter:image', twitter.image);

    if (jsonLd) upsertJsonLd(jsonLdScriptId, jsonLd);
    else upsertJsonLd(jsonLdScriptId, null);
  }, [
    title,
    description,
    keywords,
    canonicalUrl,
    openGraph?.title,
    openGraph?.description,
    openGraph?.image,
    twitter?.card,
    twitter?.title,
    twitter?.description,
    twitter?.image,
    noIndex,
    jsonLd,
    jsonLdScriptId,
  ]);
}

