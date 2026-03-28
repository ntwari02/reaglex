import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiClientError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'GeminiClientError';
  }
}

export interface TimeoutOptions {
  timeoutMs: number;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new GeminiClientError(`timeout:${label}`, 'TIMEOUT')),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function generateText(
  apiKey: string,
  modelId: string,
  prompt: string,
  options: TimeoutOptions,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });
  const result = await withTimeout(
    model.generateContent(prompt),
    options.timeoutMs,
    modelId,
  );
  const text = result.response.text();
  if (!text?.trim()) {
    throw new GeminiClientError('empty response', 'EMPTY');
  }
  return text;
}

export async function generateWithSystemInstruction(
  apiKey: string,
  modelId: string,
  systemInstruction: string,
  userText: string,
  options: TimeoutOptions,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemInstruction }],
    },
  });
  const result = await withTimeout(
    model.generateContent(userText),
    options.timeoutMs,
    modelId,
  );
  const text = result.response.text();
  if (!text?.trim()) {
    throw new GeminiClientError('empty response', 'EMPTY');
  }
  return text;
}

export async function embedText(
  apiKey: string,
  modelId: string,
  text: string,
  timeoutMs: number,
): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });
  const m = model as unknown as {
    embedContent: (req: unknown) => Promise<{ embedding?: { values?: number[] } }>;
  };
  const result = await withTimeout(
    m.embedContent({ content: { parts: [{ text }] } }),
    timeoutMs,
    `embed:${modelId}`,
  );
  const emb = result.embedding?.values;
  if (!emb?.length) {
    throw new GeminiClientError('no embedding', 'EMBED_EMPTY');
  }
  return emb;
}
