/**
 * Vercel Edge Middleware — crawler-aware rendering for Spacilly.
 *
 * Routes search-engine + social bots to the SEO SSR server (real HTML + JSON-LD),
 * while humans continue to hit the SPA shell (`/index.html`).
 *
 * Required env var on the Vercel project:
 *   SEO_SSR_ORIGIN   e.g. https://spacilly-seo.onrender.com
 *
 * Optional:
 *   SEO_SSR_DISABLE  "1" disables proxying (kill switch)
 *
 * Activated for the routes in `config.matcher` below: home, products listing,
 * category hubs, product pages, and key marketing pages. Asset URLs are excluded.
 */
export const config = {
  matcher: [
    '/',
    '/products',
    '/products/:path*',
    '/product/:path*',
    '/category/:path*',
    '/about',
    '/faq',
    '/sitemap',
    '/buyer-protection',
  ],
};

const BOT_REGEX =
  /(googlebot|bingbot|duckduckbot|yandex(?:bot|images)|baiduspider|sogou|exabot|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|skypeuripreview|pinterest|redditbot|applebot|petalbot|seznambot|ia_archiver|chrome-lighthouse|lighthouse|gptbot|chatgpt-user|claudebot|google-extended|perplexitybot|qwantify)/i;

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_REGEX.test(userAgent);
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent');

  if (process.env.SEO_SSR_DISABLE === '1') return undefined;
  if (!isCrawler(ua)) return undefined;

  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/_vercel/') ||
    url.pathname.startsWith('/api/') ||
    /\.(?:js|mjs|css|map|png|jpg|jpeg|webp|avif|svg|gif|ico|woff2?|ttf|otf|txt|xml|json)$/i.test(url.pathname)
  ) {
    return undefined;
  }

  const origin = (process.env.SEO_SSR_ORIGIN || '').replace(/\/$/, '');
  if (!origin) return undefined;

  const target = `${origin}${url.pathname}${url.search}`;
  try {
    const upstream = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': ua || 'SpacillyEdgeProxy/1.0',
        'accept': 'text/html,application/xhtml+xml',
        'x-forwarded-host': url.host,
        'x-forwarded-proto': url.protocol.replace(':', ''),
        'x-spacilly-bot': '1',
      },
    });

    if (!upstream.ok && upstream.status !== 301 && upstream.status !== 302 && upstream.status !== 404) {
      return undefined;
    }

    const headers = new Headers(upstream.headers);
    if (!headers.get('cache-control')) {
      headers.set('cache-control', 'public, max-age=120, stale-while-revalidate=86400');
    }
    headers.set('x-spacilly-seo', '1');
    headers.set('vary', [headers.get('vary'), 'User-Agent'].filter(Boolean).join(', '));

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return undefined;
  }
}
