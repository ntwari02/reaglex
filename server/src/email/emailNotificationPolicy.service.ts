/**
 * Central policy for outbound email features — admin settings + env + AI marketing toggles.
 */
import { AIMarketingSettings } from '../models/AIMarketingSettings';
import {
  getMarketingAutomationSettings,
  resolveEmailNotificationSettings,
} from '../models/MarketingAutomationSettings';

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();

let aiCache: { at: number; ok: boolean } | null = null;
const AI_CACHE_MS = 30_000;

async function aiMarketingAllowsAutoCopy(): Promise<boolean> {
  if (aiCache && Date.now() - aiCache.at < AI_CACHE_MS) return aiCache.ok;
  try {
    let doc = await AIMarketingSettings.findOne();
    if (!doc) doc = await AIMarketingSettings.create({});
    const autoCopy = (doc.features || []).find((f) => f.id === 'auto-copy');
    const ok =
      doc.aiEnabled !== false && (autoCopy ? Boolean(autoCopy.enabled) : true);
    aiCache = { at: Date.now(), ok };
    return ok;
  } catch {
    return true;
  }
}

export function isGeminiApiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY);
}

export async function shouldUseGeminiMarketingCopy(): Promise<boolean> {
  if (!GEMINI_API_KEY) return false;
  if (String(process.env.EMAIL_COPY_USE_GEMINI || 'true').toLowerCase() === 'false') return false;
  try {
    const s = await getMarketingAutomationSettings();
    const email = resolveEmailNotificationSettings(s);
    if (!email.geminiMarketingCopy) return false;
  } catch {
    return true;
  }
  return aiMarketingAllowsAutoCopy();
}

export async function shouldUseGeminiSellerNotifications(): Promise<boolean> {
  if (!GEMINI_API_KEY) return false;
  if (String(process.env.EMAIL_COPY_USE_GEMINI || 'true').toLowerCase() === 'false') return false;
  if (String(process.env.SELLER_NOTIFICATION_USE_GEMINI || 'true').toLowerCase() === 'false') {
    return false;
  }
  try {
    const s = await getMarketingAutomationSettings();
    const email = resolveEmailNotificationSettings(s);
    if (!email.geminiSellerNotifications) return false;
  } catch {
    return true;
  }
  return aiMarketingAllowsAutoCopy();
}

export async function shouldUseGeminiTransactionalPolish(): Promise<boolean> {
  if (!GEMINI_API_KEY) return false;
  if (String(process.env.EMAIL_COPY_USE_GEMINI || 'true').toLowerCase() === 'false') return false;
  try {
    const s = await getMarketingAutomationSettings();
    const email = resolveEmailNotificationSettings(s);
    if (!email.geminiTransactionalPolish) return false;
  } catch {
    return false;
  }
  return aiMarketingAllowsAutoCopy();
}

export async function useRichEmailTemplates(): Promise<boolean> {
  try {
    const s = await getMarketingAutomationSettings();
    return resolveEmailNotificationSettings(s).richTemplatesEnabled;
  } catch {
    return true;
  }
}

export function invalidateEmailNotificationPolicyCache(): void {
  aiCache = null;
}
