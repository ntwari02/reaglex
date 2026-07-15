/**
 * Gemini-powered email copy with deterministic fallback (copyEngine).
 * Never blocks sends when AI is unavailable.
 */
import {
  browseAbandonIntro,
  browseAbandonSubject,
  cartIntro,
  cartPulseIntro,
  cartPulseSubject,
  cartSubject,
  marketingDayKey,
  pickCta,
  recommendationIntro,
  recommendationSubject,
  winbackIntro,
  winbackSubject,
  type EmailCategory,
} from './copyEngine';
import {
  shouldUseGeminiMarketingCopy,
  shouldUseGeminiTransactionalPolish,
} from './emailNotificationPolicy.service';

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const EMAIL_COPY_MODEL = String(
  process.env.EMAIL_COPY_MODEL || process.env.NOTIFICATION_COPY_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
).trim();

const MODEL_CANDIDATES = [
  EMAIL_COPY_MODEL,
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
].filter(Boolean);

export type MarketingCampaign =
  | 'recommendation'
  | 'cart_pulse'
  | 'browse_abandon'
  | 'winback'
  | 'abandoned_cart';

export type MarketingCopyInput = {
  userId: string;
  firstName: string;
  campaign: MarketingCampaign;
  mode?: 'deals_only' | 'mixed';
  cartTemplate?: string;
  allowPersonalized?: boolean;
  /** Avoid repeating recent recommendation-lane subject lines */
  recentSubjects?: string[];
  recentCampaigns?: string[];
  copyDayKey?: string;
  products: Array<{
    id: string;
    name: string;
    category?: string;
    reason?: string;
    discount?: number;
  }>;
};

export type MarketingCopyResult = {
  subject: string;
  headline: string;
  intro: string;
  ctaLabel: string;
  productDescriptions: Record<string, string>;
  source: 'gemini' | 'fallback';
};

export type TransactionalEnhanceInput = {
  userId: string;
  firstName: string;
  category: EmailCategory;
  eventKey: string;
  headline: string;
  message: string;
  actionLabel: string;
};

export type TransactionalEnhanceResult = {
  message: string;
  actionLabel: string;
  source: 'gemini' | 'fallback' | 'unchanged';
};

function sanitizeText(s: string, max = 280): string {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function isSpammy(s: string): boolean {
  const lower = s.toLowerCase();
  const banned = [
    'act now',
    'limited time only',
    'you won',
    'free money',
    'click here now',
    '!!!',
    'urgent urgent',
    'last chance forever',
  ];
  return banned.some((b) => lower.includes(b));
}

function normalizeCopyLine(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function subjectTooSimilar(subject: string, recentSubjects: string[]): boolean {
  const n = normalizeCopyLine(subject);
  if (!n) return false;
  return recentSubjects.some((r) => {
    const rn = normalizeCopyLine(r);
    return rn && (rn === n || rn.includes(n) || n.includes(rn));
  });
}

function fallbackMarketingCopy(input: MarketingCopyInput): MarketingCopyResult {
  const { userId, firstName, campaign, mode, cartTemplate, allowPersonalized } = input;
  const dayKey = input.copyDayKey || marketingDayKey();
  const recentSubjects = input.recentSubjects || [];
  const productDescriptions: Record<string, string> = {};
  for (const p of input.products) {
    productDescriptions[p.id] = sanitizeText(
      p.reason ||
        (p.discount && p.discount > 0
          ? `Save ${Math.round(p.discount)}% on this pick.`
          : 'A popular choice shoppers are exploring right now.'),
      100,
    );
  }

  if (campaign === 'abandoned_cart') {
    return {
      subject: cartSubject(userId, cartTemplate),
      headline: 'Your cart is waiting',
      intro: cartIntro(userId),
      ctaLabel: pickCta('cart', `${userId}:cart`),
      productDescriptions,
      source: 'fallback',
    };
  }

  if (campaign === 'cart_pulse') {
    let subject = cartPulseSubject(firstName, userId, dayKey);
    if (subjectTooSimilar(subject, recentSubjects)) {
      subject = cartPulseSubject(firstName, `${userId}:alt`, dayKey);
    }
    return {
      subject,
      headline: 'Complete your cart',
      intro: allowPersonalized ? cartPulseIntro(userId, dayKey) : cartPulseIntro(`${userId}:generic`, dayKey),
      ctaLabel: pickCta('cart', `${userId}:cart-pulse:${dayKey}`),
      productDescriptions,
      source: 'fallback',
    };
  }

  if (campaign === 'browse_abandon') {
    let subject = browseAbandonSubject(firstName, userId, dayKey);
    if (subjectTooSimilar(subject, recentSubjects)) {
      subject = browseAbandonSubject(firstName, `${userId}:alt`, dayKey);
    }
    return {
      subject,
      headline: 'From your recent browsing',
      intro: allowPersonalized ? browseAbandonIntro(userId, dayKey) : browseAbandonIntro(`${userId}:generic`, dayKey),
      ctaLabel: pickCta('recommendation', `${userId}:browse:${dayKey}`),
      productDescriptions,
      source: 'fallback',
    };
  }

  if (campaign === 'winback') {
    let subject = winbackSubject(firstName, userId, dayKey);
    if (subjectTooSimilar(subject, recentSubjects)) {
      subject = winbackSubject(firstName, `${userId}:alt`, dayKey);
    }
    return {
      subject,
      headline: 'Welcome back to Spacilly',
      intro: winbackIntro(userId, dayKey),
      ctaLabel: pickCta('recommendation', `${userId}:winback:${dayKey}`),
      productDescriptions,
      source: 'fallback',
    };
  }

  let subject = recommendationSubject(firstName, userId, dayKey);
  if (subjectTooSimilar(subject, recentSubjects)) {
    subject = recommendationSubject(firstName, `${userId}:alt`, dayKey);
  }
  return {
    subject,
    headline: 'Curated for you',
    intro: recommendationIntro(userId, mode, dayKey),
    ctaLabel: pickCta('recommendation', `${userId}:${dayKey}`),
    productDescriptions,
    source: 'fallback',
  };
}

async function callGeminiJson(system: string, user: string): Promise<any> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  let lastErr: Error | null = null;
  for (const model of [...new Set(MODEL_CANDIDATES)]) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
          contents: [{ role: 'user', parts: [{ text: `${system}\n\n${user}\n\nReturn only JSON.` }] }],
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error?.message || `Gemini error ${model}`);
      const text =
        payload?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') || '{}';
      return JSON.parse(text);
    } catch (e: any) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr || new Error('Gemini failed');
}

export async function generateMarketingEmailCopy(input: MarketingCopyInput): Promise<MarketingCopyResult> {
  const fallback = fallbackMarketingCopy(input);
  if (!(await shouldUseGeminiMarketingCopy())) {
    return fallback;
  }

  const productLines = input.products
    .slice(0, 8)
    .map(
      (p) =>
        `- ${p.name}${p.category ? ` (${p.category})` : ''}${p.reason ? ` [signal: ${p.reason}]` : ''}${p.discount ? ` [${p.discount}% off]` : ''}`,
    )
    .join('\n');

  const recentSubjects = (input.recentSubjects || []).slice(0, 6);
  const recentCampaigns = (input.recentCampaigns || []).slice(0, 6);

  const system = [
    'You write premium ecommerce marketing email copy for Spacilly marketplace.',
    'Tone: warm, human, concise, never spammy.',
    'No fake urgency, no ALL CAPS hype, no "act now" clichés.',
    'Use the shopper first name naturally once.',
    'Product reasons must be factual and tied to provided signals only.',
    'Each campaign has a distinct voice: recommendation=curated picks, cart_pulse=cart add-ons, browse_abandon=recent views, winback=return visit.',
    'Never reuse phrasing from recentSubjects — write fresh subject and intro wording.',
    'Output JSON only:',
    '{"subject":"","headline":"","intro":"","ctaLabel":"","products":[{"id":"","description":""}]}',
    'subject max 70 chars, intro max 220 chars, each product description max 90 chars.',
  ].join('\n');

  const user = [
    `Campaign: ${input.campaign}`,
    `First name: ${input.firstName}`,
    `Personalized: ${input.allowPersonalized !== false}`,
    `Mode: ${input.mode || 'mixed'}`,
    recentSubjects.length ? `Recent subjects to avoid repeating:\n${recentSubjects.map((s) => `- ${s}`).join('\n')}` : '',
    recentCampaigns.length ? `Recent campaigns sent: ${recentCampaigns.join(', ')}` : '',
    `Products:\n${productLines || '(none)'}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const json = await callGeminiJson(system, user);
    const subject = sanitizeText(json?.subject, 70);
    const intro = sanitizeText(json?.intro, 220);
    const headline = sanitizeText(json?.headline || subject, 60);
    const ctaLabel = sanitizeText(json?.ctaLabel, 40);
    if (!subject || !intro || isSpammy(subject) || isSpammy(intro) || subjectTooSimilar(subject, recentSubjects)) {
      return fallback;
    }

    const productDescriptions: Record<string, string> = { ...fallback.productDescriptions };
    if (Array.isArray(json?.products)) {
      for (const row of json.products) {
        const id = String(row?.id || '').trim();
        const desc = sanitizeText(row?.description, 100);
        if (id && desc && !isSpammy(desc)) productDescriptions[id] = desc;
      }
    }

    return {
      subject,
      headline,
      intro,
      ctaLabel: ctaLabel || fallback.ctaLabel,
      productDescriptions,
      source: 'gemini',
    };
  } catch {
    return fallback;
  }
}

export async function enhanceTransactionalEmailCopy(
  input: TransactionalEnhanceInput,
): Promise<TransactionalEnhanceResult> {
  if (!(await shouldUseGeminiTransactionalPolish())) {
    return { message: input.message, actionLabel: input.actionLabel, source: 'unchanged' };
  }

  const system = [
    'Rewrite marketplace notification email body copy.',
    'Keep facts identical. Improve clarity and warmth.',
    'No spam. Max 2 sentences.',
    'Output JSON: {"message":"","actionLabel":""}',
  ].join('\n');

  const user = [
    `Category: ${input.category}`,
    `Event: ${input.eventKey}`,
    `Headline: ${input.headline}`,
    `Current message: ${input.message}`,
    `Current CTA: ${input.actionLabel}`,
    `Name: ${input.firstName}`,
  ].join('\n');

  try {
    const json = await callGeminiJson(system, user);
    const message = sanitizeText(json?.message, 320);
    const actionLabel = sanitizeText(json?.actionLabel, 40);
    if (!message || isSpammy(message)) {
      return { message: input.message, actionLabel: input.actionLabel, source: 'fallback' };
    }
    return {
      message,
      actionLabel: actionLabel || input.actionLabel,
      source: 'gemini',
    };
  } catch {
    return { message: input.message, actionLabel: input.actionLabel, source: 'fallback' };
  }
}
