/**
 * Regenerates `client/vercel.json` from env vars during `npm run build`
 * (chained ahead of `vite build` in `package.json`).
 *
 * Why this script exists:
 *  - The default Vite SPA rewrite `(.*) -> /index.html` swallows /sitemap.xml,
 *    /robots.txt, and any crawler-only routes, hiding them from Googlebot.
 *  - Vercel reads `vercel.json` at deploy time, so we materialize it
 *    with API-aware rewrites + edge-friendly cache headers BEFORE Vite emits.
 *
 * Inputs (env, in order of precedence):
 *  - `REAGLEX_API_ORIGIN`           — preferred: https://api.reaglex.com
 *  - `VITE_SERVER_URL`              — fallback (already used by the SPA bundle)
 *  - `VITE_SEO_SSR_URL`             — optional crawler SSR origin (per-product HTML)
 *  - `REAGLEX_SEO_SSR_ORIGIN`       — synonym of VITE_SEO_SSR_URL (server-side only)
 *
 * Safe fallback: when nothing is configured we emit a working SPA-only file
 * (so deploys never break), but log a loud warning so the operator wires it up.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'vercel.json');

function loadDotEnvFile(relPath) {
  try {
    const full = path.join(root, relPath);
    const text = fs.readFileSync(full, 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* no .env.production — fine in CI */
  }
}

loadDotEnvFile('.env.production');
loadDotEnvFile('.env');

const apiOrigin = (
  process.env.REAGLEX_API_ORIGIN ||
  process.env.VITE_SERVER_URL ||
  ''
)
  .trim()
  .replace(/\/$/, '');
const seoSsrOrigin = (
  process.env.REAGLEX_SEO_SSR_ORIGIN ||
  process.env.VITE_SEO_SSR_URL ||
  ''
)
  .trim()
  .replace(/\/$/, '');

const longCache = 'public, max-age=31536000, immutable';
const seoCache = 'public, max-age=900, stale-while-revalidate=86400';

const headers = [
  {
    source: '/assets/(.*)',
    headers: [{ key: 'Cache-Control', value: longCache }],
  },
  {
    source: '/sitemap.xml',
    headers: [
      { key: 'Cache-Control', value: seoCache },
      { key: 'Content-Type', value: 'application/xml; charset=utf-8' },
      { key: 'X-Robots-Tag', value: 'noindex, follow' },
    ],
  },
  {
    source: '/sitemap-:name.xml',
    headers: [
      { key: 'Cache-Control', value: seoCache },
      { key: 'Content-Type', value: 'application/xml; charset=utf-8' },
      { key: 'X-Robots-Tag', value: 'noindex, follow' },
    ],
  },
  {
    source: '/robots.txt',
    headers: [
      { key: 'Cache-Control', value: seoCache },
      { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
    ],
  },
];

const rewrites = [];

if (apiOrigin) {
  rewrites.push(
    { source: '/robots.txt', destination: `${apiOrigin}/robots.txt` },
    { source: '/sitemap.xml', destination: `${apiOrigin}/sitemap.xml` },
    { source: '/sitemap-:name.xml', destination: `${apiOrigin}/sitemap-:name.xml` },
    { source: '/uploads/:path*', destination: `${apiOrigin}/uploads/:path*` },
    // OG image API needs to live on the SPA host so OG `og:image` URLs work for crawlers
    // that strictly resolve relative-to-page-origin (LinkedIn, Slack, some Telegram bots).
    {
      source: '/og/product/:slug',
      destination: `${apiOrigin}/api/public/og/product/:slug`,
    },
  );
} else {
  console.warn(
    '[vercel] No REAGLEX_API_ORIGIN / VITE_SERVER_URL set — /sitemap.xml and /robots.txt will NOT proxy to the API. ' +
      'Set REAGLEX_API_ORIGIN on Vercel before building to enable crawler discovery from the main domain.',
  );
}

if (seoSsrOrigin) {
  // Crawler HTML for product canonical URLs lives on the SEO SSR origin.
  rewrites.push(
    { source: '/product/:slug', destination: `${seoSsrOrigin}/product/:slug` },
    { source: '/products/:id', destination: `${seoSsrOrigin}/products/:id` },
    { source: '/category/:slug', destination: `${seoSsrOrigin}/category/:slug` },
  );
}

// Final catch-all keeps the SPA working for everything else (humans).
rewrites.push({ source: '/(.*)', destination: '/index.html' });

const vercelConfig = { headers, rewrites };
fs.writeFileSync(outPath, JSON.stringify(vercelConfig, null, 2) + '\n');
console.log(
  `[vercel] Wrote vercel.json — api=${apiOrigin || '(none)'} seoSsr=${seoSsrOrigin || '(none)'}`,
);
