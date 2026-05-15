/**
 * hreflang alternates aligned with `server/src/routes/seoRoutes.ts` (`?lang=` query).
 */
export type HreflangAlternate = { hrefLang: string; href: string };

const LOCALE_PARAM: { code: string; hrefLang: string }[] = [
  { code: 'en', hrefLang: 'en-US' },
  { code: 'fr', hrefLang: 'fr' },
  { code: 'rw', hrefLang: 'rw' },
  { code: 'sw', hrefLang: 'sw' },
];

/** `path` must start with `/` (pathname + search if needed; avoid double `?`). */
export function buildLocaleAlternates(origin: string, path: string): HreflangAlternate[] {
  const base = origin.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const hasQuery = p.includes('?');
  const out: HreflangAlternate[] = [{ hrefLang: 'x-default', href: `${base}${p}` }];
  for (const { code, hrefLang } of LOCALE_PARAM) {
    const sep = hasQuery ? '&' : '?';
    out.push({ hrefLang, href: `${base}${p}${sep}lang=${encodeURIComponent(code)}` });
  }
  return out;
}
