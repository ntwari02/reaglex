import type { IRecoveryJourney, IRecoveryJourneyNode } from '../models/AbandonedCartStrategy';

export type JourneyEvalContext = {
  abandonedAt: Date;
  cartValue: number;
  primaryCategory?: string;
  emailOpened?: boolean;
  remindersSent: number;
};

export type JourneyAction = {
  type: 'wait' | 'email' | 'sms' | 'push' | 'coupon' | 'skip';
  waitMinutes?: number;
  couponCode?: string;
  nodeId?: string;
  label?: string;
};

function nodeById(nodes: IRecoveryJourneyNode[], id: string) {
  return nodes.find((n) => n.id === id);
}

function children(journey: IRecoveryJourney, nodeId: string) {
  return (journey.edges || []).filter((e) => e.from === nodeId).map((e) => e.to);
}

function evalCondition(node: IRecoveryJourneyNode, ctx: JourneyEvalContext): boolean {
  const c = node.condition;
  if (!c?.field) return true;
  if (c.field === 'cartValue' && c.operator === 'gt') return ctx.cartValue > Number(c.value || 0);
  if (c.field === 'cartValue' && c.operator === 'lt') return ctx.cartValue < Number(c.value || 0);
  if (c.field === 'emailOpened' && c.operator === 'unopened') return !ctx.emailOpened;
  if (c.field === 'category' && c.operator === 'eq') {
    return String(ctx.primaryCategory || '').toLowerCase().includes(String(c.value || '').toLowerCase());
  }
  return true;
}

/**
 * Walk journey graph from trigger and return next actionable step based on reminders already sent.
 */
export function getNextJourneyAction(
  journey: IRecoveryJourney,
  ctx: JourneyEvalContext
): JourneyAction | null {
  const nodes = journey?.nodes || [];
  if (!nodes.length) return null;

  let cursor = nodes.find((n) => n.type === 'trigger')?.id || nodes[0]?.id;
  let stepsWalked = 0;
  const maxWalk = 30;

  while (cursor && stepsWalked < maxWalk) {
    stepsWalked += 1;
    const node = nodeById(nodes, cursor);
    if (!node) break;

    if (node.type === 'wait') {
      const elapsedMin = (Date.now() - ctx.abandonedAt.getTime()) / 60000;
      if (elapsedMin < (node.waitMinutes || 0)) {
        return {
          type: 'wait',
          waitMinutes: Math.max(0, Math.round((node.waitMinutes || 0) - elapsedMin)),
          nodeId: node.id,
          label: node.label,
        };
      }
      const next = children(journey, cursor)[0];
      cursor = next;
      continue;
    }

    if (node.type === 'condition') {
      const ok = evalCondition(node, ctx);
      const nextIds = children(journey, cursor);
      cursor = ok ? nextIds[0] : nextIds[1] || nextIds[0];
      continue;
    }

    if (['email', 'sms', 'push', 'coupon'].includes(node.type)) {
      if (ctx.remindersSent > 0) {
        const next = children(journey, cursor)[0];
        cursor = next;
        continue;
      }
      return {
        type: node.type as JourneyAction['type'],
        couponCode: node.couponCode,
        nodeId: node.id,
        label: node.label,
      };
    }

    cursor = children(journey, cursor)[0];
  }

  return { type: 'skip', label: 'journey_complete' };
}
