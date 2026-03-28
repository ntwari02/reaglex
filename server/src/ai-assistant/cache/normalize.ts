/** Normalize for exact-match cache keys. */
export function normalizePromptForCache(prompt: string): string {
  return prompt
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s\u00c0-\u024f]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
