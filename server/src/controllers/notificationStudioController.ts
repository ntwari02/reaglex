import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { runStudioTransform, streamStudioText, type StudioAction } from '../services/notificationStudioAi.service';

const ACTIONS = new Set<StudioAction>([
  'generate',
  'rewrite',
  'improve',
  'shorten',
  'expand',
  'humanize',
  'fix_grammar',
  'add_cta',
  'add_urgency',
  'translate',
  'optimize',
]);

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

/**
 * Role hints for UI until JWT carries admin tiers.
 * NOTIFICATION_STUDIO_MARKETING_EMAILS — comma list → marketing_admin badge; else super_admin.
 * NOTIFICATION_STUDIO_SUPPORT_EMAILS — comma list → support_admin badge.
 */
export function getStudioAccessHint(req: AuthenticatedRequest): {
  role: 'super_admin' | 'support_admin' | 'marketing_admin';
} {
  const email = (req.user?.email || '').toLowerCase();
  const marketing = String(process.env.NOTIFICATION_STUDIO_MARKETING_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const support = String(process.env.NOTIFICATION_STUDIO_SUPPORT_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (marketing.includes(email)) return { role: 'marketing_admin' };
  if (support.includes(email)) return { role: 'support_admin' };
  return { role: 'super_admin' };
}

export async function postStudioTransform(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const action = String(body.action || 'improve').toLowerCase() as StudioAction;
    if (!ACTIONS.has(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }
    const channel = String(body.channel || 'email').toLowerCase();
    if (!['email', 'sms', 'push', 'inapp'].includes(channel)) {
      return res.status(400).json({ message: 'Invalid channel' });
    }
    const subject = String(body.subject || '').trim();
    const text = String(body.body || body.message || '').trim();
    if (!text && action !== 'generate') {
      return res.status(400).json({ message: 'body is required' });
    }
    const out = await runStudioTransform({
      action,
      channel: channel as 'email' | 'sms' | 'push' | 'inapp',
      subject: subject || undefined,
      body: text || 'Write a concise notification from the instruction only.',
      tone: String(body.tone || 'professional'),
      targetLanguage: String(body.targetLanguage || '').trim() || undefined,
      extraInstruction: String(body.extraInstruction || '').trim() || undefined,
    });
    return res.json({ ...out, access: getStudioAccessHint(req) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Studio transform failed';
    return res.status(500).json({ message });
  }
}

export async function postStudioStream(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const action = String(body.action || 'rewrite').toLowerCase() as StudioAction;
    if (!ACTIONS.has(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }
    const channel = String(body.channel || 'email').toLowerCase();
    if (!['email', 'sms', 'push', 'inapp'].includes(channel)) {
      return res.status(400).json({ message: 'Invalid channel' });
    }
    const subject = String(body.subject || '').trim();
    const text = String(body.body || body.message || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'body is required' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    await streamStudioText(
      {
        action,
        channel: channel as 'email' | 'sms' | 'push' | 'inapp',
        subject: subject || undefined,
        body: text,
        tone: String(body.tone || 'professional'),
        targetLanguage: String(body.targetLanguage || '').trim() || undefined,
        extraInstruction: String(body.extraInstruction || '').trim() || undefined,
      },
      (chunk) => {
        res.write(chunk);
      },
    );
    res.end();
  } catch (e: unknown) {
    if (!res.headersSent) {
      const message = e instanceof Error ? e.message : 'Stream failed';
      res.status(500).json({ message });
    } else {
      res.end();
    }
  }
}
