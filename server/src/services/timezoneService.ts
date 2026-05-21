const TZ_BY_COUNTRY: Record<string, string> = {
  RW: 'Africa/Kigali',
  KE: 'Africa/Nairobi',
  UG: 'Africa/Kampala',
  TZ: 'Africa/Dar_es_Salaam',
  NG: 'Africa/Lagos',
  GH: 'Africa/Accra',
  ZA: 'Africa/Johannesburg',
  US: 'America/New_York',
  GB: 'Europe/London',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
};

export function resolveUserTimezone(user?: {
  preferences?: { timezone?: string };
  shippingAddress?: { country?: string };
  country?: string;
}): string {
  const pref = String(user?.preferences?.timezone || '').trim();
  if (pref) return pref;
  const country = String(
    user?.shippingAddress?.country || user?.country || 'RW'
  )
    .trim()
    .toUpperCase()
    .slice(0, 2);
  return TZ_BY_COUNTRY[country] || 'Africa/Kigali';
}

export function localParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return {
    hour: get('hour'),
    minute: get('minute'),
    year: get('year'),
    month: get('month'),
    day: get('day'),
  };
}
