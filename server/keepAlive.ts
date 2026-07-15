import https from 'https';

/** Prefer full RENDER_EXTERNAL_URL; fall back to hostname or default service URL. */
function resolveSelfUrl(): string {
  const externalUrl = (process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');
  if (externalUrl) return externalUrl;
  const hostname = (process.env.RENDER_EXTERNAL_HOSTNAME || '').trim();
  if (hostname) return `https://${hostname}`;
  return 'https://spacilly.onrender.com';
}

const SELF_URL = resolveSelfUrl();

function pingOnce() {
  const url = `${SELF_URL.replace(/\/$/, '')}/api/health`;
  https
    .get(url, (res) => {
      // eslint-disable-next-line no-console
      console.log(`[KeepAlive] Status: ${res.statusCode} at ${new Date().toISOString()}`);
      res.resume(); // drain
    })
    .on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[KeepAlive] Ping failed:', err.message);
    });
}

export default function keepAlive() {
  // Start immediately
  pingOnce();
  // Ping every 14 minutes (Render free tier sleeps after ~15m inactivity)
  setInterval(pingOnce, 14 * 60 * 1000);
}

