/** Regional indicator symbol pair from ISO 3166-1 alpha-2 (e.g. RW → 🇷🇼) */
export function countryFlagEmoji(countryCode) {
  const code = String(countryCode || '').trim().toUpperCase();
  if (code.length !== 2) return '🌍';
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...[...code].map((c) => base + c.charCodeAt(0) - 65)
  );
}
