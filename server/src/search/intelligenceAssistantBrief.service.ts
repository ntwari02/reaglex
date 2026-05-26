import type { QueryUnderstanding } from './intelligenceQueryUnderstanding';
import type {
  IntelligenceAiInsight,
  IntelligenceAssistantBrief,
  IntelligenceAssistantAction,
  IntelligenceConfidence,
  IntelligenceExpandableSection,
  IntelligenceSearchHit,
  QueryIntent,
} from './intelligenceSearch.types';

function hashPick(seed: string, options: string[]): string {
  if (options.length === 0) return '';
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 9973;
  return options[h % options.length];
}

const CONFIDENCE_LABELS: Record<IntelligenceConfidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

const TITLE_POOL: Record<string, string[]> = {
  email: ['Account lookup', 'Email trace', 'Customer identity'],
  phone: ['Phone lookup', 'Contact match', 'Caller identity'],
  order_id: ['Order dossier', 'Order investigation', 'Shipment & payment trail'],
  payment_ref: ['Payment trace', 'Transaction review', 'Funds investigation'],
  plate: ['Fleet lookup', 'Vehicle match', 'Delivery asset'],
  object_id: ['Record resolver', 'Cross-module lookup', 'Entity match'],
  payment_issue: ['Payment concern', 'Checkout issue', 'Transaction problem'],
  dispute: ['Dispute review', 'Case investigation', 'Complaint dossier'],
  empty: ['No matches yet', 'Refine your search', 'Try another identifier'],
  general: ['Platform lookup', 'Registry search', 'Operational scan'],
};

const ACTION_POOL: Record<string, string[]> = {
  high_hit: [
    'Open the top match to verify status and linked records.',
    'Review the primary record, then check payments and support history.',
    'Start with the highlighted result — it is the strongest match.',
  ],
  medium: [
    'Compare the top matches, then open the one that fits the customer story.',
    'Pick the closest record and expand linked issues below.',
    'Validate identity first, then follow payment or order links.',
  ],
  low: [
    'Try a phone number, full email, or exact order / payment reference.',
    'Shorten the query or switch to an identifier the customer provided.',
    'Use an alternative search chip below or check spelling.',
  ],
  empty: [
    'Ask the customer for their order number, payment reference, or registered phone.',
    'Search again with digits only for phone, or the full email address.',
    'No registry hit — broaden with seller name or support ticket ID if known.',
  ],
};

function intentBoost(intent: QueryIntent, hit: IntelligenceSearchHit): number {
  const map: Partial<Record<QueryIntent, IntelligenceSearchHit['entityType'][]>> = {
    email: ['user', 'seller', 'order'],
    phone: ['user', 'seller', 'order'],
    order_id: ['order', 'payment', 'dispute'],
    payment_ref: ['payment', 'order'],
    plate: ['vehicle'],
    object_id: ['user', 'seller', 'order', 'payment', 'dispute'],
  };
  const preferred = map[intent] || [];
  return preferred.indexOf(hit.entityType) >= 0 ? 0.22 : 0;
}

export function rankIntelligenceHits(
  hits: IntelligenceSearchHit[],
  intent: QueryIntent,
  query: string,
): IntelligenceSearchHit[] {
  const q = query.toLowerCase();
  const scored = hits.map((h, idx) => {
    let score = typeof h.score === 'number' ? h.score : 1 - idx * 0.02;
    score += intentBoost(intent, h);
    if (h.statusTone === 'critical') score += 0.28;
    else if (h.statusTone === 'warn') score += 0.14;
    if (h.entityType === 'dispute') score += 0.1;
    if (h.entityType === 'support' && /\b(ticket|support|help)\b/i.test(q)) score += 0.12;
    const title = `${h.title} ${h.subtitle}`.toLowerCase();
    if (q.length >= 4 && title.includes(q.slice(0, Math.min(q.length, 12)))) score += 0.18;
    if (h.riskLevel === 'high' || h.riskLevel === 'critical') score += 0.08;
    if (h.isUnresolved) score += 0.14;
    if (h.isLive) score += 0.06;
    const updatedAt = h.updatedAt ?? (h.metadata?.updatedAt ? Number(h.metadata.updatedAt) : 0);
    if (updatedAt > 0) {
      const ageMs = Date.now() - updatedAt;
      if (ageMs < 15 * 60 * 1000) score += 0.32;
      else if (ageMs < 60 * 60 * 1000) score += 0.2;
      else if (ageMs < 24 * 60 * 60 * 1000) score += 0.1;
      else if (ageMs < 7 * 24 * 60 * 60 * 1000) score += 0.04;
      else score -= 0.1;
    }
    return { h, score };
  });
  return scored.sort((a, b) => b.score - a.score).map((x) => x.h);
}

function deriveConfidence(
  intent: QueryIntent,
  hitCount: number,
  topHit?: IntelligenceSearchHit,
): IntelligenceConfidence {
  if (hitCount === 0) return 'low';
  const strongIntent = ['email', 'phone', 'order_id', 'payment_ref', 'object_id'].includes(intent);
  if (hitCount === 1 && strongIntent) return 'high';
  if (topHit && (topHit.statusTone === 'critical' || topHit.statusTone === 'warn') && hitCount <= 3) {
    return 'high';
  }
  if (strongIntent && hitCount <= 4) return 'high';
  if (hitCount <= 6) return 'medium';
  return hitCount > 12 ? 'low' : 'medium';
}

function buildTitle(
  understanding: Pick<QueryUnderstanding, 'intent' | 'keywords' | 'normalized'>,
  hitCount: number,
): string {
  const seed = understanding.normalized || 'x';
  if (hitCount === 0 && seed.length < 2) {
    return hashPick(seed, ['Smart admin assistant', 'Registry intelligence', 'Operational lookup']);
  }
  if (hitCount === 0) {
    return hashPick(seed, TITLE_POOL[understanding.intent] || TITLE_POOL.general);
  }
  if (understanding.keywords.includes('dispute')) {
    return hashPick(seed, TITLE_POOL.dispute);
  }
  if (understanding.keywords.includes('payment') && understanding.keywords.includes('order')) {
    return hashPick(seed, TITLE_POOL.payment_issue);
  }
  return hashPick(seed, TITLE_POOL[understanding.intent] || TITLE_POOL.general);
}

function buildSummary(
  understanding: QueryUnderstanding,
  ranked: IntelligenceSearchHit[],
  hitCount: number,
): string {
  const seed = understanding.normalized;
  if (hitCount === 0) {
    const variants = [
      `Nothing in the registry matched “${seed.slice(0, 32)}${seed.length > 32 ? '…' : ''}” yet.`,
      `No linked buyer, seller, order, or payment record for this query.`,
      `Registry search returned empty — try a more specific identifier.`,
    ];
    return hashPick(seed, variants);
  }
  const top = ranked[0];
  if (hitCount === 1 && top) {
    const variants = [
      `Found one strong match: ${top.title} (${top.moduleLabel}).`,
      `Single record: ${top.title} — ${top.subtitle}.`,
      `Primary hit is ${top.title}; open it for the full dossier.`,
    ];
    return hashPick(seed, variants);
  }
  const critical = ranked.filter((h) => h.statusTone === 'critical' || h.statusTone === 'warn').length;
  if (critical > 0) {
    return `${hitCount} records found; ${critical} need attention (status flagged). Top: ${top?.title || '—'}.`;
  }
  const types = [...new Set(ranked.slice(0, 5).map((h) => h.moduleLabel))].slice(0, 3).join(', ');
  return `${hitCount} matches across ${types || 'modules'}. Best starting point: ${top?.title || 'first result'}.`;
}

function buildSuggestedAction(
  confidence: IntelligenceConfidence,
  hitCount: number,
  seed: string,
): string {
  if (hitCount === 0) return hashPick(seed, ACTION_POOL.empty);
  if (confidence === 'high') return hashPick(seed, ACTION_POOL.high_hit);
  if (confidence === 'medium') return hashPick(seed, ACTION_POOL.medium);
  return hashPick(seed, ACTION_POOL.low);
}

function buildRelatedInfo(ranked: IntelligenceSearchHit[]): IntelligenceAssistantBrief['relatedInfo'] {
  const out: IntelligenceAssistantBrief['relatedInfo'] = [];
  const byType = new Map<string, IntelligenceSearchHit[]>();
  for (const h of ranked) {
    const list = byType.get(h.entityType) || [];
    list.push(h);
    byType.set(h.entityType, list);
  }
  if (byType.get('dispute')?.length) {
    out.push({ label: 'Disputes', hint: `${byType.get('dispute')!.length} open or linked case(s)` });
  }
  if (byType.get('support')?.length) {
    out.push({ label: 'Support', hint: `${byType.get('support')!.length} ticket(s) in results` });
  }
  if (byType.get('payment')?.length) {
    out.push({
      label: 'Payments',
      hint: 'Review transaction status and linked orders',
      href: byType.get('payment')![0]?.deepLink,
    });
  }
  if (byType.get('order')?.length && byType.get('payment')?.length) {
    out.push({ label: 'Order ↔ payment', hint: 'Cross-check fulfillment and settlement' });
  }
  const warn = ranked.filter((h) => h.statusTone === 'warn' || h.statusTone === 'critical');
  if (warn.length > 0 && !out.some((r) => r.label === 'Attention')) {
    out.push({ label: 'Attention', hint: `${warn.length} record(s) with elevated status` });
  }
  return out.slice(0, 5);
}

function buildExpandableSections(
  ranked: IntelligenceSearchHit[],
  understanding: QueryUnderstanding,
): IntelligenceExpandableSection[] {
  const sections: IntelligenceExpandableSection[] = [];

  const scopeItems = understanding.searchScope.map((s) => ({ label: s, value: 'Included in scan' }));
  if (scopeItems.length) {
    sections.push({
      id: 'scope',
      title: 'Search scope',
      preview: `${scopeItems.length} domains queried`,
      items: scopeItems,
    });
  }

  const extra = ranked.slice(3, 12);
  if (extra.length > 0) {
    sections.push({
      id: 'more_results',
      title: 'Additional matches',
      preview: `${extra.length} more records`,
      items: extra.map((h) => ({
        label: h.moduleLabel,
        value: `${h.title} — ${h.subtitle}`,
        href: h.deepLink,
      })),
    });
  }

  const metaRows = ranked.slice(0, 3).flatMap((h) =>
    Object.entries(h.metadata || {})
      .slice(0, 4)
      .map(([k, v]) => ({ label: `${h.moduleLabel} · ${k}`, value: v })),
  );
  if (metaRows.length > 0) {
    sections.push({
      id: 'registry_fields',
      title: 'Registry fields',
      preview: 'Indexed attributes on top hits',
      items: metaRows.slice(0, 8),
    });
  }

  if (understanding.tips.length > 0) {
    sections.push({
      id: 'tips',
      title: 'Retrieval notes',
      preview: understanding.tips[0],
      items: understanding.tips.map((t, i) => ({ label: `Step ${i + 1}`, value: t })),
    });
  }

  return sections;
}

function buildActions(
  ranked: IntelligenceSearchHit[],
  query: string,
  hitCount: number,
): IntelligenceAssistantAction[] {
  const actions: IntelligenceAssistantAction[] = [];
  const top = ranked[0];
  if (top) {
    actions.push({
      id: 'open_primary',
      label: 'Open primary record',
      kind: 'navigate',
      href: top.deepLink,
    });
  }
  if (hitCount > 3) {
    actions.push({
      id: 'more_results',
      label: 'More results',
      kind: 'expand',
      sectionId: 'more_results',
    });
  }
  actions.push({
    id: 'details',
    label: 'More details',
    kind: 'expand',
    sectionId: hitCount > 3 ? 'more_results' : 'registry_fields',
  });
  if (ranked.some((h) => h.entityType === 'order')) {
    const order = ranked.find((h) => h.entityType === 'order');
    if (order) {
      actions.push({
        id: 'order_timeline',
        label: 'Order timeline',
        kind: 'navigate',
        href: order.deepLink,
      });
    }
  }
  if (ranked.some((h) => h.entityType === 'payment')) {
    actions.push({
      id: 'payment_history',
      label: 'Payment history',
      kind: 'navigate',
      href: ranked.find((h) => h.entityType === 'payment')!.deepLink,
    });
  }
  if (ranked.some((h) => h.entityType === 'support' || h.entityType === 'dispute')) {
    actions.push({
      id: 'related_issues',
      label: 'Related issues',
      kind: 'expand',
      sectionId: 'more_results',
    });
  }
  if (hitCount === 0 && query.length >= 2) {
    actions.push({
      id: 'deep_search',
      label: 'Deep search',
      kind: 'deep_search',
      query: query.trim(),
    });
  }
  return actions.slice(0, 6);
}

export function buildRuleAssistantBrief(input: {
  query: string;
  understanding: QueryUnderstanding;
  hits: IntelligenceSearchHit[];
}): IntelligenceAssistantBrief {
  const ranked = rankIntelligenceHits(input.hits, input.understanding.intent, input.query);
  const hitCount = ranked.length;
  const confidence = deriveConfidence(input.understanding.intent, hitCount, ranked[0]);
  const seed = input.query.trim() || input.understanding.normalized;

  return {
    title: buildTitle(input.understanding, hitCount),
    confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence],
    summary: buildSummary(input.understanding, ranked, hitCount),
    suggestedAction: buildSuggestedAction(confidence, hitCount, seed),
    mode: 'rules',
    topResults: ranked.slice(0, 3),
    moreResultsCount: Math.max(0, hitCount - 3),
    relatedInfo: buildRelatedInfo(ranked),
    expandableSections: buildExpandableSections(ranked, input.understanding),
    actions: buildActions(ranked, input.query, hitCount),
    alternativeQueries: [],
  };
}

export function mergeGeminiIntoBrief(
  brief: IntelligenceAssistantBrief,
  ai: IntelligenceAiInsight | null | undefined,
): IntelligenceAssistantBrief {
  if (!ai) return brief;
  return {
    ...brief,
    mode: 'gemini',
    title: ai.interpretation.split(/[.!?]/)[0]?.trim().slice(0, 80) || brief.title,
    summary: ai.interpretation.slice(0, 420) || brief.summary,
    suggestedAction: ai.nextSteps[0] || brief.suggestedAction,
    alternativeQueries: ai.alternativeQueries.length ? ai.alternativeQueries : brief.alternativeQueries,
    actions: [
      ...brief.actions,
      ...ai.nextSteps.slice(1, 3).map((step, i) => ({
        id: `ai_step_${i}`,
        label: step.slice(0, 48),
        kind: 'expand' as const,
        sectionId: 'tips',
      })),
    ].slice(0, 7),
    expandableSections: [
      ...brief.expandableSections,
      ...(ai.nextSteps.length > 1
        ? [
            {
              id: 'ai_steps',
              title: 'Recommended fixes',
              preview: ai.nextSteps[1] || ai.nextSteps[0],
              items: ai.nextSteps.map((s, i) => ({ label: `Action ${i + 1}`, value: s })),
            },
          ]
        : []),
    ],
  };
}

/** Lightweight card while admin types (no hits yet). */
export function buildTypingAssistantBrief(
  query: string,
  understanding: QueryUnderstanding,
  aiHint?: string,
): IntelligenceAssistantBrief {
  const seed = query.trim();
  const confidence: IntelligenceConfidence = seed.length < 3 ? 'low' : 'medium';
  const summary =
    aiHint && aiHint.length > 0
      ? aiHint
      : understanding.summary;

  return {
    title: buildTitle(understanding, 0),
    confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence],
    summary,
    suggestedAction:
      seed.length < 2
        ? 'Enter at least 2 characters to scan the registry.'
        : hashPick(seed, ACTION_POOL.medium),
    mode: aiHint ? 'gemini' : 'rules',
    topResults: [],
    moreResultsCount: 0,
    relatedInfo: understanding.searchScope.slice(0, 4).map((s) => ({
      label: s,
      hint: 'Will be included when you search',
    })),
    expandableSections: understanding.tips.length
      ? [
          {
            id: 'tips',
            title: 'How we will search',
            preview: understanding.tips[0],
            items: understanding.tips.map((t, i) => ({ label: `Step ${i + 1}`, value: t })),
          },
        ]
      : [],
    actions: [
      {
        id: 'scope',
        label: 'Search scope',
        kind: 'expand',
        sectionId: 'tips',
      },
    ],
    alternativeQueries: [],
  };
}
