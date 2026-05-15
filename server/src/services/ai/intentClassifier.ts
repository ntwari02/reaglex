/**
 * intentClassifier.ts — deterministic buyer intent state machine.
 *
 * No machine learning. The classifier scores a fixed set of rules against
 * the live session and the long-term profile, then picks the highest-scoring
 * mode. Every decision is fully inspectable (admin "AI reasoning logs").
 *
 *   discovery       — passive browsing, low engagement
 *   research        — long dwell, low cart velocity
 *   impulse         — rapid clicks + cart adds
 *   luxury          — high-price filter / brand affinity
 *   bargain         — discount/sale focus
 *   decisive        — high cart→purchase ratio
 *   returning_buyer — repeat purchases same category
 *   dormant         — re-entry after long idle
 */

import type {
  BuyerIntentMode,
  EngagementLevel,
  IBuyerSessionIntent,
  ISessionEventRef,
  PriceBucket,
} from '../../models/BuyerSessionIntent';
import type { IBuyerInsightProfile } from '../../models/BuyerInsightProfile';

export interface IntentClassificationResult {
  mode: BuyerIntentMode;
  engagementLevel: EngagementLevel;
  engagementScore: number;
  priceBucket: PriceBucket;
  reasons: string[];
  /** Per-rule score breakdown for transparency. */
  scores: Record<BuyerIntentMode, number>;
}

/** Inputs to the classifier — kept tiny so it can be called per event. */
export interface ClassifierInputs {
  session?: IBuyerSessionIntent | null;
  profile?: IBuyerInsightProfile | null;
  /** Optional event that just occurred (so we can react instantly). */
  latestEvent?: ISessionEventRef;
}

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

function lastEventsByType(events: ISessionEventRef[] = [], type: string): number {
  return events.filter((e) => e.type === type).length;
}

function timeSpanSec(events: ISessionEventRef[] = []): number {
  if (events.length < 2) return 0;
  const first = events[events.length - 1]?.at;
  const last = events[0]?.at;
  if (!first || !last) return 0;
  return Math.max(0, (new Date(last).getTime() - new Date(first).getTime()) / 1000);
}

function rateOf(events: ISessionEventRef[], type: string): number {
  const span = timeSpanSec(events);
  if (span <= 0) return 0;
  return lastEventsByType(events, type) / span;
}

function bucketPrice(profile: IBuyerInsightProfile | null | undefined): PriceBucket {
  if (!profile?.pricePreferenceUsd) return 'unknown';
  const median = Number(profile.pricePreferenceUsd.median) || 0;
  if (median <= 0) return 'unknown';
  if (median < 20) return 'value';
  if (median < 80) return 'mid';
  if (median < 250) return 'premium';
  return 'luxury';
}

function engagementFromScore(score: number): EngagementLevel {
  if (score >= 75) return 'on_fire';
  if (score >= 45) return 'hot';
  if (score >= 20) return 'warm';
  return 'cold';
}

function computeEngagementScore(session: IBuyerSessionIntent | null | undefined): number {
  if (!session) return 0;
  const views = lastEventsByType(session.lastEvents, 'view');
  const clicks = lastEventsByType(session.lastEvents, 'click');
  const carts = Number(session.totalCartAdds || 0);
  const wishes = lastEventsByType(session.lastEvents, 'wishlist_add');
  const purchases = Number(session.totalPurchases || 0);
  // weights deliberately conservative so casual users stay 'warm'.
  return Math.min(
    100,
    views * 3 + clicks * 4 + carts * 12 + wishes * 8 + purchases * 25 +
      (Number(session.avgDwellSec) || 0) * 0.5,
  );
}

export function classifyIntent(input: ClassifierInputs): IntentClassificationResult {
  const session = input.session;
  const profile = input.profile;
  const reasons: string[] = [];

  const events = session?.lastEvents || [];
  const views = lastEventsByType(events, 'view');
  const carts = lastEventsByType(events, 'cart_add');
  const purchases = lastEventsByType(events, 'purchase');
  const searches = lastEventsByType(events, 'search');
  const dwell = Number(session?.avgDwellSec) || 0;
  const dealMood = Number(session?.dealMood) || 0;
  const premiumMood = Number(session?.premiumMood) || 0;

  // Cart velocity = adds per minute over the last 5 events window.
  const span = timeSpanSec(events);
  const cartsPerMin = span > 0 ? (carts / span) * 60 : 0;
  const viewsPerMin = span > 0 ? (views / span) * 60 : 0;

  // Each mode gets a score 0..1. Highest wins.
  const scores: Record<BuyerIntentMode, number> = {
    discovery: 0.1, // baseline so a totally empty session still falls here
    research: 0,
    impulse: 0,
    luxury: 0,
    bargain: 0,
    decisive: 0,
    returning_buyer: 0,
    dormant: 0,
  };

  // ─── DISCOVERY ─────────────────────────────────────────────────────
  if (views <= 3 && carts === 0 && searches <= 1) {
    scores.discovery += 0.6;
    reasons.push('discovery:initial-browse');
  }

  // ─── RESEARCH ──────────────────────────────────────────────────────
  if (dwell >= 30 && carts === 0 && views >= 2) {
    scores.research += 0.75;
    reasons.push(`research:avgDwell=${Math.round(dwell)}s`);
  }
  if (searches >= 2 && carts === 0) {
    scores.research += 0.25;
    reasons.push('research:multi-search');
  }

  // ─── IMPULSE ───────────────────────────────────────────────────────
  if (cartsPerMin >= 0.4) {
    scores.impulse += 0.7;
    reasons.push('impulse:cart-burst');
  }
  if (viewsPerMin >= 4 && carts >= 1) {
    scores.impulse += 0.3;
    reasons.push('impulse:rapid-clicks');
  }

  // ─── LUXURY ────────────────────────────────────────────────────────
  if (premiumMood >= 0.4) {
    scores.luxury += 0.5;
    reasons.push(`luxury:premiumMood=${premiumMood.toFixed(2)}`);
  }
  const pBucket = bucketPrice(profile);
  if (pBucket === 'premium' || pBucket === 'luxury') {
    scores.luxury += 0.3;
    reasons.push(`luxury:priceBucket=${pBucket}`);
  }

  // ─── BARGAIN ───────────────────────────────────────────────────────
  if (dealMood >= 0.4) {
    scores.bargain += 0.55;
    reasons.push(`bargain:dealMood=${dealMood.toFixed(2)}`);
  }
  if (Number(profile?.discountAffinity) >= 15) {
    scores.bargain += 0.25;
    reasons.push('bargain:high-discount-affinity');
  }

  // ─── DECISIVE ──────────────────────────────────────────────────────
  if (purchases >= 1 || (carts >= 1 && views <= carts + 2)) {
    scores.decisive += 0.7;
    reasons.push('decisive:efficient-funnel');
  }

  // ─── RETURNING BUYER ───────────────────────────────────────────────
  if (Number(profile?.orderCount) >= 3) {
    const lastOrder = profile?.lastOrderAt ? new Date(profile.lastOrderAt as any).getTime() : 0;
    const days = lastOrder > 0 ? (Date.now() - lastOrder) / 86_400_000 : 999;
    if (days <= 60) {
      scores.returning_buyer += 0.6;
      reasons.push(`returning:lastOrder=${Math.round(days)}d`);
    }
  }

  // ─── DORMANT ───────────────────────────────────────────────────────
  if (profile?.segment === 'dormant' || profile?.segment === 'at_risk') {
    scores.dormant += 0.55;
    reasons.push(`dormant:profileSegment=${profile.segment}`);
  }

  // Pick top mode. Ties → keep the previous mode if available, otherwise
  // discovery (the safest default).
  let mode: BuyerIntentMode = 'discovery';
  let best = -1;
  for (const k of Object.keys(scores) as BuyerIntentMode[]) {
    if (scores[k] > best) {
      best = scores[k];
      mode = k;
    }
  }
  if (best < 0.25 && session?.mode) {
    mode = session.mode;
    reasons.push(`keep-previous:${mode}`);
  }

  const engagementScore = computeEngagementScore(session);
  const engagementLevel = engagementFromScore(engagementScore);
  const priceBucket = pBucket;

  return { mode, engagementLevel, engagementScore, priceBucket, reasons, scores };
}

/**
 * Apply the classifier result to a session document (mutates, caller saves).
 * Records the transition (previousMode + modeSetAt) so analytics can
 * graph "research → impulse" funnels later.
 */
export function applyIntentToSession(
  session: IBuyerSessionIntent,
  result: IntentClassificationResult,
): boolean {
  let changed = false;
  if (session.mode !== result.mode) {
    session.previousMode = session.mode;
    session.mode = result.mode;
    session.modeSetAt = new Date();
    changed = true;
  }
  if (session.engagementLevel !== result.engagementLevel) {
    session.engagementLevel = result.engagementLevel;
    changed = true;
  }
  session.engagementScore = clamp(result.engagementScore, 0, 100) * 100;
  // Round to a whole number to keep the index tidy.
  session.engagementScore = Math.round(result.engagementScore);
  session.priceBucket = result.priceBucket;
  return changed;
}
