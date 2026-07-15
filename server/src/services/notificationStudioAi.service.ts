/**
 * Gemini Flash–powered transforms for the admin Notification Studio.
 * Uses GEMINI_MODEL (e.g. gemini-flash-latest) for low-latency copy + moderation + scores.
 */

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || 'gemini-flash-latest').trim();

export type StudioAction =
  | 'generate'
  | 'rewrite'
  | 'improve'
  | 'shorten'
  | 'expand'
  | 'humanize'
  | 'fix_grammar'
  | 'add_cta'
  | 'add_urgency'
  | 'translate'
  | 'optimize';

export interface StudioTransformInput {
  action: StudioAction;
  channel: 'email' | 'sms' | 'push' | 'inapp';
  subject?: string;
  body: string;
  tone?: string;
  targetLanguage?: string;
  extraInstruction?: string;
}

export interface StudioTransformOutput {
  subject: string;
  body: string;
  moderation: {
    safe: boolean;
    warnings: string[];
    blockedPatterns: string[];
  };
  scores: {
    clarity: number;
    engagement: number;
    spamRisk: number;
    readability: number;
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function safeParseStudioJson(text: string): Partial<StudioTransformOutput> {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  try {
    return JSON.parse(t) as Partial<StudioTransformOutput>;
  } catch {
    return {};
  }
}

function normalizeOut(parsed: Partial<StudioTransformOutput>, fallbackSubject: string, fallbackBody: string): StudioTransformOutput {
  const subject = String(parsed.subject || fallbackSubject || '').slice(0, 200);
  const body = String(parsed.body || fallbackBody || '').slice(0, 12000);
  const mod: Partial<StudioTransformOutput['moderation']> = parsed.moderation ?? {};
  const warnings = Array.isArray(mod.warnings)
    ? mod.warnings.map((w: unknown) => String(w)).slice(0, 12)
    : [];
  const blockedPatterns = Array.isArray(mod.blockedPatterns)
    ? mod.blockedPatterns.map((w: unknown) => String(w)).slice(0, 12)
    : [];
  const safe = mod.safe !== false && blockedPatterns.length === 0;
  const sc: Partial<StudioTransformOutput['scores']> = parsed.scores ?? {};
  return {
    subject,
    body,
    moderation: { safe, warnings, blockedPatterns },
    scores: {
      clarity: clamp(Number(sc.clarity) || 70, 0, 100),
      engagement: clamp(Number(sc.engagement) || 70, 0, 100),
      spamRisk: clamp(Number(sc.spamRisk) || 20, 0, 100),
      readability: clamp(Number(sc.readability) || 70, 0, 100),
    },
  };
}

function buildSystemPrompt(): string {
  return [
    'You are Spacilly Notification Studio AI.',
    'Produce trustworthy marketplace notification copy only.',
    'Reject or flag phishing, credential harvesting, fake urgency scams, and illegal content.',
    'Keep SMS under 300 characters when channel is sms; push title+body concise.',
    'Use placeholders when helpful: {{buyer_name}}, {{seller_name}}, {{order_id}}, {{tracking_number}}, {{delivery_date}}.',
    'Respond ONLY with valid JSON (no markdown fences):',
    '{"subject":"string","body":"string",',
    '"moderation":{"safe":true|false,"warnings":["string"],"blockedPatterns":["string"]},',
    '"scores":{"clarity":0-100,"engagement":0-100,"spamRisk":0-100,"readability":0-100}}',
  ].join('\n');
}

function buildUserPrompt(input: StudioTransformInput): string {
  const lang = input.targetLanguage || '';
  const lines = [
    `Action: ${input.action}`,
    `Channel: ${input.channel}`,
    `Tone: ${input.tone || 'professional'}`,
    input.extraInstruction ? `Instruction: ${input.extraInstruction}` : '',
    lang && input.action === 'translate' ? `Target language (ISO name): ${lang}` : '',
    input.subject ? `Current subject: ${input.subject}` : '',
    `Current body / brief:\n${input.body}`,
  ];
  return lines.filter(Boolean).join('\n');
}

export async function runStudioTransform(input: StudioTransformInput): Promise<StudioTransformOutput> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL,
  )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: input.action === 'translate' ? 0.35 : 0.55,
        responseMimeType: 'application/json',
      },
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(input) }] }],
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error?.message || 'Gemini studio transform failed');
  }
  const text =
    payload?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p?.text || '').join('') || '';
  const parsed = safeParseStudioJson(String(text));
  return normalizeOut(parsed, input.subject || '', input.body);
}

/** Stream plain text tokens for typing UI (best-effort; not JSON). */
export async function streamStudioText(
  input: StudioTransformInput,
  onChunk: (text: string) => void,
): Promise<void> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL,
  )}:streamGenerateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const prompt = `${buildSystemPrompt()}\n\nFor this request, output ONLY the final notification body text (no JSON), channel ${input.channel}, action ${input.action}.\n\n${buildUserPrompt(input)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature: 0.55 },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Gemini stream failed');
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop() || '';
    for (const line of parts) {
      const s = line.trim();
      if (!s.startsWith('data:') || s === 'data: [DONE]') continue;
      try {
        const json = JSON.parse(s.slice(5).trim());
        const t =
          json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p?.text || '').join('') || '';
        if (t) onChunk(t);
      } catch {
        /* ignore parse errors on partial lines */
      }
    }
  }
}
