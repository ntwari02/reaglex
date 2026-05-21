import crypto from 'crypto';

export function buildPickupCredentials(expiryMinutes = 60 * 24) {
  const code = `RX-${Math.floor(1000 + Math.random() * 9000)}`;
  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const qrToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  return { code, otp, qrToken, expiresAt };
}
