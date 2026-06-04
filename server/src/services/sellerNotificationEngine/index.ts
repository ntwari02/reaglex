import type { SellerNotificationContext, SellerNotificationEvent, SellerNotificationCopy } from './types';
import { generateSellerNotificationFallback } from './fallback';
import { generateSellerNotificationWithGemini } from './gemini';
import { isDuplicate, memoryKey, rememberNotification } from './memory';
import { shouldUseGeminiSellerNotifications } from '../../email/emailNotificationPolicy.service';

export type { SellerNotificationEvent, SellerNotificationContext, SellerNotificationCopy, SellerNotificationTone } from './types';

/**
 * Intelligent seller notification engine — Gemini first, deterministic fallback.
 * Used by in-app, push, and email channels via sellerNotificationService.
 */
export async function generateSellerNotificationCopy(
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext,
): Promise<SellerNotificationCopy> {
  const entityId = ctx.orderId || ctx.caseNumber || ctx.disputeNumber || '';
  const key = memoryKey(ctx.sellerId, event, entityId);

  if (await shouldUseGeminiSellerNotifications()) {
    try {
      const gemini = await generateSellerNotificationWithGemini(event, ctx);
      if (gemini && !isDuplicate(key, gemini)) {
        rememberNotification(key, gemini);
        return gemini;
      }
    } catch {
      /* fallback below */
    }
  }

  return generateSellerNotificationFallback(event, ctx, key);
}

/** Sync alias for tests / legacy callers — fallback only */
export function generateSellerNotificationCopySync(
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext,
): SellerNotificationCopy {
  return generateSellerNotificationFallback(event, ctx);
}
