import { User } from '../models/User';
import { AdminIntelligenceConfig } from '../models/AdminIntelligenceConfig';
import type { IntelligenceQueryUnderstanding } from '../search/intelligenceSearch.types';

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = String(
  process.env.INTELLIGENCE_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
).trim();

const AI_MODELS = [
  GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

export interface IntelligenceAiInsight {
  interpretation: string;
  nextSteps: string[];
  alternativeQueries: string[];
  /** Identifiers Gemini thinks we should search (phone, email, order id, payment ref) */
  extractedTerms: string[];
  focusModules: string[];
}

export function isGeminiConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}

async function getPlatformAiEnabled(): Promise<boolean> {
  const { isSystemFeatureEnabled } = await import('./systemFeatureSettings.service');
  if (!(await isSystemFeatureEnabled('admin_intelligence_gemini'))) return false;
  const row = await AdminIntelligenceConfig.findOne({ key: 'default' }).lean();
  if (!row) return true;
  return row.platformAiEnabled !== false;
}

export async function getIntelligenceAiConfig(
  adminUserId: string,
  opts?: { canManagePlatformAi?: boolean },
): Promise<{
  geminiConfigured: boolean;
  platformAiEnabled: boolean;
  userAiAssistEnabled: boolean;
  aiAvailable: boolean;
  canManagePlatformAi?: boolean;
}> {
  const [platformAiEnabled, user] = await Promise.all([
    getPlatformAiEnabled(),
    User.findById(adminUserId).select('preferences.intelligenceAiAssist').lean(),
  ]);
  const userAiAssistEnabled = Boolean(user?.preferences?.intelligenceAiAssist);
  const geminiConfigured = isGeminiConfigured();
  const aiAvailable = geminiConfigured && platformAiEnabled;
  return {
    geminiConfigured,
    platformAiEnabled,
    userAiAssistEnabled,
    aiAvailable: aiAvailable && userAiAssistEnabled,
    ...(opts?.canManagePlatformAi !== undefined
      ? { canManagePlatformAi: opts.canManagePlatformAi }
      : {}),
  };
}

export async function setUserIntelligenceAiAssist(
  adminUserId: string,
  enabled: boolean,
): Promise<{ userAiAssistEnabled: boolean }> {
  await User.findByIdAndUpdate(adminUserId, {
    $set: { 'preferences.intelligenceAiAssist': Boolean(enabled) },
  });
  return { userAiAssistEnabled: Boolean(enabled) };
}

export async function setPlatformIntelligenceAiEnabled(
  enabled: boolean,
): Promise<{ platformAiEnabled: boolean }> {
  const row = await AdminIntelligenceConfig.findOneAndUpdate(
    { key: 'default' },
    { $set: { platformAiEnabled: Boolean(enabled) } },
    { upsert: true, new: true },
  ).lean();
  return { platformAiEnabled: row?.platformAiEnabled !== false };
}

export async function shouldRunAiAssist(adminUserId: string): Promise<boolean> {
  if (!isGeminiConfigured()) return false;
  const cfg = await getIntelligenceAiConfig(adminUserId);
  return cfg.aiAvailable;
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = jsonBlock || trimmed;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeInsight(json: Record<string, unknown> | null, fallback: string): IntelligenceAiInsight {
  const strList = (key: string, max: number): string[] => {
    const v = json?.[key];
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => String(x || '').trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, max);
  };
  return {
    interpretation: String(json?.interpretation || fallback).slice(0, 500),
    nextSteps: strList('nextSteps', 5),
    alternativeQueries: strList('alternativeQueries', 4),
    extractedTerms: strList('extractedTerms', 6),
    focusModules: strList('focusModules', 6),
  };
}

async function callGeminiJson(system: string, user: string): Promise<Record<string, unknown> | null> {
  if (!GEMINI_API_KEY) return null;

  for (const model of [...new Set(AI_MODELS)]) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
          },
          contents: [{ role: 'user', parts: [{ text: user }] }],
        }),
      });
      const payload = (await res.json()) as {
        error?: { message?: string };
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      if (!res.ok) {
        const msg = payload?.error?.message || res.statusText;
        if (/not found|not supported/i.test(msg)) continue;
        throw new Error(msg);
      }
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return safeJsonParse(text);
    } catch (e) {
      if (e instanceof Error && e.name === 'TimeoutError') throw e;
      continue;
    }
  }
  return null;
}

/** Gemini interprets admin query + light result context — never blocks search on failure. */
export async function buildIntelligenceAiInsight(input: {
  query: string;
  understanding: IntelligenceQueryUnderstanding;
  resultCount: number;
  hitSummaries: Array<{ type: string; title: string; subtitle: string; status?: string }>;
}): Promise<IntelligenceAiInsight | null> {
  const system = `You are Spacilly Smart Admin Assistant — an operational intelligence helper (not a chatbot).
You do NOT access the database. You only interpret the admin query and the search hits already returned.
Write like a calm, modern support lead: short, human, no jargon, no robotic repetition.
Vary wording each time; never reuse the same opening phrase.
Output JSON only:
- interpretation: 1-2 sentences (main summary, most important first)
- nextSteps: up to 4 short suggested actions for the admin
- alternativeQueries: up to 4 different search strings to try
- extractedTerms: phones, emails, order ids, payment refs from the query only
- focusModules: subset of Users, Sellers, Orders, Payments, Disputes, Support, Products
Never invent record IDs. If results are empty, suggest concrete identifiers.`;

  const hitsText =
    input.hitSummaries.length > 0
      ? input.hitSummaries
          .slice(0, 10)
          .map((h) => `- [${h.type}] ${h.title} | ${h.subtitle}${h.status ? ` (${h.status})` : ''}`)
          .join('\n')
      : '(no results yet)';

  const user = `Admin query: "${input.query}"
Rule-based intent: ${input.understanding.intentLabel}
Rule summary: ${input.understanding.summary}
Scopes: ${input.understanding.searchScope.join(', ')}
Result count: ${input.resultCount}
Top hits:
${hitsText}`;

  try {
    const json = await callGeminiJson(system, user);
    return normalizeInsight(
      json,
      input.resultCount > 0
        ? 'Review the linked records on the right for payment, seller, and order details.'
        : 'Try a phone number, email, order ID, or payment reference from the customer.',
    );
  } catch (e) {
    console.warn('[intelligenceAiAssist]', e instanceof Error ? e.message : e);
    return null;
  }
}

/** While typing — quick interpretation only (no hits). */
export async function buildTypingAiHint(
  query: string,
  understanding: IntelligenceQueryUnderstanding,
): Promise<{ hint: string; extractedTerms: string[] } | null> {
  if (!GEMINI_API_KEY || query.trim().length < 4) return null;

  const system = `You are Spacilly Smart Admin Assistant while the admin types in intelligence search.
Return JSON: { "hint": "one fresh, specific sentence about what to look for — vary phrasing", "extractedTerms": ["phone, email, order id, payment ref if present"] }
Be concise, professional, operational. No chatbot tone. Do not invent data.`;

  try {
    const json = await callGeminiJson(
      system,
      `Admin typed: "${query}"\nRules already detected: ${understanding.summary}`,
    );
    if (!json) return null;
    const hint = String(json.hint || '').slice(0, 280);
    const extractedTerms = Array.isArray(json.extractedTerms)
      ? (json.extractedTerms as unknown[]).map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
      : [];
    if (!hint) return null;
    return { hint, extractedTerms };
  } catch {
    return null;
  }
}
