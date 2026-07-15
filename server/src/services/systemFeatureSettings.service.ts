import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { MarketplaceAIConfig } from '../models/MarketplaceAIConfig';
import { LiveCommerceSettings } from '../models/LiveCommerceSettings';
import { AdminIntelligenceConfig } from '../models/AdminIntelligenceConfig';
import { PlatformShippingPolicy } from '../models/PlatformShippingPolicy';
import {
  SYSTEM_FEATURE_BY_KEY,
  SYSTEM_FEATURE_REGISTRY,
  DISABLE_ACKNOWLEDGMENT,
  type SystemFeatureDefinition,
} from '../constants/systemFeatureRegistry';
import { getSystemFeatureSettingsDoc } from '../models/SystemFeatureSettings';

const UNLOCK_TTL_MS = 5 * 60 * 1000;
const MAX_AUDIT_ENTRIES = 200;

function unlockSecret(): string {
  return (
    process.env.SYSTEM_FEATURES_UNLOCK_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SESSION_SECRET ||
    'spacilly-dev-system-features'
  );
}

function signPayload(payloadB64: string): string {
  return crypto.createHmac('sha256', unlockSecret()).update(payloadB64).digest('base64url');
}

export function createDisableUnlockToken(userId: string): string {
  const exp = Date.now() + UNLOCK_TTL_MS;
  const payloadB64 = Buffer.from(
    JSON.stringify({ userId, exp, purpose: 'system-feature-disable' }),
  ).toString('base64url');
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyDisableUnlockToken(userId: string, token: string): boolean {
  if (!token || !userId) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  if (signPayload(payloadB64) !== sig) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      userId?: string;
      exp?: number;
      purpose?: string;
    };
    if (parsed.purpose !== 'system-feature-disable') return false;
    if (parsed.userId !== userId) return false;
    if (!parsed.exp || Date.now() > parsed.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export async function verifySuperAdminPassword(userId: string, password: string): Promise<boolean> {
  const pw = String(password || '').trim();
  if (!pw) return false;
  const user = await User.findById(userId).select('+passwordHash');
  if (!user?.passwordHash) return false;
  return bcrypt.compare(pw, user.passwordHash);
}

export function resolveFeatureEnabled(
  key: string,
  overrides: Record<string, boolean> | undefined | null,
): boolean {
  const def = SYSTEM_FEATURE_BY_KEY[key];
  if (!def) return true;
  if (Object.prototype.hasOwnProperty.call(overrides || {}, key)) {
    return Boolean(overrides![key]);
  }
  return def.defaultEnabled !== false;
}

export async function isSystemFeatureEnabled(key: string): Promise<boolean> {
  const doc = await getSystemFeatureSettingsDoc();
  const overrides = (doc.overrides || {}) as Record<string, boolean>;
  return resolveFeatureEnabled(key, overrides);
}

export function featureDisabledMessage(key: string): string {
  const def = SYSTEM_FEATURE_BY_KEY[key];
  return def
    ? `${def.label} is temporarily disabled on the platform.`
    : 'This feature is temporarily disabled.';
}

/** Throws an Error with `code: FEATURE_DISABLED` when the switch is off. */
export async function assertSystemFeatureEnabled(key: string): Promise<void> {
  if (!(await isSystemFeatureEnabled(key))) {
    const err = new Error(featureDisabledMessage(key)) as Error & {
      code: string;
      featureKey: string;
    };
    err.code = 'FEATURE_DISABLED';
    err.featureKey = key;
    throw err;
  }
}

export function isFeatureDisabledError(err: unknown): err is Error & { code: string } {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === 'FEATURE_DISABLED');
}

export async function getPublicSystemFeatures(): Promise<Record<string, boolean>> {
  const doc = await getSystemFeatureSettingsDoc();
  const overrides = (doc.overrides || {}) as Record<string, boolean>;
  const out: Record<string, boolean> = {};
  for (const def of SYSTEM_FEATURE_REGISTRY) {
    out[def.key] = resolveFeatureEnabled(def.key, overrides);
  }
  return out;
}

async function syncFeatureToDomain(key: string, enabled: boolean): Promise<void> {
  const def = SYSTEM_FEATURE_BY_KEY[key];
  if (!def?.sync) return;

  switch (def.sync.model) {
    case 'MarketplaceAIConfig':
      await MarketplaceAIConfig.findOneAndUpdate(
        {},
        { $set: { [def.sync.field]: enabled } },
        { upsert: true, new: true },
      );
      break;
    case 'LiveCommerceSettings':
      await LiveCommerceSettings.findOneAndUpdate(
        {},
        { $set: { [def.sync.field]: enabled } },
        { upsert: true, new: true },
      );
      break;
    case 'AdminIntelligenceConfig':
      await AdminIntelligenceConfig.findOneAndUpdate(
        {},
        { $set: { [def.sync.field]: enabled } },
        { upsert: true, new: true },
      );
      break;
    case 'PlatformShippingPolicy':
      await PlatformShippingPolicy.findOneAndUpdate(
        { marketCode: 'RW' },
        { $set: { [def.sync.field]: enabled } },
        { upsert: true, new: true },
      );
      break;
    default:
      break;
  }
}

export type SystemFeatureCatalogItem = SystemFeatureDefinition & {
  enabled: boolean;
  defaultEnabled: boolean;
};

export async function getSystemFeatureCatalog(): Promise<{
  features: SystemFeatureCatalogItem[];
  overrides: Record<string, boolean>;
  auditLog: Array<{
    at: string;
    actorEmail?: string;
    changes: Array<{ key: string; from: boolean; to: boolean }>;
    unlockVerified: boolean;
  }>;
}> {
  const doc = await getSystemFeatureSettingsDoc();
  const overrides = { ...(doc.overrides || {}) } as Record<string, boolean>;

  const features: SystemFeatureCatalogItem[] = SYSTEM_FEATURE_REGISTRY.map((def) => ({
    ...def,
    enabled: resolveFeatureEnabled(def.key, overrides),
    defaultEnabled: def.defaultEnabled !== false,
  }));

  const auditLog = (doc.auditLog || [])
    .slice(-50)
    .reverse()
    .map((e) => ({
      at: e.at.toISOString(),
      actorEmail: e.actorEmail,
      changes: e.changes,
      unlockVerified: Boolean(e.unlockVerified),
    }));

  return { features, overrides, auditLog };
}

export type FeatureUpdateInput = { key: string; enabled: boolean };

export async function applySystemFeatureUpdates(input: {
  updates: FeatureUpdateInput[];
  actorUserId: string;
  actorEmail?: string;
  unlockToken?: string;
  superAdminPassword?: string;
  acknowledgment?: string;
  confirmPhrase?: string;
}): Promise<{ features: SystemFeatureCatalogItem[]; unlockToken?: string }> {
  const doc = await getSystemFeatureSettingsDoc();
  const overrides = { ...(doc.overrides || {}) } as Record<string, boolean>;
  const changes: Array<{ key: string; from: boolean; to: boolean }> = [];

  const normalized = (input.updates || [])
    .map((u) => ({
      key: String(u.key || '').trim(),
      enabled: Boolean(u.enabled),
    }))
    .filter((u) => SYSTEM_FEATURE_BY_KEY[u.key]);

  if (normalized.length === 0) {
    throw new Error('No valid feature updates provided');
  }

  const disabling = normalized.filter((u) => {
    const from = resolveFeatureEnabled(u.key, overrides);
    return from && !u.enabled;
  });

  let unlockVerified = false;
  if (disabling.length > 0) {
    const ack = String(input.acknowledgment || '').trim();
    if (ack !== DISABLE_ACKNOWLEDGMENT) {
      throw new Error('You must accept the responsibility statement to disable features');
    }
    const phrase = String(input.confirmPhrase || '').trim().toUpperCase();
    if (phrase !== 'DISABLE') {
      throw new Error('Type DISABLE to confirm disabling platform features');
    }

    const tokenOk =
      input.unlockToken && verifyDisableUnlockToken(input.actorUserId, input.unlockToken);
    const passwordOk = await verifySuperAdminPassword(
      input.actorUserId,
      String(input.superAdminPassword || ''),
    );

    if (!tokenOk && !passwordOk) {
      throw new Error('Super admin password or valid unlock session required to disable features');
    }
    unlockVerified = true;
  }

  for (const u of normalized) {
    const from = resolveFeatureEnabled(u.key, overrides);
    if (from === u.enabled) continue;
    overrides[u.key] = u.enabled;
    changes.push({ key: u.key, from, to: u.enabled });
    await syncFeatureToDomain(u.key, u.enabled);
  }

  if (changes.length === 0) {
    const catalog = await getSystemFeatureCatalog();
    return { features: catalog.features };
  }

  doc.overrides = overrides;
  doc.auditLog = [
    ...(doc.auditLog || []),
    {
      at: new Date(),
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      changes,
      unlockVerified,
    },
  ].slice(-MAX_AUDIT_ENTRIES);
  await doc.save();

  const catalog = await getSystemFeatureCatalog();
  return { features: catalog.features };
}

export async function requestDisableUnlock(input: {
  actorUserId: string;
  superAdminPassword: string;
  acknowledgment: string;
  confirmPhrase: string;
}): Promise<{ unlockToken: string; expiresInSeconds: number }> {
  const ack = String(input.acknowledgment || '').trim();
  if (ack !== DISABLE_ACKNOWLEDGMENT) {
    throw new Error('You must accept the responsibility statement');
  }
  if (String(input.confirmPhrase || '').trim().toUpperCase() !== 'DISABLE') {
    throw new Error('Type DISABLE to continue');
  }
  const ok = await verifySuperAdminPassword(input.actorUserId, input.superAdminPassword);
  if (!ok) {
    throw new Error('Incorrect super admin password');
  }
  return {
    unlockToken: createDisableUnlockToken(input.actorUserId),
    expiresInSeconds: Math.floor(UNLOCK_TTL_MS / 1000),
  };
}
