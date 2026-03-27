import https from 'https';

const SELF_URL = (process.env.RENDER_EXTERNAL_URL || process.env.RENDER_EXTERNAL_HOSTNAME || '').trim()
  ? `https://${String(process.env.RENDER_EXTERNAL_HOSTNAME || '').trim()}`
  : (process.env.RENDER_EXTERNAL_URL || 'https://reaglex.onrender.com').trim();

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

