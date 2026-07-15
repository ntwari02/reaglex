import {
  getNotificationEventDefinition,
  sanitizeCustomEventKey,
} from '../constants/notificationEvents';

interface NotificationCopyGenerateInput {
  prompt: string;
  tone: 'professional' | 'friendly' | 'urgent' | 'promotional' | 'informative';
  contextType: string;
  customEventKey?: string;
  variables?: string[];
}

interface NotificationCopyImproveInput {
  subject?: string;
  message: string;
}

export interface NotificationCopyOutput {
  subject: string[];
  messages: string[];
}

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL = String(
  process.env.NOTIFICATION_COPY_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest',
).trim();
const GEMINI_FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash',
];

function safeList(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return fallback;
  const list = input
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .map((x) => x.replace(/[<>]/g, ''));
  return list.length ? list : fallback;
}

function sanitizeOutput(json: any, mode: 'generate' | 'improve'): NotificationCopyOutput {
  const fallbackSubject =
    mode === 'generate'
      ? ['Update from Spacilly', 'Important marketplace update', 'Action needed on Spacilly']
      : ['Improved update from Spacilly', 'Clearer notification update'];
  const fallbackMessages =
    mode === 'generate'
      ? [
          'Hello {{username}}, your marketplace update is ready. Please review details in your Spacilly account.',
          'Hi {{username}}, we have an update for your activity on Spacilly. Open your account to continue.',
          'Hello {{username}}, there is a new update related to your Spacilly activity. Please check now.',
        ]
      : [
          'Hello {{username}}, here is an improved version of your notification. Please review in Spacilly.',
          'Hi {{username}}, your notification has been refined for clarity and impact. Check Spacilly for details.',
        ];
  return {
    subject: safeList(json?.subject, fallbackSubject).slice(0, mode === 'generate' ? 3 : 2),
    messages: safeList(json?.messages, fallbackMessages).slice(0, mode === 'generate' ? 3 : 2),
  };
}

function candidateModels(): string[] {
  return [...new Set(GEMINI_FALLBACK_MODELS.map((m) => String(m || '').trim()).filter(Boolean))];
}

function isModelResolutionError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('not found for api version') ||
    m.includes('is not supported for generatecontent') ||
    m.includes('models/') ||
    m.includes('model') && m.includes('not found')
  );
}

async function callGeminiWithModel(
  model: string,
  systemInstruction: string,
  userPrompt: string,
): Promise<NotificationCopyOutput> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.65,
        responseMimeType: 'application/json',
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${systemInstruction}\n\nUser request:\n${userPrompt}\n\nReturn only valid JSON.`,
            },
          ],
        },
      ],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Failed to generate AI copy with model ${model}`);
  }
  const text =
    payload?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') ||
    payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '{}';
  let parsed: any = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }
  const mode: 'generate' | 'improve' = Array.isArray(parsed?.messages) && parsed.messages.length <= 2 ? 'improve' : 'generate';
  return sanitizeOutput(parsed, mode);
}

async function callGemini(systemInstruction: string, userPrompt: string): Promise<NotificationCopyOutput> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set');
  }
  let lastError: Error | null = null;
  for (const model of candidateModels()) {
    try {
      return await callGeminiWithModel(model, systemInstruction, userPrompt);
    } catch (err: any) {
      const message = String(err?.message || 'Failed to generate AI copy');
      lastError = new Error(message);
      if (!isModelResolutionError(message)) {
        throw lastError;
      }
    }
  }
  throw lastError || new Error('Failed to generate AI copy');
}

export async function generateNotificationCopy(input: NotificationCopyGenerateInput): Promise<NotificationCopyOutput> {
  const knownEvent = getNotificationEventDefinition(input.contextType);
  const customEventKey = !knownEvent ? sanitizeCustomEventKey(input.customEventKey || input.contextType) : '';
  const eventLabel = knownEvent?.label || customEventKey.replace(/_/g, ' ') || input.contextType;
  const eventClass = knownEvent?.class || 'transactional';
  const eventVariables = Array.from(
    new Set([...(knownEvent?.variables || []), ...(input.variables || [])]),
  ).filter(Boolean);

  const system = [
    'You are Spacilly notification copywriter AI.',
    'Write concise, trustworthy marketplace notifications.',
    'Avoid spammy language and hype.',
    'Respect selected tone and context.',
    'Treat transactional events as clear and factual.',
    'Treat alert events as urgent but calm and direct.',
    'Treat promotional events as benefit-led and engaging without spam.',
    'Prefer actionable copy with clear next step.',
    'Use placeholders safely: {{username}}, {{order_id}}, {{product_name}}, {{delivery_date}} when relevant.',
    'Output JSON shape exactly: {"subject": ["..."], "messages": ["...", "...", "..."]}',
    'Return exactly 3 subject lines and 3 messages.',
  ].join('\n');
  const prompt = [
    `Tone: ${input.tone}`,
    `Notification context key: ${input.contextType}`,
    `Notification context label: ${eventLabel}`,
    `Message class: ${eventClass}`,
    `Custom event key: ${customEventKey || '(none)'}`,
    `Event variables to use when relevant: ${eventVariables.join(', ') || '(none)'}`,
    `Prompt: ${input.prompt}`,
  ].join('\n');
  const out = await callGemini(system, prompt);
  return sanitizeOutput(out, 'generate');
}

export async function improveNotificationCopy(input: NotificationCopyImproveInput): Promise<NotificationCopyOutput> {
  const system = [
    'You improve existing Spacilly notification copy.',
    'Keep original intent.',
    'Make it clearer, tighter, and more engaging.',
    'No spam, no excessive urgency.',
    'Output JSON shape exactly: {"subject": ["..."], "messages": ["...", "..."]}',
    'Return exactly 2 improved subjects and 2 improved messages.',
  ].join('\n');
  const prompt = `Current subject: ${input.subject || '(none)'}\nCurrent message: ${input.message}`;
  const out = await callGemini(system, prompt);
  return sanitizeOutput(out, 'improve');
}

