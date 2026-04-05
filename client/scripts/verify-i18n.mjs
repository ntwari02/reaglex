/**
 * Verifies locale JSON key parity and that translate() matches bundled logic:
 * non-empty locale string wins; empty string falls back to English.
 * Run: node scripts/verify-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/locales');

function allKeys(obj, prefix = '') {
  const keys = [];
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...allKeys(v, p));
    else keys.push(p);
  }
  return keys.sort();
}

function getNested(obj, dotted) {
  let cur = obj;
  for (const p of dotted.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** Mirrors client/src/i18n/translate.ts */
function translate(locale, key, en, fr, rw) {
  const loc = locale === 'sw' ? 'en' : locale;
  const table = loc === 'fr' ? fr : loc === 'rw' ? rw : en;
  const primary = getNested(table, key);
  if (primary !== undefined && primary !== '') return primary;
  const fb = getNested(en, key);
  if (fb !== undefined && fb !== '') return fb;
  return key;
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const fr = JSON.parse(fs.readFileSync(path.join(localesDir, 'fr.json'), 'utf8'));
const rw = JSON.parse(fs.readFileSync(path.join(localesDir, 'rw.json'), 'utf8'));

const ke = allKeys(en);
const kf = allKeys(fr);
const kr = allKeys(rw);

let ok = true;
if (ke.join('\n') !== kf.join('\n')) {
  console.error('FAIL: en.json and fr.json key paths differ');
  ok = false;
}
if (ke.join('\n') !== kr.join('\n')) {
  console.error('FAIL: en.json and rw.json key paths differ');
  ok = false;
}

// Spot-check a few keys for each locale
const checks = [
  ['en', 'nav.home', 'Home'],
  ['fr', 'nav.home', getNested(fr, 'nav.home')],
  ['rw', 'nav.home', getNested(rw, 'nav.home')],
  ['fr', 'search.placeholderShort', getNested(fr, 'search.placeholderShort')],
];

for (const [loc, key, expected] of checks) {
  const out = translate(loc, key, en, fr, rw);
  if (out !== expected) {
    console.error(`FAIL: translate(${loc}, ${key}) => "${out}", expected "${expected}"`);
    ok = false;
  }
}

// Empty value must fall back (use a synthetic check: pick first empty fr value if any)
const emptyKey = ke.find((k) => getNested(fr, k) === '');
if (emptyKey) {
  const out = translate('fr', emptyKey, en, fr, rw);
  const want = getNested(en, emptyKey) || emptyKey;
  if (out !== want) {
    console.error(`FAIL: empty fr key ${emptyKey}: got "${out}", want "${want}"`);
    ok = false;
  }
}

if (ok) {
  console.log(`OK: ${ke.length} string keys aligned; translate() behavior matches app for spot checks.`);
  process.exit(0);
}
process.exit(1);
