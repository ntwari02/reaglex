/**
 * Gemini-first seller notification copy (swappable LLM layer).
 */
import type {
  SellerNotificationContext,
  SellerNotificationEvent,
  SellerNotificationCopy,
  SellerNotificationGeminiPayload,
} from './types';
import {
  applyBehavioralRules,
  buildVisualStyle,
  clampMessageWords,
  deepLinkFor,
  normalizePriority,
  normalizeTone,
  wordCount,
} from './utils';

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const MODEL = String(
  process.env.SELLER_NOTIFICATION_MODEL ||
    process.env.NOTIFICATION_COPY_MODEL ||
    process.env.GEMINI_MODEL ||
    'gemini-1.5-flash-latest',
).trim();

const MODEL_CANDIDATES = [
  MODEL,
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
].filter(Boolean);

function sanitize(s: string, max: number): string {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function isValidPayload(json: any, event: SellerNotificationEvent, ctx: SellerNotificationContext): boolean {
  const title = sanitize(json?.title, 80);
  const message = sanitize(json?.message, 220);
  const wc = wordCount(message);
  if (!title || !message || wc < 6 || wc > 28) return false;
  const spam = ['act now', 'urgent urgent', '!!!', 'last chance'];
  const lower = `${title} ${message}`.toLowerCase();
  if (spam.some((s) => lower.includes(s))) return false;

  const deepLink = sanitize(json?.deepLink, 200) || deepLinkFor(event, ctx);
  if (!deepLink.startsWith('/seller')) return false;

  return true;
}

function mapGeminiToCopy(
  json: any,
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext,
): Omit<SellerNotificationCopy, 'source'> {
  const fallbackPriority =
    event === 'dispute_opened' || event === 'subscription_payment_failed' ? 'high' : 'medium';
  const vs = json?.visualStyle || {};
  const built = buildVisualStyle(event, ctx);

  return applyBehavioralRules(
    {
      title: sanitize(json?.title, 80),
      message: clampMessageWords(sanitize(json?.message, 220)),
      tone: normalizeTone(json?.tone),
      priority: normalizePriority(json?.priority, fallbackPriority),
      actionLabel: sanitize(json?.actionLabel, 40) || 'View details',
      deepLink: sanitize(json?.deepLink, 200) || deepLinkFor(event, ctx),
      visualStyle: {
        showProductPreview:
          typeof vs.showProductPreview === 'boolean' ? vs.showProductPreview : built.showProductPreview,
        compact: vs.compact !== false,
        thumbnailCount: Math.min(
          3,
          Math.max(0, Number(vs.thumbnailCount ?? built.thumbnailCount) || built.thumbnailCount),
        ),
      },
    },
    event,
    ctx,
  );
}

function buildSystemPrompt(): string {
  return [
    'You write seller notifications for a modern ecommerce marketplace (Spacilly).',
    'Style: calm like Stripe, Notion, Linear — never alarmist or spammy.',
    'Message length: 8–22 words. Title: short and clear (max 8 words).',
    'Tones: soft | medium | operational | reassuring | clear-operational.',
    'Priority: low | medium | high.',
    'Use only facts from the provided context. Never invent order numbers or amounts.',
    'deepLink must be a relative path starting with /seller',
    'Return JSON only:',
    '{"title":"","message":"","tone":"","priority":"","actionLabel":"","deepLink":"","visualStyle":{"showProductPreview":true,"compact":true,"thumbnailCount":1}}',
  ].join('\n');
}

function buildUserPrompt(event: SellerNotificationEvent, ctx: SellerNotificationContext): string {
  return JSON.stringify(
    {
      event,
      sellerId: ctx.sellerId,
      orderNumber: ctx.orderNumber,
      orderId: ctx.orderId,
      caseNumber: ctx.caseNumber,
      disputeNumber: ctx.disputeNumber,
      amount: ctx.amount,
      currency: ctx.currency,
      affectedCount: ctx.affectedCount,
      hoursSinceUpdate: ctx.hoursSinceUpdate,
      sellerActiveOnOrder: Boolean(ctx.sellerActiveOnOrder),
      reminderCount: ctx.reminderCount || 0,
      planName: ctx.planName,
      previousPlanName: ctx.previousPlanName,
      renewalDate: ctx.renewalDate,
      messagePreview: ctx.messagePreview,
      suggestedDeepLink: deepLinkFor(event, ctx),
      behavioralHints: {
        ifSellerActive: 'reduce urgency, acknowledge progress',
        ifDelay: 'gently highlight risk without alarm',
        ifReminderCountHigh: 'increase clarity gradually, not aggression',
      },
    },
    null,
    2,
  );
}

async function callGemini(system: string, user: string): Promise<SellerNotificationGeminiPayload | null> {
  if (!GEMINI_API_KEY) return null;
  let lastErr: Error | null = null;
  for (const model of [...new Set(MODEL_CANDIDATES)]) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationConfig: { temperature: 0.72, responseMimeType: 'application/json' },
          contents: [{ role: 'user', parts: [{ text: `${system}\n\nContext:\n${user}\n\nReturn JSON only.` }] }],
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error?.message || `Gemini ${model} failed`);
      const text =
        payload?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '{}';
      return JSON.parse(text) as SellerNotificationGeminiPayload;
    } catch (e: any) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

export async function generateSellerNotificationWithGemini(
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext,
): Promise<SellerNotificationCopy | null> {
  const json = await callGemini(buildSystemPrompt(), buildUserPrompt(event, ctx));
  if (!json || !isValidPayload(json, event, ctx)) return null;
  const mapped = mapGeminiToCopy(json, event, ctx);
  return { ...mapped, source: 'gemini' };
}
