import { ComplianceProfile } from '../models/ComplianceProfile';
import { User } from '../models/User';
import { createSystemInboxAndFanout } from '../services/systemInboxFanout';
import { sendRichNotificationEmail, isEmailConfigured } from '../services/emailService';
import { pickCta } from '../email/copyEngine';
import { getClientUrl } from '../config/publicEnv';

let started = false;

type Stage = string;

function stageMessage(stage: Stage, certNo: string, expiry: Date) {
  if (stage === 'expired') {
    return {
      title: `Compliance certificate expired (${certNo || 'unknown'})`,
      message: `The compliance certificate expired on ${expiry.toLocaleDateString()}. Renew immediately to maintain Rwanda NCSA readiness.`,
      priority: 'high' as const,
      type: 'warning' as const,
    };
  }
  const days = Number(stage.replace('before_', ''));
  return {
    title: `Compliance certificate renewal reminder (${days} days)`,
    message: `Certificate ${certNo || 'unknown'} expires on ${expiry.toLocaleDateString()}. Renewal preparation is required.`,
    priority: 'medium' as const,
    type: 'system_announcement' as const,
  };
}

function determineStages(daysUntilExpiry: number, daysBeforeExpiry: number[]): Stage[] {
  const stages: Stage[] = [];
  const uniqueDays = Array.from(new Set((daysBeforeExpiry || []).filter((d) => Number.isFinite(d) && d > 0)))
    .map((d) => Math.round(d))
    .sort((a, b) => b - a);
  for (const d of uniqueDays) {
    if (daysUntilExpiry <= d && daysUntilExpiry >= 0) {
      stages.push(`before_${d}`);
      break;
    }
  }
  if (daysUntilExpiry < 0) stages.push('expired');
  return stages;
}

export function startComplianceCertificateReminderJob(): void {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      const profile = await ComplianceProfile.findOne();
      if (!profile?.certificateExpiresAt) return;
      const settings = profile.reminderSettings || {
        enabled: true,
        inAppEnabled: true,
        emailEnabled: false,
        daysBeforeExpiry: [90, 30, 7],
      };
      if (!settings.enabled) return;

      const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
      if (!admin?._id) return;

      const expiry = new Date(profile.certificateExpiresAt);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const stages = determineStages(daysUntilExpiry, settings.daysBeforeExpiry || [90, 30, 7]);
      if (!stages.length) return;

      const alreadySent = new Set((profile.certificateReminderLogs || []).map((l) => l.stage));
      for (const stage of stages) {
        if (alreadySent.has(stage)) continue;
        const payload = stageMessage(stage, profile.certificateNumber || '', expiry);
        if (settings.inAppEnabled) {
          await createSystemInboxAndFanout({
            title: payload.title,
            message: payload.message,
            type: payload.type,
            priority: payload.priority,
            targetAudience: 'all_admins',
            createdBy: admin._id,
          });
        }
        if (settings.emailEnabled && isEmailConfigured()) {
          const admins = await User.find({ role: 'admin' }).select('email').limit(100).lean();
          for (const row of admins) {
            if (!row.email) continue;
            await sendRichNotificationEmail({
              to: row.email,
              subject: payload.title,
              name: 'Admin',
              category: 'general',
              headline: payload.title,
              message: payload.message,
              actionUrl: `${getClientUrl()}/admin`,
              actionLabel: pickCta('general', row.email),
              accent: payload.priority === 'high' ? 'warning' : 'brand',
              preheader: payload.message.slice(0, 120),
            });
          }
        }
        profile.certificateReminderLogs.push({ stage, sentAt: new Date() });
      }
      await profile.save();
    } catch (error) {
      console.error('[complianceCertificateReminderJob]', error);
    }
  };

  void tick();
  setInterval(tick, 6 * 60 * 60 * 1000);
}

