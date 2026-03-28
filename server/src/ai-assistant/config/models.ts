import type { ModelTier } from '../types';

/** Default Google model IDs — override via TIER1_MODELS, TIER2_MODELS, TIER3_MODELS (comma-separated). */
const DEFAULT_TIER1 = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
];

const DEFAULT_TIER2 = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

const DEFAULT_TIER3 = [
  'gemma-3-27b-it',
  'gemma-3-12b-it',
  'gemma-3-4b-it',
  'gemma-3-2b-it',
  'gemma-3-1b-it',
];

function parseList(envVal: string | undefined, fallback: string[]): string[] {
  if (!envVal?.trim()) return [...fallback];
  return envVal
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Spec names (documentation); env overrides use real API model IDs. */
export const SPEC_TIER_NAMES = {
  tier1: ['gemini-3-flash', 'gemini-3.1-pro', 'gemini-2.5-pro', 'gemini-2-flash'],
  tier2: ['gemini-3.1-flash-lite', 'gemini-2.5-flash', 'gemini-2-flash-lite', 'gemini-2.5-flash-lite'],
  tier3: ['gemma-3-27b', 'gemma-3-12b', 'gemma-3-4b', 'gemma-3-2b', 'gemma-3-1b'],
} as const;

export function getModelsForTier(tier: ModelTier): string[] {
  const e = process.env;
  if (tier === 1) return parseList(e.TIER1_MODELS, DEFAULT_TIER1);
  if (tier === 2) return parseList(e.TIER2_MODELS, DEFAULT_TIER2);
  return parseList(e.TIER3_MODELS, DEFAULT_TIER3);
}
