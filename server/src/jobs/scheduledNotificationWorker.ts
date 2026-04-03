import { ScheduledNotification } from '../models/ScheduledNotification';
import { User } from '../models/User';
import { SentNotificationLog } from '../models/SentNotificationLog';
import { createSystemInboxAndFanout } from '../services/systemInboxFanout';
import { sendNotificationEmail, isEmailConfigured } from '../services/emailService';

function mapScheduledTargetToAudience(
  target: string,
): 'all_buyers' | 'all_sellers' | 'all_admins' | 'everyone' {
  const t = (target || '').toLowerCase();
  if (t.includes('seller')) return 'all_sellers';
  if (t.includes('admin')) return 'all_admins';
  if (t.includes('everyone') || t.includes('all user')) return 'everyone';
  return 'all_buyers';
}

const EMAIL_BATCH = 80;

async function collectEmailsForScheduledTarget(target: string): Promise<string[]> {
  const aud = mapScheduledTargetToAudience(target);
  const pick = async (filter: Record<string, unknown>) => {
    const rows = await User.find(filter).select('email').limit(EMAIL_BATCH).lean();
    return rows.map((r: { email?: string }) => r.email).filter(Boolean) as string[];
  };
  if (aud === 'all_sellers') return pick({ role: 'seller' });
  if (aud === 'all_admins') return pick({ role: 'admin' });
  if (aud === 'everyone') return pick({});
  return pick({ role: 'buyer' });
}

let started = false;

/**
 * Processes due scheduled rows: in-app / system types create a SystemNotification and fan-out over WebSocket.
 */
export function startScheduledNotificationWorker(): void {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      const now = new Date();
      const due = await ScheduledNotification.find({
        status: 'active',
        scheduledFor: { $lte: now },
      })
        .limit(25)
        .lean();

      for (const s of due) {
        const type = String(s.type || '').toLowerCase();
        const isInApp = type === 'inapp' || type === 'in_app' || type === 'system';

        if (isInApp) {
          const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
          const createdBy = admin?._id;
          if (createdBy) {
            const aud = mapScheduledTargetToAudience(String(s.target));
            await createSystemInboxAndFanout({
              title: String(s.subject || s.name || 'Scheduled notice').slice(0, 240),
              message: String(s.body || '').slice(0, 8000),
              type: type === 'system' ? 'warning' : 'system_announcement',
              priority: type === 'system' ? 'high' : 'medium',
              targetAudience: aud,
              createdBy,
            });
          }
        }

        if (type === 'email' && isEmailConfigured()) {
          const subject = String(s.subject || s.name || 'Scheduled message').slice(0, 240);
          const body = String(s.body || '').slice(0, 8000);
          const recipients = await collectEmailsForScheduledTarget(String(s.target));
          for (const to of recipients) {
            const result = await sendNotificationEmail({
              to,
              subject,
              body,
            });
            await SentNotificationLog.create({
              recipient: to,
              type: 'email',
              subject,
              body,
              status: result.success ? 'sent' : 'failed',
              sentAt: new Date(),
            });
          }
        }

        if (s.recurring) {
          const next = new Date(
            now.getTime() + 24 * 60 * 60 * 1000,
          );
          await ScheduledNotification.updateOne({ _id: s._id }, { $set: { scheduledFor: next } });
        } else {
          await ScheduledNotification.updateOne({ _id: s._id }, { $set: { status: 'completed' } });
        }
      }
    } catch (e) {
      console.error('[scheduledNotificationWorker]', e);
    }
  };

  void tick();
  setInterval(tick, 60_000);
}
