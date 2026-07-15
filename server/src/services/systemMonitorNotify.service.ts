import { sendNotificationEmail, isEmailConfigured } from './emailService';
import {
  getPersistedMonitorSettings,
  markNotified,
  getLastNotifiedMap,
} from './systemMonitorConfig.service';
import type { SystemAlert } from './systemMonitor.service';
import { diagnoseSystemAlert } from './systemMonitorAi.service';
import { getClientUrl } from '../config/publicEnv';

function alertDedupeKey(alert: SystemAlert): string {
  if (alert.id === 'a-ok') return '';
  return `${alert.level}:${alert.title}`.toLowerCase().replace(/\s+/g, '_');
}

function shouldNotifyLevel(
  level: SystemAlert['level'],
  prefs: { notifyOnCritical: boolean; notifyOnWarning: boolean },
): boolean {
  if (level === 'critical') return prefs.notifyOnCritical;
  if (level === 'warning') return prefs.notifyOnWarning;
  return false;
}

async function postSlack(webhookUrl: string, text: string): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.warn('[systemMonitorNotify] Slack webhook failed:', err);
  }
}

export async function sendTestOpsNotification(targetEmail: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const email = targetEmail.trim().toLowerCase();
  if (!email) return { ok: false, message: 'Email is required' };
  if (!isEmailConfigured()) {
    return { ok: false, message: 'Email is not configured on the server (RESEND or SMTP)' };
  }
  const clientUrl = getClientUrl() || 'https://spacilly.com';
  const result = await sendNotificationEmail({
    to: email,
    subject: 'Spacilly system monitor — test alert',
    body: `This is a test notification from System Analysis.\n\nIf you receive this, ops email alerts are working.\n\nDashboard: ${clientUrl}/admin/system-analysis`,
    actionUrl: `${clientUrl}/admin/system-analysis`,
    actionLabel: 'Open System Analysis',
    name: 'Admin',
  });
  return result.success
    ? { ok: true, message: `Test email sent to ${email}` }
    : { ok: false, message: result.error || 'Send failed' };
}

export async function notifyAdminsOfAlerts(alerts: SystemAlert[]): Promise<void> {
  const settings = await getPersistedMonitorSettings();
  const { notifications } = settings;
  const emails = notifications.emails;
  const slack = notifications.slackWebhookUrl;
  if (!emails.length && !slack) return;

  const actionable = alerts.filter((a) => a.id !== 'a-ok' && shouldNotifyLevel(a.level, notifications));
  if (!actionable.length) return;

  const lastMap = await getLastNotifiedMap();
  const cooldownMs = notifications.cooldownMinutes * 60 * 1000;
  const now = Date.now();

  for (const alert of actionable) {
    const key = alertDedupeKey(alert);
    if (!key) continue;
    const last = lastMap[key];
    if (last && now - new Date(last).getTime() < cooldownMs) continue;

    const diagnosis = await diagnoseSystemAlert(alert, { settings });
    const fixList = diagnosis.fixes.map((f, i) => `${i + 1}. ${f}`).join('\n');
    const body = [
      `Level: ${alert.level.toUpperCase()}`,
      `Title: ${alert.title}`,
      `Detail: ${alert.message}`,
      '',
      `Summary: ${diagnosis.summary}`,
      `Likely cause: ${diagnosis.likelyCause}`,
      `Impact: ${diagnosis.impact}`,
      '',
      'Suggested fixes:',
      fixList,
      '',
      `Diagnosis source: ${diagnosis.source}`,
    ].join('\n');

    const subject = `[Spacilly ${alert.level}] ${alert.title}`;

    if (slack) {
      await postSlack(slack, `*${subject}*\n${body.slice(0, 3500)}`);
    }

    for (const to of emails) {
      if (!isEmailConfigured()) break;
      await sendNotificationEmail({
        to,
        subject,
        body,
        actionUrl: `${getClientUrl()}/admin/system-analysis`,
        actionLabel: 'View in admin',
        name: 'Ops team',
      });
    }

    if (notifications.phones.length && slack) {
      await postSlack(
        slack,
        `On-call phones on file: ${notifications.phones.join(', ')} (SMS not sent — configure Twilio to enable)`,
      );
    }

    await markNotified(key);
  }
}

export { diagnoseSystemAlert };
