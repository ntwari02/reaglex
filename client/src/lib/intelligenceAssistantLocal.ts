/** Client-side typing brief — mirrors server rule engine for instant feedback. */

import type { IntelligenceAssistantBrief } from '@/services/adminIntelligenceSearchApi';
import type { LocalQueryUnderstanding } from '@/lib/intelligenceQueryHints';

function hashPick(seed: string, options: string[]): string {
  if (!options.length) return '';
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 9973;
  return options[h % options.length];
}

const TITLES: Record<string, string[]> = {
  email: ['Account lookup', 'Email trace', 'Customer identity'],
  phone: ['Phone lookup', 'Contact match', 'Caller identity'],
  order_id: ['Order dossier', 'Order investigation', 'Shipment trail'],
  payment_ref: ['Payment trace', 'Transaction review', 'Funds check'],
  general: ['Registry scan', 'Platform lookup', 'Operational search'],
  idle: ['Smart admin assistant', 'Registry intelligence', 'Ready to search'],
};

export function buildLocalTypingBrief(
  query: string,
  understanding: LocalQueryUnderstanding,
  aiHint?: string | null,
): IntelligenceAssistantBrief {
  const seed = query.trim();
  const pool =
    seed.length < 2 ? TITLES.idle : TITLES[understanding.intent] || TITLES.general;
  const confidence = seed.length < 3 ? 'low' : 'medium';

  const summaries =
    seed.length < 2
      ? ['Enter a phone, email, order ID, or payment reference to begin.']
      : [
          understanding.summary,
          `Scanning ${understanding.searchScope.slice(0, 3).join(', ') || 'registry'} for your query.`,
          `Preparing ${understanding.intentLabel.toLowerCase()} lookup…`,
        ];

  return {
    title: hashPick(seed || 'idle', pool),
    confidence,
    confidenceLabel:
      confidence === 'high' ? 'High confidence' : confidence === 'medium' ? 'Medium confidence' : 'Low confidence',
    summary: aiHint?.trim() || hashPick(seed, summaries),
    suggestedAction:
      seed.length < 2
        ? 'Type at least 2 characters — results appear instantly.'
        : hashPick(seed, [
            'Press Enter on a result or use the action chips below.',
            'We will rank matches by relevance and urgency.',
            'Linked buyer, seller, and payment records load on selection.',
          ]),
    mode: aiHint ? 'gemini' : 'rules',
    topResults: [],
    moreResultsCount: 0,
    relatedInfo: understanding.searchScope.slice(0, 4).map((s) => ({
      label: s,
      hint: 'Included in scan',
    })),
    expandableSections: understanding.tips.length
      ? [
          {
            id: 'tips',
            title: 'How we search',
            preview: understanding.tips[0],
            items: understanding.tips.map((t, i) => ({ label: `Step ${i + 1}`, value: t })),
          },
        ]
      : [],
    actions: [
      { id: 'scope', label: 'Search scope', kind: 'expand', sectionId: 'tips' },
    ],
    alternativeQueries: [],
  };
}
