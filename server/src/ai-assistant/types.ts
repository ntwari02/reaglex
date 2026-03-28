export type ModelTier = 1 | 2 | 3;

export interface TaskComplexityResult {
  tier: ModelTier;
  complexityScore: number;
  keywordWeight: number;
  lengthWeight: number;
  reasons: string[];
}

export interface CacheEntry {
  prompt: string;
  response: string;
  embedding?: number[];
  timestamp: number;
}
