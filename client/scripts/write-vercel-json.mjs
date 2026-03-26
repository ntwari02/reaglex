/**
 * Regenerates client/vercel.json from env (merges client/.env.production into process.env when present).
 * Run manually: `npm run vercel:rewrites` before committing, or configure the same paths under
 * Vercel → Project → Rewrites. Vite does not load this automatically during `vite build`.
 *
 * Required for generated rewrites: VITE_SERVER_URL. Optional: VITE_SEO_SSR_URL (product HTML SSR).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'vercel.json');

/** Optional: merge client/.env.production into process.env for local `npm run build` (Vite loads it later; Node does not). */
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
    /* no file */
  }
}

loadDotEnvFile('.env.production');

const serverUrl = (process.env.VITE_SERVER_URL || '').trim().replace(/\/$/, '');
const seoSsrUrl = (process.env.VITE_SEO_SSR_URL || '').trim().replace(/\/$/, '');

const spaOnly = {
  rewrites: [{ source: '/(.*)', destination: '/index.html' }],
};

if (!serverUrl) {
  const msg =
    '[vercel] VITE_SERVER_URL not set — skipping vercel.json generation (API/sitemap rewrites). ' +
    'Set VITE_SERVER_URL on Vercel before build for production rewrites.';
  if (process.env.VERCEL === '1') {
    console.warn(msg + ' Writing SPA-only vercel.json.');
    fs.writeFileSync(outPath, JSON.stringify(spaOnly, null, 2) + '\n');
  } else {
    console.log(msg);
  }
  process.exit(0);
}

const rewrites = [];

if (seoSsrUrl) {
  rewrites.push({
    source: '/products/:id',
    destination: `${seoSsrUrl}/products/:id`,
  });
}

rewrites.push(
  { source: '/robots.txt', destination: `${serverUrl}/robots.txt` },
  { source: '/sitemap.xml', destination: `${serverUrl}/sitemap.xml` },
);

rewrites.push({ source: '/(.*)', destination: '/index.html' });

fs.writeFileSync(outPath, JSON.stringify({ rewrites }, null, 2) + '\n');
console.log('[vercel] Wrote vercel.json with dynamic destinations.');
