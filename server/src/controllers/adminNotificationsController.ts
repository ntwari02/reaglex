import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationTemplate } from '../models/NotificationTemplate';
import { ScheduledNotification } from '../models/ScheduledNotification';
import { SentNotificationLog } from '../models/SentNotificationLog';
import { AdminNotificationSettings } from '../models/AdminNotificationSettings';
import { NotificationAutomationRule } from '../models/NotificationAutomationRule';
import { NotificationPermission } from '../models/NotificationPermission';
import { AdminSystemAlert } from '../models/AdminSystemAlert';
import { User } from '../models/User';
import { sendNotificationEmail, isEmailConfigured } from '../services/emailService';
import mongoose from 'mongoose';

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

function toId(doc: { _id: mongoose.Types.ObjectId }): string {
  return doc._id.toString();
}

// ---------- Dashboard ----------
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalSent,
      emailSent,
      smsSent,
      pushSent,
      inAppSent,
      failedCount,
      scheduledCount,
      recentLogs,
      prevTotalSent,
      prevFailedCount,
    ] = await Promise.all([
      SentNotificationLog.countDocuments({ sentAt: { $gte: startOfMonth } }),
      SentNotificationLog.countDocuments({ type: 'email', sentAt: { $gte: startOfMonth } }),
      SentNotificationLog.countDocuments({ type: 'sms', sentAt: { $gte: startOfMonth } }),
      SentNotificationLog.countDocuments({ type: 'push', sentAt: { $gte: startOfMonth } }),
      SentNotificationLog.countDocuments({ type: 'inapp', sentAt: { $gte: startOfMonth } }),
      SentNotificationLog.countDocuments({ status: 'failed', sentAt: { $gte: startOfMonth } }),
      ScheduledNotification.countDocuments({ status: 'active' }),
      SentNotificationLog.find({})
        .sort({ sentAt: -1 })
        .limit(20)
        .lean(),
      SentNotificationLog.countDocuments({ sentAt: { $gte: startOfPrevMonth, $lt: startOfMonth } }),
      SentNotificationLog.countDocuments({
        status: 'failed',
        sentAt: { $gte: startOfPrevMonth, $lt: startOfMonth },
      }),
    ]);

    const total = totalSent || 1;
    const deliveryRate = Math.round(((totalSent - failedCount) / total) * 1000) / 10;
    const prevTotalSafe = prevTotalSent || 1;
    const prevDeliveryRate = Math.round(((prevTotalSent - prevFailedCount) / prevTotalSafe) * 1000) / 10;
    const totalChange =
      prevTotalSent > 0 ? Math.round((((totalSent - prevTotalSent) / prevTotalSent) * 100) * 10) / 10 : 0;
    const deliveryChange = Math.round((deliveryRate - prevDeliveryRate) * 10) / 10;

    const recent = (recentLogs as any[]).map((r) => {
      const { _id, ...rest } = r;
      const sentAt = r.sentAt
        ? (() => {
            const d = new Date(r.sentAt);
            const diff = Date.now() - d.getTime();
            if (diff < 60000) return 'Just now';
            if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
            return d.toLocaleDateString();
          })()
        : '';
      return { ...rest, id: toId(r), sentAt };
    });

    res.json({
      stats: {
        totalSent,
        emailSent,
        smsSent,
        pushSent,
        inAppSent,
        deliveryRate,
        failedCount,
        scheduledCount,
        totalChange,
        deliveryChange,
      },
      recentNotifications: recent,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch dashboard' });
  }
}

// ---------- Send notification (create + log, send real email when type is email) ----------
export async function sendNotification(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const targetGroup = (body.targetGroup as string) || 'all_customers';
    const types = (body.types as string[]) || ['inapp'];
    const subject = (body.subject as string) || '';
    const message = (body.message as string) || '';
    const recipient = (body.recipient as string) || 'broadcast';

    const logs: any[] = [];
    const emailsToSend: string[] = [];

    if (types.includes('email') && recipient && recipient !== 'broadcast') {
      if (recipient.includes('@')) {
        emailsToSend.push(recipient);
      } else {
        const user = await User.findById(recipient).select('email').lean();
        if (user?.email) emailsToSend.push(user.email);
      }
    } else if (types.includes('email') && recipient === 'broadcast' && targetGroup === 'all_customers') {
      const users = await User.find({}).select('email').limit(100).lean();
      users.forEach((u: any) => { if (u.email) emailsToSend.push(u.email); });
    }

    if (types.includes('email') && emailsToSend.length > 0 && isEmailConfigured()) {
      for (const to of emailsToSend) {
        const result = await sendNotificationEmail({
          to,
          subject: subject || 'Notification',
          body: message,
          actionUrl: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/login` : undefined,
          actionLabel: 'View',
        });
        const log = await SentNotificationLog.create({
          recipient: to,
          type: 'email',
          subject: subject || 'Notification',
          body: message,
          status: result.success ? 'sent' : 'failed',
          sentAt: new Date(),
        });
        logs.push({ ...log.toObject(), id: toId(log) });
      }
    }

    for (const type of types) {
      if (!['email', 'sms', 'push', 'inapp'].includes(type)) continue;
      if (type === 'email' && emailsToSend.length > 0) continue;
      const log = await SentNotificationLog.create({
        recipient,
        type: type as 'email' | 'sms' | 'push' | 'inapp',
        subject,
        body: message,
        status: 'sent',
        sentAt: new Date(),
      });
      logs.push({ ...log.toObject(), id: toId(log) });
    }
    res.status(201).json({ message: 'Notification sent', logs });
  } catch (e) {
    console.error('[adminNotifications] sendNotification error:', e);
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to send' });
  }
}

// ---------- Templates ----------
export async function getTemplates(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const category = (req.query.category as string)?.trim() || '';
    const query: any = {};
    if (search) query.name = new RegExp(search, 'i');
    if (category && category !== 'all') query.category = category;
    const list = await NotificationTemplate.find(query).lean().sort({ updatedAt: -1 });
    const templates = list.map((t: any) => {
      const { _id, ...rest } = t;
      return { ...rest, id: toId(t), lastModified: t.updatedAt ? new Date(t.updatedAt).toISOString().slice(0, 10) : '' };
    });
    res.json({ templates });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch templates' });
  }
}

export async function createTemplate(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const template = await (NotificationTemplate as any).create({
      name: body.name,
      category: body.category || 'General',
      type: body.type || 'inapp',
      subject: body.subject,
      content: body.content || '',
      variables: body.variables || [],
    } as any) as any;
    const t = template.toObject();
    res.status(201).json({ template: { ...t, id: toId(template), lastModified: template.updatedAt?.toISOString?.()?.slice(0, 10) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create template' });
  }
}

export async function updateTemplate(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const template = await NotificationTemplate.findByIdAndUpdate(req.params.templateId, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    const { _id, ...rest } = template as any;
    res.json({ template: { ...rest, id: _id.toString(), lastModified: rest.updatedAt ? new Date(rest.updatedAt).toISOString().slice(0, 10) : '' } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update template' });
  }
}

export async function deleteTemplate(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const deleted = await NotificationTemplate.findByIdAndDelete(req.params.templateId);
    if (!deleted) return res.status(404).json({ message: 'Template not found' });
    res.json({ message: 'Template deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete template' });
  }
}

// ---------- Scheduled ----------
export async function getScheduled(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await ScheduledNotification.find({}).lean().sort({ scheduledFor: 1 });
    const scheduled = list.map((s: any) => ({
      ...s,
      id: toId(s),
      scheduledFor: s.scheduledFor ? new Date(s.scheduledFor).toISOString() : '',
    }));
    res.json({ scheduled });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch scheduled' });
  }
}

export async function createScheduled(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const scheduled = await (ScheduledNotification as any).create({
      name: body.name,
      target: body.target || 'All Customers',
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor as string) : new Date(),
      recurring: body.recurring ?? false,
      status: 'active',
      type: body.type || 'email',
      subject: body.subject,
      body: body.body,
    } as any) as any;
    const s = scheduled.toObject();
    res.status(201).json({ scheduled: { ...s, id: toId(scheduled), scheduledFor: scheduled.scheduledFor?.toISOString?.() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create scheduled' });
  }
}

export async function updateScheduled(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const update: any = {};
    if (body.status !== undefined) update.status = body.status;
    if (body.scheduledFor !== undefined) update.scheduledFor = new Date(body.scheduledFor as string);
    if (body.name !== undefined) update.name = body.name;
    if (body.target !== undefined) update.target = body.target;
    if (body.recurring !== undefined) update.recurring = body.recurring;
    if (body.type !== undefined) update.type = body.type;
    const scheduled = await ScheduledNotification.findByIdAndUpdate(req.params.scheduledId, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!scheduled) return res.status(404).json({ message: 'Scheduled not found' });
    const { _id, ...rest } = scheduled as any;
    res.json({ scheduled: { ...rest, id: _id.toString(), scheduledFor: rest.scheduledFor ? new Date(rest.scheduledFor).toISOString() : '' } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update scheduled' });
  }
}

export async function deleteScheduled(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const deleted = await ScheduledNotification.findByIdAndDelete(req.params.scheduledId);
    if (!deleted) return res.status(404).json({ message: 'Scheduled not found' });
    res.json({ message: 'Scheduled deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete scheduled' });
  }
}

// ---------- Analytics ----------
export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [byChannel, byGeo, failedReasons] = await Promise.all([
      SentNotificationLog.aggregate([
        { $match: { sentAt: { $gte: startOfMonth } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $project: { label: '$_id', value: '$count' } },
      ]).then((r) =>
        r.map((x: any) => ({
          label: x.label === 'email' ? 'Email' : x.label === 'sms' ? 'SMS' : x.label === 'push' ? 'Push' : 'In-App',
          value: x.value,
        }))
      ),
      SentNotificationLog.aggregate([
        { $match: { sentAt: { $gte: startOfMonth } } },
        { $group: { _id: '$recipient', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { label: '$_id', value: '$count' } },
      ]),
      SentNotificationLog.aggregate([
        { $match: { status: 'failed', sentAt: { $gte: startOfMonth } } },
        { $group: { _id: '$failureReason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { reason: { $ifNull: ['$_id', 'Unknown'] }, count: '$count' } },
      ]),
    ]);

    const channelData = byChannel;
    const geoData = byGeo.map((x: any) => ({ label: String(x.label).slice(0, 20), value: x.value }));
    const failedList = failedReasons;

    const [emailSent, emailFailed, smsSent, smsFailed, pushSent, pushFailed, totalSent, totalFailed] =
      await Promise.all([
        SentNotificationLog.countDocuments({ type: 'email', sentAt: { $gte: startOfMonth } }),
        SentNotificationLog.countDocuments({ type: 'email', status: 'failed', sentAt: { $gte: startOfMonth } }),
        SentNotificationLog.countDocuments({ type: 'sms', sentAt: { $gte: startOfMonth } }),
        SentNotificationLog.countDocuments({ type: 'sms', status: 'failed', sentAt: { $gte: startOfMonth } }),
        SentNotificationLog.countDocuments({ type: 'push', sentAt: { $gte: startOfMonth } }),
        SentNotificationLog.countDocuments({ type: 'push', status: 'failed', sentAt: { $gte: startOfMonth } }),
        SentNotificationLog.countDocuments({ sentAt: { $gte: startOfMonth } }),
        SentNotificationLog.countDocuments({ status: 'failed', sentAt: { $gte: startOfMonth } }),
      ]);

    const pct = (ok: number, totalCount: number) =>
      totalCount > 0 ? Math.round((ok / totalCount) * 1000) / 10 : 0;

    res.json({
      metrics: {
        emailOpenRate: pct(emailSent - emailFailed, emailSent),
        smsDelivery: pct(smsSent - smsFailed, smsSent),
        clickThroughRate: pct(totalSent - totalFailed, totalSent),
        pushDelivery: pct(pushSent - pushFailed, pushSent),
      },
      channelData,
      geoData,
      failedNotifications: failedList,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch analytics' });
  }
}

// ---------- User control settings ----------
export async function getUserControlSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await AdminNotificationSettings.findOne().lean();
    if (!doc) {
      await AdminNotificationSettings.create({
        customerSettings: { orderUpdates: true, promotions: true, feedbackReminders: false },
        sellerSettings: { newOrderAlerts: true, paymentAlerts: true, accountStatusUpdates: true },
        channelPreferences: { email: true, sms: true, push: true },
      });
      doc = await AdminNotificationSettings.findOne().lean();
    }
    const d = doc as any;
    res.json({
      customerSettings: d?.customerSettings ?? {},
      sellerSettings: d?.sellerSettings ?? {},
      channelPreferences: d?.channelPreferences ?? {},
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch settings' });
  }
}

export async function updateUserControlSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    await AdminNotificationSettings.findOneAndUpdate(
      {},
      {
        customerSettings: body.customerSettings,
        sellerSettings: body.sellerSettings,
        channelPreferences: body.channelPreferences,
      },
      { new: true, upsert: true }
    );
    res.json({ message: 'Settings updated' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update settings' });
  }
}

// ---------- Logs ----------
export async function getLogs(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const status = (req.query.status as string)?.trim() || '';
    const type = (req.query.type as string)?.trim() || '';
    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (search) {
      query.$or = [
        { recipient: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
      ];
    }
    const list = await SentNotificationLog.find(query).lean().sort({ sentAt: -1 }).limit(200);
    const logs = list.map((l: any) => {
      const { _id, ...rest } = l;
      return { ...rest, id: toId(l), sentAt: l.sentAt ? new Date(l.sentAt).toISOString() : '' };
    });
    res.json({ logs });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch logs' });
  }
}

// ---------- Integration settings ----------
export async function getIntegrationSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await AdminNotificationSettings.findOne().lean();
    if (!doc) {
      await AdminNotificationSettings.create({});
      doc = await AdminNotificationSettings.findOne().lean();
    }
    const d = doc as any;
    res.json({
      smtp: d?.smtp ?? { host: '', port: '', username: '', fromEmail: '' },
      sms: d?.sms ?? { provider: 'twilio', apiKeyMasked: '' },
      push: d?.push ?? { fcmKeyMasked: '' },
      webhooks: d?.webhooks ?? [],
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch integration settings' });
  }
}

export async function updateIntegrationSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const update: any = {};
    if (body.smtp) update.smtp = body.smtp;
    if (body.sms) update.sms = { provider: (body.sms as any)?.provider ?? 'twilio', apiKeyMasked: '***' };
    if (body.push) update.push = { fcmKeyMasked: '***' };
    if (body.webhooks) update.webhooks = body.webhooks;
    await AdminNotificationSettings.findOneAndUpdate({}, { $set: update }, { new: true, upsert: true });
    res.json({ message: 'Integration settings updated' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update integration settings' });
  }
}

// ---------- Automation rules ----------
export async function getAutomationRules(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await NotificationAutomationRule.find({}).lean().sort({ name: 1 });
    const rules = list.map((r: any) => {
      const { _id, ...rest } = r;
      return { ...rest, id: toId(r) };
    });
    res.json({ rules });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch rules' });
  }
}

export async function createAutomationRule(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const rule = await (NotificationAutomationRule as any).create({
      name: body.name,
      condition: body.condition || '',
      trigger: body.trigger || '',
      notificationType: body.notificationType || 'email',
      status: body.status ?? 'active',
    } as any) as any;
    const r = rule.toObject();
    res.status(201).json({ rule: { ...r, id: toId(rule) } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create rule' });
  }
}

export async function updateAutomationRule(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const rule = await NotificationAutomationRule.findByIdAndUpdate(req.params.ruleId, body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    const { _id, ...rest } = rule as any;
    res.json({ rule: { ...rest, id: _id.toString() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update rule' });
  }
}

export async function deleteAutomationRule(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const deleted = await NotificationAutomationRule.findByIdAndDelete(req.params.ruleId);
    if (!deleted) return res.status(404).json({ message: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete rule' });
  }
}

export async function getPermissions(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await NotificationPermission.find({}).lean().sort({ name: 1 });
    const permissions = list.map((p: any) => {
      const { _id, ...rest } = p;
      return { ...rest, id: toId(p) };
    });
    res.json({ permissions });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch permissions' });
  }
}

export async function updatePermission(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const permission = await NotificationPermission.findByIdAndUpdate(
      req.params.permissionId,
      { allowed: req.body.allowed },
      { new: true, runValidators: true }
    ).lean();
    if (!permission) return res.status(404).json({ message: 'Permission not found' });
    const { _id, ...rest } = permission as any;
    res.json({ permission: { ...rest, id: _id.toString() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update permission' });
  }
}

// ---------- System alerts ----------
export async function getSystemAlerts(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const severity = (req.query.severity as string)?.trim() || '';
    const query: any = {};
    if (severity && severity !== 'all') query.severity = severity;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }
    const list = await AdminSystemAlert.find(query).lean().sort({ createdAt: -1 });
    const alerts = list.map((a: any) => {
      const { _id, ...rest } = a;
      return { ...rest, id: toId(a), createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : '' };
    });
    res.json({ alerts });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch alerts' });
  }
}

export async function createSystemAlert(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const alert = await (AdminSystemAlert as any).create({
      type: body.type,
      title: body.title || '',
      description: body.description || '',
      severity: body.severity || 'medium',
      status: body.status ?? 'open',
      assignedTo: body.assignedTo,
    } as any) as any;
    const a = alert.toObject();
    res.status(201).json({ alert: { ...a, id: toId(alert), createdAt: alert.createdAt?.toISOString?.() } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create alert' });
  }
}

export async function updateSystemAlert(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const update: any = {};
    if (body.status !== undefined) update.status = body.status;
    if (body.assignedTo !== undefined) update.assignedTo = body.assignedTo;
    const alert = await AdminSystemAlert.findByIdAndUpdate(req.params.alertId, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    const { _id, ...rest } = alert as any;
    res.json({ alert: { ...rest, id: _id.toString(), createdAt: rest.createdAt ? new Date(rest.createdAt).toISOString() : '' } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update alert' });
  }
}

export async function deleteSystemAlert(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const deleted = await AdminSystemAlert.findByIdAndDelete(req.params.alertId);
    if (!deleted) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete alert' });
  }
}
