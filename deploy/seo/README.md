# Spacilly SEO edge & deployment

This folder contains reverse-proxy and edge configurations that complete the
crawler-aware rendering pipeline.

## How it works

```
                ┌──────────────┐
                │  User Agent  │
                └──────┬───────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Edge / CDN /    │   ← `User-Agent` sniff (bots vs humans)
              │  Worker / nginx  │   ← `Vary: User-Agent`, stale-while-revalidate
              └────┬────────┬────┘
       (human)     │        │  (bot / social crawler)
                   ▼        ▼
          ┌──────────────┐  ┌──────────────────────┐
          │  Vite SPA    │  │  seoSsrServer        │
          │  index.html  │  │  /, /products,       │
          │  + hydration │  │  /category/:slug,    │
          └──────────────┘  │  /product/:slug      │
                            │  + JSON-LD/canonical │
                            │  + 5 min cache TTL   │
                            └──────────────────────┘
```

Order of preference:

1. **`client/middleware.ts`** — Vercel Edge Middleware. Cheapest path for the
   default Vercel deployment. Set `SEO_SSR_ORIGIN` in the Vercel project
   environment.
2. **`cloudflare-worker.js`** — drop in when fronting both the SPA and SEO SSR
   behind Cloudflare. Best for global cache + Bot Management tier-2 hardening.
3. **`nginx.conf` / `Caddyfile`** — bare-metal / VPS reverse proxy.

All adapters set `Vary: User-Agent`, send `X-Forwarded-Host`, mark bot responses
with `X-Spacilly-SEO`, and never proxy `/api/`, `/uploads/`, or static asset URLs.

## Important headers

- `Cache-Control: public, max-age=120, stale-while-revalidate=86400` — keeps a
  warm bot HTML edge cache for 2 minutes, serves stale up to 24 h while
  revalidating. Tuned for crawler workloads (no human session leakage).
- `Vary: User-Agent` — guarantees the SPA shell is never served to bots from a
  shared cache and vice-versa.
- `X-Spacilly-Bot: 1` — propagated upstream to the SSR origin so it can log /
  rate-limit per UA bucket.

## Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `SEO_SSR_ORIGIN` | Edge (Vercel/Worker/nginx) | Where to proxy bot traffic |
| `SEO_SSR_DISABLE` | Edge | Set to `1` to bypass SSR (incident kill switch) |
| `SEO_PUBLIC_BASE_URL` | SEO SSR server | Canonical origin used in `<link rel="canonical">` |
| `API_ORIGIN` | SEO SSR server | Where the SSR fetches product / category data |
| `MEDIA_ORIGIN` | SEO SSR server | Origin for absolute image URLs |
| `VITE_SITE_ORIGIN` | SPA build | Canonical site origin used by client `<head>` |

## Smoke-test commands

```bash
# Human shell (SPA)
curl -sI https://spacilly.com/product/red-running-shoes

# Bot HTML
curl -sI -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
     https://spacilly.com/product/red-running-shoes

# Category hub (should return 200 from SSR with JSON-LD + canonical)
curl -sI -A "facebookexternalhit/1.1" https://spacilly.com/category/electronics
```

Expected on bot requests:

```
HTTP/2 200
content-type: text/html
cache-control: public, max-age=120, stale-while-revalidate=86400
vary: User-Agent
x-spacilly-seo: 1
```
