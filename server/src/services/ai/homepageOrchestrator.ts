/**
 * homepageOrchestrator.ts — master rule-based controller that decides
 * WHICH sections appear on the homepage, in what order, for the current
 * buyer's intent mode + engagement level + segment.
 *
 *   research        → focus on "for you" + comparisons + bestsellers
 *   impulse         → deals + trending + flash sales first
 *   luxury          → premium picks + bestsellers + curated
 *   bargain         → deals first, near you next
 *   decisive        → bestsellers + co-occurrence neighbours of last item
 *   returning_buyer → "from your favourite categories" + new arrivals
 *   dormant         → win-back hits + trending
 *   discovery       → balanced default
 *
 * Pure deterministic logic — every decision is inspectable and configurable
 * via `MarketplaceAIConfig.sliders.aiAutonomyLevel`.
 */

import type { BuyerIntentMode } from '../../models/BuyerSessionIntent';
import type { IMarketplaceAIConfig } from '../../models/MarketplaceAIConfig';
import type { FeedSectionId } from './homeFeedService';

export interface OrchestrationPlan {
  /** Ordered section ids to render top-to-bottom. */
  sections: FeedSectionId[];
  /** Per-section "intent boost" multiplier applied during ranking. */
  sectionWeights: Partial<Record<FeedSectionId, number>>;
  /** Human-readable rules that fired for transparency. */
  reasons: string[];
}

/** Default plan when no mode is determined yet. */
const DEFAULT_PLAN: OrchestrationPlan = {
  sections: ['hero', 'foryou', 'trending', 'bestsellers', 'deals', 'fresh', 'near_you', 'inspired'],
  sectionWeights: {},
  reasons: ['default-plan'],
};

/**
 * Pure: given the buyer mode + minimal context, produce the section order
 * and per-section emphasis multipliers.
 */
export function planHomepage(input: {
  mode: BuyerIntentMode;
  engagementLevel?: 'cold' | 'warm' | 'hot' | 'on_fire';
  segment?: 'new' | 'active' | 'at_risk' | 'dormant' | 'vip';
  isReturningVisitor?: boolean;
  isLateNight?: boolean;
  cfg?: IMarketplaceAIConfig | null;
}): OrchestrationPlan {
  const reasons: string[] = [];
  let sections: FeedSectionId[];
  const sectionWeights: Partial<Record<FeedSectionId, number>> = {};

  switch (input.mode) {
    case 'research':
      sections = ['foryou', 'bestsellers', 'inspired', 'hero', 'trending', 'fresh', 'deals', 'near_you'];
      sectionWeights.foryou = 1.25;
      sectionWeights.bestsellers = 1.15;
      reasons.push('mode=research:foryou+bestsellers boosted');
      break;

    case 'impulse':
      sections = ['hero', 'deals', 'trending', 'foryou', 'bestsellers', 'fresh', 'near_you', 'inspired'];
      sectionWeights.deals = 1.4;
      sectionWeights.trending = 1.25;
      reasons.push('mode=impulse:deals+trending boosted');
      break;

    case 'luxury':
      sections = ['hero', 'bestsellers', 'foryou', 'fresh', 'trending', 'inspired', 'near_you', 'deals'];
      sectionWeights.bestsellers = 1.3;
      sectionWeights.fresh = 1.15;
      reasons.push('mode=luxury:premium curation');
      break;

    case 'bargain':
      sections = ['hero', 'deals', 'foryou', 'trending', 'near_you', 'bestsellers', 'fresh', 'inspired'];
      sectionWeights.deals = 1.5;
      sectionWeights.near_you = 1.15;
      reasons.push('mode=bargain:deals first');
      break;

    case 'decisive':
      sections = ['hero', 'foryou', 'bestsellers', 'trending', 'fresh', 'deals', 'near_you', 'inspired'];
      sectionWeights.foryou = 1.2;
      reasons.push('mode=decisive:focused funnel');
      break;

    case 'returning_buyer':
      sections = ['foryou', 'hero', 'fresh', 'bestsellers', 'trending', 'deals', 'near_you', 'inspired'];
      sectionWeights.foryou = 1.3;
      sectionWeights.fresh = 1.2;
      reasons.push('mode=returning_buyer:re-engage favourites');
      break;

    case 'dormant':
      sections = ['hero', 'deals', 'trending', 'fresh', 'foryou', 'bestsellers', 'near_you', 'inspired'];
      sectionWeights.deals = 1.2;
      sectionWeights.trending = 1.2;
      reasons.push('mode=dormant:win-back via deals+trending');
      break;

    case 'discovery':
    default:
      sections = [...DEFAULT_PLAN.sections];
      reasons.push('mode=discovery:balanced default');
  }

  // Engagement modifiers — hot users get more "for you" depth, cold users
  // get more "trending" / "fresh" exposure to find their first interest.
  if (input.engagementLevel === 'cold' && !sections.includes('trending')) {
    sections.splice(1, 0, 'trending');
    reasons.push('engagement=cold:promote-trending');
  }
  if ((input.engagementLevel === 'hot' || input.engagementLevel === 'on_fire') && sections[0] !== 'foryou') {
    // Move foryou to top.
    sections = ['foryou', ...sections.filter((s) => s !== 'foryou')];
    sectionWeights.foryou = (sectionWeights.foryou || 1) * 1.1;
    reasons.push('engagement=hot:foryou-on-top');
  }

  // Segment overrides.
  if (input.segment === 'vip') {
    sectionWeights.foryou = (sectionWeights.foryou || 1) * 1.2;
    sectionWeights.fresh = (sectionWeights.fresh || 1) * 1.1;
    reasons.push('segment=vip:premium curation');
  }
  if (input.segment === 'new') {
    sections = ['hero', 'trending', 'bestsellers', 'fresh', 'deals', 'foryou', 'near_you', 'inspired'];
    reasons.push('segment=new:popular-first');
  }

  // Context modifiers.
  if (input.isLateNight && !sections.includes('inspired')) {
    sections.push('inspired');
    reasons.push('time=late-night:inspired-tail');
  }
  if (input.isReturningVisitor && !sections.includes('fresh')) {
    sections.splice(2, 0, 'fresh');
    reasons.push('returning-visitor:fresh-boost');
  }

  // Respect the AI autonomy slider: low autonomy reverts to default order
  // and keeps reasons for inspection.
  const autonomy = Math.max(0, Math.min(100, Number(input.cfg?.sliders?.aiAutonomyLevel ?? 60)));
  if (autonomy < 25) {
    sections = [...DEFAULT_PLAN.sections];
    reasons.push(`autonomy<25:revert to default (${autonomy})`);
  }

  // De-duplicate while preserving order.
  const seen = new Set<FeedSectionId>();
  sections = sections.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  return { sections, sectionWeights, reasons };
}
