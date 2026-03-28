import type { ModelTier, TaskComplexityResult } from '../types';

const TIER1_KEYWORDS =
  /\b(code|debug|analyze|architecture|fix|explain deeply)\b/i;

/**
 * - length > 500 → TIER 1
 * - tier-1 keywords → TIER 1
 * - short / casual heuristic → TIER 3
 * - default → TIER 2
 */
export function determineTaskComplexity(prompt: string): TaskComplexityResult {
  const trimmed = prompt.trim();
  const len = trimmed.length;

  const lengthWeight = Math.min(100, Math.round((len / 800) * 100));
  let keywordWeight = 0;
  const reasons: string[] = [];

  if (len > 500) {
    keywordWeight = Math.max(keywordWeight, 80);
    reasons.push('length>500');
  }

  if (TIER1_KEYWORDS.test(trimmed)) {
    keywordWeight = Math.max(keywordWeight, 90);
    reasons.push('tier1-keyword');
  }

  const complexityScore = Math.min(
    100,
    Math.round(lengthWeight * 0.45 + keywordWeight * 0.55),
  );

  let tier: ModelTier = 2;

  if (len > 500 || TIER1_KEYWORDS.test(trimmed)) {
    tier = 1;
  } else if (
    len <= 80 &&
    !/\?/.test(trimmed) &&
    !/\b(how|why|what|explain)\b/i.test(trimmed)
  ) {
    tier = 3;
    reasons.push('short-casual-heuristic');
  } else {
    tier = 2;
    reasons.push('default-standard');
  }

  return {
    tier,
    complexityScore,
    keywordWeight,
    lengthWeight,
    reasons,
  };
}
