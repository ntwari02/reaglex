import { SystemMonitorConfig, type ISystemMonitorConfig } from '../models/SystemMonitorConfig';
import type { MonitorSettings } from './systemMonitor.service';

const CONFIG_KEY = 'default';

let cached: ISystemMonitorConfig | null = null;

export type MonitorSettingsWithNotifications = MonitorSettings & {
  notifications: {
    emails: string[];
    phones: string[];
    slackWebhookUrl: string;
    notifyOnCritical: boolean;
    notifyOnWarning: boolean;
    cooldownMinutes: number;
  };
};

function defaults() {
  return {
    key: CONFIG_KEY,
    monitoringEnabled: true,
    cpuWarn: 70,
    cpuCritical: 85,
    ramWarn: 80,
    ramCritical: 92,
    diskWarn: 85,
    diskCritical: 95,
    errorRateWarn: 5,
    apiSlowWarnMs: 1000,
    apiSlowCriticalMs: 3000,
    sensitivity: 'normal',
    notifications: {
      emails: [],
      phones: [],
      slackWebhookUrl: '',
      notifyOnCritical: true,
      notifyOnWarning: true,
      cooldownMinutes: 30,
    },
    lastNotifiedAt: {},
  } as any;
}

export async function loadSystemMonitorConfig(): Promise<ISystemMonitorConfig> {
  if (cached) return cached;
  let doc = await SystemMonitorConfig.findOne({ key: CONFIG_KEY });
  if (!doc) {
    doc = await SystemMonitorConfig.create(defaults());
  }
  cached = doc;
  return doc;
}

export function invalidateMonitorConfigCache() {
  cached = null;
}

export async function getPersistedMonitorSettings(): Promise<MonitorSettingsWithNotifications> {
  const doc = await loadSystemMonitorConfig();
  const n = doc.notifications || ({} as ISystemMonitorConfig['notifications']);
  return {
    monitoringEnabled: doc.monitoringEnabled,
    cpuWarn: doc.cpuWarn,
    cpuCritical: doc.cpuCritical,
    ramWarn: doc.ramWarn,
    ramCritical: doc.ramCritical,
    diskWarn: doc.diskWarn,
    diskCritical: doc.diskCritical,
    errorRateWarn: doc.errorRateWarn,
    apiSlowWarnMs: doc.apiSlowWarnMs,
    apiSlowCriticalMs: doc.apiSlowCriticalMs,
    sensitivity: doc.sensitivity,
    notifications: {
      emails: Array.isArray(n.emails) ? n.emails.map((e) => String(e).trim()).filter(Boolean) : [],
      phones: Array.isArray(n.phones) ? n.phones.map((p) => String(p).trim()).filter(Boolean) : [],
      slackWebhookUrl: String(n.slackWebhookUrl || '').trim(),
      notifyOnCritical: n.notifyOnCritical !== false,
      notifyOnWarning: n.notifyOnWarning !== false,
      cooldownMinutes: Number(n.cooldownMinutes) > 0 ? Number(n.cooldownMinutes) : 30,
    },
  };
}

export async function savePersistedMonitorSettings(
  patch: Partial<MonitorSettingsWithNotifications>,
): Promise<MonitorSettingsWithNotifications> {
  const doc = await loadSystemMonitorConfig();
  if (typeof patch.monitoringEnabled === 'boolean') doc.monitoringEnabled = patch.monitoringEnabled;
  if (typeof patch.cpuWarn === 'number') doc.cpuWarn = patch.cpuWarn;
  if (typeof patch.cpuCritical === 'number') doc.cpuCritical = patch.cpuCritical;
  if (typeof patch.ramWarn === 'number') doc.ramWarn = patch.ramWarn;
  if (typeof patch.ramCritical === 'number') doc.ramCritical = patch.ramCritical;
  if (typeof patch.diskWarn === 'number') doc.diskWarn = patch.diskWarn;
  if (typeof patch.diskCritical === 'number') doc.diskCritical = patch.diskCritical;
  if (typeof patch.errorRateWarn === 'number') doc.errorRateWarn = patch.errorRateWarn;
  if (typeof patch.apiSlowWarnMs === 'number') doc.apiSlowWarnMs = patch.apiSlowWarnMs;
  if (typeof patch.apiSlowCriticalMs === 'number') doc.apiSlowCriticalMs = patch.apiSlowCriticalMs;
  if (patch.sensitivity) doc.sensitivity = patch.sensitivity;

  if (patch.notifications) {
    const cur = doc.notifications || ({} as ISystemMonitorConfig['notifications']);
    if (patch.notifications.emails) {
      cur.emails = patch.notifications.emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
    }
    if (patch.notifications.phones) {
      cur.phones = patch.notifications.phones.map((p) => p.trim()).filter(Boolean);
    }
    if (patch.notifications.slackWebhookUrl !== undefined) {
      cur.slackWebhookUrl = String(patch.notifications.slackWebhookUrl || '').trim();
    }
    if (typeof patch.notifications.notifyOnCritical === 'boolean') {
      cur.notifyOnCritical = patch.notifications.notifyOnCritical;
    }
    if (typeof patch.notifications.notifyOnWarning === 'boolean') {
      cur.notifyOnWarning = patch.notifications.notifyOnWarning;
    }
    if (typeof patch.notifications.cooldownMinutes === 'number') {
      cur.cooldownMinutes = Math.max(5, Math.min(1440, patch.notifications.cooldownMinutes));
    }
    doc.notifications = cur;
    doc.markModified('notifications');
  }

  await doc.save();
  cached = doc;
  return getPersistedMonitorSettings();
}

export async function getLastNotifiedMap(): Promise<Record<string, string>> {
  const doc = await loadSystemMonitorConfig();
  const raw = doc.lastNotifiedAt;
  if (!raw || typeof raw !== 'object') return {};
  return { ...(raw as Record<string, string>) };
}

export async function markNotified(dedupeKey: string): Promise<void> {
  const doc = await loadSystemMonitorConfig();
  const map = { ...(doc.lastNotifiedAt as Record<string, string>) };
  map[dedupeKey] = new Date().toISOString();
  doc.lastNotifiedAt = map;
  doc.markModified('lastNotifiedAt');
  await doc.save();
  cached = doc;
}
