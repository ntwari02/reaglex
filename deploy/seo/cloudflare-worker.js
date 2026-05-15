/**
 * Reaglex — Cloudflare Worker edge router.
 *
 * Detects search engine + social bots and proxies them to the SEO SSR origin
 * (real HTML + JSON-LD + canonical/hreflang). Humans are routed to the SPA
 * origin (Vercel / static host).
 *
 * Bind these environment vars in the Worker:
 *   SPA_ORIGIN       e.g. https://reaglex.vercel.app
 *   SEO_SSR_ORIGIN   e.g. https://seo-ssr.reaglex.com
 *
 * Optional:
 *   SEO_SSR_DISABLE  "1" — kill switch (forces SPA for all traffic)
 *
 * Recommended Worker route:
 *   reaglex.com/*
 *   www.reaglex.com/*
 */

const BOT_REGEX =
  /(googlebot|bingbot|duckduckbot|yandex(?:bot|images)|baiduspider|sogou|exabot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|skypeuripreview|pinterest|redditbot|applebot|petalbot|seznambot|ia_archiver|chrome-lighthouse|lighthouse|gptbot|chatgpt-user|claudebot|google-extended|perplexitybot|qwantify)/i;

const ASSET_REGEX =
  /\.(?:js|mjs|css|map|png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|ttf|otf|txt|xml|json)$/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ua = request.headers.get('user-agent') || '';
    const isBot = BOT_REGEX.test(ua);
    const isAsset = ASSET_REGEX.test(url.pathname);
    const isApi = url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/');

    const spaOrigin = (env.SPA_ORIGIN || '').replace(/\/$/, '');
    const seoOrigin = (env.SEO_SSR_ORIGIN || '').replace(/\/$/, '');

    const upstream =
      env.SEO_SSR_DISABLE === '1' || !isBot || isAsset || isApi
        ? spaOrigin
        : seoOrigin || spaOrigin;

    if (!upstream) return new Response('Origin not configured', { status: 502 });

    const proxyUrl = `${upstream}${url.pathname}${url.search}`;
    const init = {
      method: request.method,
      headers: new Headers(request.headers),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    };
    init.headers.set('x-forwarded-host', url.host);
    init.headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
    if (upstream === seoOrigin && seoOrigin) {
      init.headers.set('x-reaglex-bot', '1');
    }

    const cacheKey = new Request(proxyUrl, { method: 'GET' });
    const cache = caches.default;
    let resp;
    if (upstream === seoOrigin && request.method === 'GET' && !isAsset && !isApi) {
      resp = await cache.match(cacheKey);
    }
    if (!resp) {
      resp = await fetch(proxyUrl, init);
      if (resp.ok && upstream === seoOrigin && request.method === 'GET' && !isAsset && !isApi) {
        const cacheable = new Response(resp.clone().body, resp);
        if (!cacheable.headers.get('cache-control')) {
          cacheable.headers.set('cache-control', 'public, max-age=120, stale-while-revalidate=86400');
        }
        await cache.put(cacheKey, cacheable.clone());
        resp = cacheable;
      }
    }

    const out = new Response(resp.body, resp);
    const vary = out.headers.get('vary');
    out.headers.set('vary', vary ? `${vary}, User-Agent` : 'User-Agent');
    out.headers.set('x-reaglex-edge', isBot ? 'bot' : 'human');
    return out;
  },
};
