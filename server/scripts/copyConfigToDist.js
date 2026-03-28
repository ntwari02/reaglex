/**
 * tsc only emits .ts files; config/cloudinary.js must be copied into dist/
 * so require('../../config/cloudinary') from dist/src/** resolves at runtime.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'config');
const dest = path.join(root, 'dist', 'config');

if (!fs.existsSync(src)) {
  console.warn('[copyConfigToDist] config/ not found, skipping');
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('[copyConfigToDist] Copied config/ -> dist/config/');
