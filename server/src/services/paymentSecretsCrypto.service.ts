import crypto from 'crypto';

const IV_LEN = 16;
const TAG_LEN = 16;
const ALGO = 'aes-256-gcm';

function deriveKey(): Buffer {
  const raw = (process.env.PAYMENT_SECRETS_MASTER_KEY || '').trim();
  if (raw.length >= 32) {
    try {
      const b = Buffer.from(raw, 'base64');
      if (b.length >= 32) return b.subarray(0, 32);
    } catch {
      /* fall through */
    }
    const u = Buffer.from(raw, 'utf8');
    if (u.length >= 32) return u.subarray(0, 32);
  }
  const fallback = raw || 'reaglex-dev-only-set-PAYMENT_SECRETS_MASTER_KEY';
  if (process.env.NODE_ENV === 'production' && !raw) {
    // eslint-disable-next-line no-console
    console.warn(
      '[payment secrets] PAYMENT_SECRETS_MASTER_KEY is not set; using insecure derived key. Set a 32-byte base64 key in production.'
    );
  }
  return crypto.createHash('sha256').update(fallback).digest();
}

export function encryptCredentialsJson(obj: Record<string, unknown>): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const json = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc = Buffer.concat([cipher.update(json), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptCredentialsJson(b64: string): Record<string, unknown> {
  const key = deriveKey();
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString('utf8')) as Record<string, unknown>;
}
