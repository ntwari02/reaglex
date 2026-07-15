import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { adminCreateSystemInboxBroadcast } from '../controllers/systemNotificationController';
import { User } from '../models/User';
import { ScheduledNotification } from '../models/ScheduledNotification';
import { NotificationHistory } from '../models/NotificationHistory';
import { NotificationABTest } from '../models/NotificationABTest';
import { sendEmail, getResendClient } from '../services/emailService';
import {
  getDashboard,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getScheduled,
  createScheduled,
  updateScheduled,
  deleteScheduled,
  getAnalytics,
  getUserControlSettings,
  updateUserControlSettings,
  getLogs,
  getIntegrationSettings,
  updateIntegrationSettings,
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  getPermissions,
  updatePermission,
  getSystemAlerts,
  createSystemAlert,
  updateSystemAlert,
  deleteSystemAlert,
  generateNotificationCopy,
  improveNotificationCopy,
  runNotificationABTest,
  getNotificationEventLibrary,
} from '../controllers/adminNotificationsController';
import { getStudioAccessHint, postStudioTransform, postStudioStream } from '../controllers/notificationStudioController';

const EMAIL_PROVIDER = String(process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatComposerHtml(subj: string, msg: string): string {
  const safeSubj = escapeHtmlText(subj);
  const safeBody = escapeHtmlText(msg).replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <div style="background:#00BFA5;padding:16px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">Spacilly</h1>
  </div>
  <div style="background:#f9fafb;padding:24px;border-radius:0 0 8px 8px">
    <h2 style="color:#111827">${safeSubj}</h2>
    <p style="color:#374151;line-height:1.7">${safeBody}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="color:#9ca3af;font-size:12px">
      Spacilly · Kigali, Rwanda<br>
      <a href="{{unsubscribe_url}}" style="color:#9ca3af">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}

function parseAiJsonFromText(raw: string): { subjects?: { id: number; text: string }[]; bodies?: { id: number; text: string }[] } {
  let t = raw.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return JSON.parse(t) as { subjects?: { id: number; text: string }[]; bodies?: { id: number; text: string }[] };
}

type AudienceFilterPayload = {
  country?: string;
  language?: string;
  activeWithinDays?: number;
};

function audienceMatchQuery(base: Record<string, unknown>, filter?: AudienceFilterPayload): Record<string, unknown> {
  const q: Record<string, unknown> = { ...base };
  const country = String(filter?.country || '').trim();
  if (country) {
    q['addresses.country'] = country;
  }
  const language = String(filter?.language || '').trim();
  if (language) {
    q['preferences.language'] = language;
  }
  const days = Number(filter?.activeWithinDays);
  if (Number.isFinite(days) && days > 0 && days < 3650) {
    q.updatedAt = { $gte: new Date(Date.now() - days * 86400000) };
  }
  return q;
}

async function resolveBroadcastEmails(
  targetGroup: string | undefined,
  specificEmails: string[] | undefined,
  audienceFilter?: AudienceFilterPayload,
): Promise<string[]> {
  const extras = Array.isArray(specificEmails)
    ? specificEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    : [];
  const active = { accountStatus: 'active' as const };

  if (targetGroup === 'All Customers') {
    const users = await User.find(audienceMatchQuery({ role: 'buyer', ...active }, audienceFilter))
      .select('email')
      .lean();
    return users.map((u: { email?: string }) => u.email).filter(Boolean) as string[];
  }
  if (targetGroup === 'All Sellers') {
    const users = await User.find(audienceMatchQuery({ role: 'seller', ...active }, audienceFilter))
      .select('email')
      .lean();
    return users.map((u: { email?: string }) => u.email).filter(Boolean) as string[];
  }
  if (targetGroup === 'All Users') {
    const users = await User.find(
      audienceMatchQuery({ role: { $in: ['buyer', 'seller'] }, ...active }, audienceFilter),
    )
      .select('email')
      .lean();
    return users.map((u: { email?: string }) => u.email).filter(Boolean) as string[];
  }
  if (targetGroup === 'Verified Sellers') {
    const users = await User.find(
      audienceMatchQuery(
        {
          role: 'seller',
          ...active,
          $or: [{ sellerVerificationStatus: 'approved' }, { isSellerVerified: true }],
        },
        audienceFilter,
      ),
    )
      .select('email')
      .lean();
    return users.map((u: { email?: string }) => u.email).filter(Boolean) as string[];
  }
  if (targetGroup === 'Specific User' || targetGroup === 'Custom Segment') {
    return [...new Set(extras)];
  }
  return [...new Set(extras)];
}

async function sendBulkComposerEmails(
  recipients: string[],
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const from =
    process.env.EMAIL_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Spacilly <noreply@spacilly.com>';

  if (EMAIL_PROVIDER === 'resend') {
    const client = getResendClient();
    if (!client) {
      return { ok: false, error: 'Resend not configured (missing RESEND_API_KEY)' };
    }
    const BATCH_SIZE = 100;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const slice = recipients.slice(i, i + BATCH_SIZE);
      const batchPayload = slice.map((to) => ({
        from,
        to,
        subject,
        html,
      }));
      const out: { data?: unknown; error?: { message?: string } | string } = await (client as any).batch.send(
        batchPayload
      );
      if (out?.error) {
        const er = out.error;
        return {
          ok: false,
          error: typeof er === 'string' ? er : er?.message || 'Batch send failed',
        };
      }
    }
    return { ok: true };
  }

  for (const to of recipients) {
    const result = await sendEmail({ to, subject, html });
    if (!result.success) {
      return { ok: false, error: result.error || 'Email send failed' };
    }
  }
  return { ok: true };
}

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboard);

router.get('/user-search', async (req: AuthenticatedRequest, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ users: [] });
  }
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    const users = await User.find({
      role: { $ne: 'admin' },
      $or: [{ email: rx }, { fullName: rx }],
    })
      .select('fullName email role')
      .limit(12)
      .lean();
    res.json({
      users: (users as { email?: string; fullName?: string; role?: string }[]).map((u) => ({
        email: u.email,
        fullName: u.fullName,
        role: u.role,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Search failed' });
  }
});

router.get('/recipient-count', async (_req: AuthenticatedRequest, res: Response) => {
  const targetGroup = String(_req.query.targetGroup || '').trim();
  const audienceFilter: AudienceFilterPayload = {
    country: String(_req.query.country || '').trim() || undefined,
    language: String(_req.query.language || '').trim() || undefined,
    activeWithinDays: _req.query.activeWithinDays ? Number(_req.query.activeWithinDays) : undefined,
  };
  const active = { accountStatus: 'active' as const };
  try {
    if (targetGroup === 'All Customers') {
      const count = await User.countDocuments(audienceMatchQuery({ role: 'buyer', ...active }, audienceFilter));
      return res.json({ count });
    }
    if (targetGroup === 'All Sellers') {
      const count = await User.countDocuments(audienceMatchQuery({ role: 'seller', ...active }, audienceFilter));
      return res.json({ count });
    }
    if (targetGroup === 'All Users') {
      const count = await User.countDocuments(
        audienceMatchQuery({ role: { $in: ['buyer', 'seller'] }, ...active }, audienceFilter),
      );
      return res.json({ count });
    }
    if (targetGroup === 'Verified Sellers') {
      const count = await User.countDocuments(
        audienceMatchQuery(
          {
            role: 'seller',
            ...active,
            $or: [{ sellerVerificationStatus: 'approved' }, { isSellerVerified: true }],
          },
          audienceFilter,
        ),
      );
      return res.json({ count });
    }
    return res.json({ count: 0 });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed' });
  }
});

router.post('/generate-ai', async (req: AuthenticatedRequest, res: Response) => {
  const { targetGroup, notificationType, tone, context, existingSubject, existingBody, eventTrigger } = req.body || {};
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!geminiApiKey && !anthropicApiKey) {
    return res.status(503).json({
      error: 'AI unavailable',
      message: 'No AI provider configured. Set GEMINI_API_KEY.',
    });
  }

  const userPromptBase = `You are an expert notification copywriter for 
      Spacilly, Rwanda's #1 marketplace for buyers and verified 
      sellers. Write in ${tone || 'professional'} tone.

      Generate exactly 2 subject lines and 2 message bodies for 
      a ${notificationType || 'email'} notification sent to: ${targetGroup || 'all users'}.
      ${eventTrigger ? `Triggered by: ${eventTrigger}` : ''}
      ${context ? `Instruction: ${context}` : ''}
      ${existingBody ? `Improve this existing message: "${existingBody}"` : ''}
      ${existingSubject && !existingBody ? `Current subject (may refine): ${existingSubject}` : ''}

      Rules:
      - Subject lines: max 60 characters, compelling
      - Bodies: 2-4 sentences, personalized, action-oriented
      - Use {{username}} where a name would appear
      - Never mention competitors
      - End with a clear call to action

      Respond ONLY with valid JSON, no markdown, no extra text:
      {
        "subjects": [
          {"id": 1, "text": "subject line one"},
          {"id": 2, "text": "subject line two"}
        ],
        "bodies": [
          {"id": 1, "text": "full body message one"},
          {"id": 2, "text": "full body message two"}
        ]
      }`;

  const runModel = async (suffix = '') => {
    // Gemini is primary for notifications AI generation.
    if (geminiApiKey) {
      const geminiModel = String(process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest').trim();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: {
              temperature: 0.5,
              responseMimeType: 'application/json',
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userPromptBase + suffix }],
              },
            ],
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message || 'Gemini AI generation failed');
      }
      const text =
        payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p?.text || '').join('') ||
        payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
        '';
      return String(text).trim();
    }

    // Optional legacy fallback if Gemini key is unavailable in this environment.
    if (anthropicApiKey) {
      const anthropic = new Anthropic({ apiKey: anthropicApiKey });
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userPromptBase + suffix }],
      });
      const block = message.content.find((c) => c.type === 'text');
      if (block && block.type === 'text') {
        return block.text.trim();
      }
      return '';
    }

    throw new Error('GEMINI_API_KEY is not configured');
  };

  try {
    let rawText = await runModel();
    let parsed: ReturnType<typeof parseAiJsonFromText>;
    try {
      parsed = parseAiJsonFromText(rawText);
    } catch (parseErr) {
      console.warn('[generate-ai] JSON parse failed, retrying once:', parseErr);
      rawText = await runModel(
        '\n\nYour previous reply was not valid JSON. Output ONLY the JSON object with subjects and bodies arrays, no markdown fences, no commentary.'
      );
      try {
        parsed = parseAiJsonFromText(rawText);
      } catch {
        return res.status(500).json({ message: 'AI generation failed, please try again' });
      }
    }
    return res.json(parsed);
  } catch (err: unknown) {
    console.error('AI generation error:', err);
    if (err instanceof APIError) {
      return res.status(503).json({ message: err.message || 'AI service temporarily unavailable' });
    }
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ message: message || 'AI generation failed, please try again' });
  }
});

router.post('/send', async (req: AuthenticatedRequest, res: Response) => {
  const {
    targetGroup,
    specificEmails,
    notificationType,
    subject,
    body,
    scheduledAt,
    isTestSend,
    testEmail,
    audienceFilter,
    recurring,
  } = req.body || {};

  const subj = String(subject || '').trim();
  const msgBody = String(body || '').trim();
  const html = formatComposerHtml(subj, msgBody);
  const typeStr = String(notificationType || 'email').toLowerCase();
  const sentById = req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id) ? req.user.id : undefined;

  try {
    if (isTestSend) {
      const to = String(testEmail || '').trim();
      if (!to) {
        return res.status(400).json({ error: 'Bad request', message: 'testEmail is required for test send' });
      }
      const result = await sendEmail({
        to,
        subject: `[TEST] ${subj}`,
        html,
      });
      if (!result.success) {
        return res.status(500).json({ error: 'Send failed', message: result.error || 'Email send failed' });
      }
      return res.json({
        success: true,
        message: `Test email sent to ${to}`,
      });
    }

    if (scheduledAt) {
      await ScheduledNotification.create({
        name: subj.slice(0, 80) || 'Scheduled broadcast',
        target: String(targetGroup || 'custom'),
        scheduledFor: new Date(scheduledAt),
        recurring: Boolean(recurring),
        status: 'active',
        type: String(notificationType || 'email'),
        subject: subj,
        body: msgBody,
        createdBy: sentById ? new mongoose.Types.ObjectId(sentById) : undefined,
      });
      return res.json({
        success: true,
        message: `Scheduled for ${scheduledAt}`,
      });
    }

    const filterPayload =
      audienceFilter && typeof audienceFilter === 'object'
        ? (audienceFilter as AudienceFilterPayload)
        : undefined;
    const emails = await resolveBroadcastEmails(
      typeof targetGroup === 'string' ? targetGroup : undefined,
      Array.isArray(specificEmails) ? specificEmails : undefined,
      filterPayload,
    );

    if (typeStr === 'email' && emails.length > 0) {
      const bulk = await sendBulkComposerEmails(emails, subj, html);
      if (!bulk.ok) {
        return res.status(500).json({ error: 'Send failed', message: bulk.error || 'Email send failed' });
      }
      await NotificationHistory.create({
        targetGroup: String(targetGroup || 'custom'),
        recipientCount: emails.length,
        subject: subj,
        body: msgBody,
        type: typeStr,
        sentAt: new Date(),
        sentBy: sentById ? new mongoose.Types.ObjectId(sentById) : undefined,
        status: 'sent',
      });
    }

    return res.json({
      success: true,
      message:
        typeStr === 'email' && emails.length > 0
          ? `Sent to ${emails.length} recipients`
          : `No email recipients (channel: ${typeStr}, matched: ${emails.length})`,
      recipientCount: emails.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Send error:', err);
    res.status(500).json({ error: 'Send failed', message });
  }
});

router.post('/ab-test', async (req: AuthenticatedRequest, res: Response) => {
  const { variantA, variantB, targetGroup, subject, notificationType, recipientCount } = req.body || {};
  const subj = String(subject || '').trim() || 'A/B test';
  const va = String(variantA || '').trim();
  const vb = String(variantB || '').trim();
  const typeStr = String(notificationType || 'email').toLowerCase();
  const specific = Array.isArray((req.body as { specificEmails?: string[] }).specificEmails)
    ? (req.body as { specificEmails: string[] }).specificEmails
    : undefined;

  try {
    if (!va || !vb) {
      return res.status(400).json({ message: 'Both variants are required' });
    }

    const emails = await resolveBroadcastEmails(
      typeof targetGroup === 'string' ? targetGroup : undefined,
      specific
    );

    if (emails.length === 0) {
      return res.status(400).json({ message: 'No recipients matched this target' });
    }

    const mid = Math.ceil(emails.length / 2);
    const groupA = emails.slice(0, mid);
    const groupB = emails.slice(mid);
    const sentById = req.user?.id && mongoose.Types.ObjectId.isValid(req.user.id) ? req.user.id : undefined;

    if (typeStr === 'email') {
      const rA = await sendBulkComposerEmails(groupA, `${subj} (A)`, formatComposerHtml(`${subj} (A)`, va));
      if (!rA.ok) {
        return res.status(500).json({ message: rA.error || 'Failed to send variant A' });
      }
      const rB = await sendBulkComposerEmails(groupB, `${subj} (B)`, formatComposerHtml(`${subj} (B)`, vb));
      if (!rB.ok) {
        return res.status(500).json({ message: rB.error || 'Failed to send variant B' });
      }
    }

    await NotificationABTest.create({
      variantA: va,
      variantB: vb,
      targetGroup: String(targetGroup || 'custom'),
      recipientCount: typeof recipientCount === 'number' ? recipientCount : emails.length,
      variantARecipients: groupA,
      variantBRecipients: groupB,
      sentAt: new Date(),
      status: 'running',
      subject: subj,
      createdBy: sentById ? new mongoose.Types.ObjectId(sentById) : undefined,
    });

    const n = emails.length;
    return res.json({
      success: true,
      message: `A/B test launched to ${n} recipients`,
      recipientCount: n,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'A/B test failed', message });
  }
});
router.post('/ai/generate-copy', generateNotificationCopy);
router.post('/ai/improve-copy', improveNotificationCopy);
router.post('/ai/ab-test', runNotificationABTest);
router.get('/ai/events', getNotificationEventLibrary);
router.post('/ai/studio-transform', postStudioTransform);
router.post('/ai/studio-stream', postStudioStream);
router.get('/studio-access', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return res.json(getStudioAccessHint(req));
});

/** In-app system inbox row (visible to buyers/sellers/admins per audience) */
router.post('/in-app', adminCreateSystemInboxBroadcast);

// Templates
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.patch('/templates/:templateId', updateTemplate);
router.delete('/templates/:templateId', deleteTemplate);

// Scheduled
router.get('/scheduled', getScheduled);
router.post('/scheduled', createScheduled);
router.patch('/scheduled/:scheduledId', updateScheduled);
router.delete('/scheduled/:scheduledId', deleteScheduled);

// Analytics
router.get('/analytics', getAnalytics);

// User control settings
router.get('/settings/user-control', getUserControlSettings);
router.put('/settings/user-control', updateUserControlSettings);

// Logs
router.get('/logs', getLogs);

// Integration settings
router.get('/settings/integrations', getIntegrationSettings);
router.put('/settings/integrations', updateIntegrationSettings);

// Automation rules
router.get('/automation-rules', getAutomationRules);
router.post('/automation-rules', createAutomationRule);
router.patch('/automation-rules/:ruleId', updateAutomationRule);
router.delete('/automation-rules/:ruleId', deleteAutomationRule);

// Permissions
router.get('/permissions', getPermissions);
router.patch('/permissions/:permissionId', updatePermission);

// System alerts
router.get('/alerts', getSystemAlerts);
router.post('/alerts', createSystemAlert);
router.patch('/alerts/:alertId', updateSystemAlert);
router.delete('/alerts/:alertId', deleteSystemAlert);

export default router;
