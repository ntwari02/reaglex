import { localParts } from './timezoneService';

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = String(hm || '22:00').split(':').map((x) => Number(x) || 0);
  return { h: Math.min(23, h), m: Math.min(59, m) };
}

function minutesOfDay(h: number, m: number) {
  return h * 60 + m;
}

function isInQuietWindow(hour: number, minute: number, start: string, end: string) {
  const s = parseHm(start);
  const e = parseHm(end);
  const now = minutesOfDay(hour, minute);
  const startM = minutesOfDay(s.h, s.m);
  const endM = minutesOfDay(e.h, e.m);
  if (startM <= endM) return now >= startM && now < endM;
  return now >= startM || now < endM;
}

/**
 * If `at` falls in quiet hours for the user's timezone, delay until quiet period ends.
 */
export function applyQuietHours(params: {
  at: Date;
  timeZone: string;
  quietHours: { enabled?: boolean; start?: string; end?: string };
}): { scheduledAt: Date; delayed: boolean; reason?: string } {
  if (!params.quietHours?.enabled) return { scheduledAt: params.at, delayed: false };

  const start = params.quietHours.start || '22:00';
  const end = params.quietHours.end || '07:00';
  const lp = localParts(params.at, params.timeZone);

  if (!isInQuietWindow(lp.hour, lp.minute, start, end)) {
    return { scheduledAt: params.at, delayed: false };
  }

  const e = parseHm(end);
  const scheduled = new Date(params.at.getTime());
  const endMinutes = minutesOfDay(e.h, e.m);
  const nowMinutes = minutesOfDay(lp.hour, lp.minute);
  let addMinutes = endMinutes - nowMinutes;
  if (addMinutes <= 0) addMinutes += 24 * 60;
  addMinutes += 15;
  scheduled.setTime(scheduled.getTime() + addMinutes * 60 * 1000);

  return {
    scheduledAt: scheduled,
    delayed: true,
    reason: `quiet_hours_${start}-${end}`,
  };
}
