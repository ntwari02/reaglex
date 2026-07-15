/**
 * Generate VAPID keys for Web Push.
 *
 * Usage:
 *   node scripts/generateVapidKeys.js
 *
 * Copy the output into your server env (env / .env):
 *   VAPID_PUBLIC_KEY=...
 *   VAPID_PRIVATE_KEY=...
 *   VAPID_SUBJECT=mailto:notifications@yourdomain.com
 *
 * The public key is also surfaced on the client through GET /api/push/web/config.
 */
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();
const lines = [
  '# --- VAPID keys for Web Push (paste into server env) ---',
  `VAPID_PUBLIC_KEY=${keys.publicKey}`,
  `VAPID_PRIVATE_KEY=${keys.privateKey}`,
  `# Optional: a mailto contact for push providers to reach you about issues.`,
  `VAPID_SUBJECT=mailto:notifications@spacilly.com`,
];

console.log(lines.join('\n'));
