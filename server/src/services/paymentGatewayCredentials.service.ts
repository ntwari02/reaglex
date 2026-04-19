import Flutterwave from 'flutterwave-node-v3';
import axios from 'axios';
import { PaymentGatewayConfig } from '../models/PaymentGatewayConfig';
import { encryptCredentialsJson, decryptCredentialsJson } from './paymentSecretsCrypto.service';
import { getServerUrl } from '../config/publicEnv';

function clearMomoTokenCacheSafe(): void {
  try {
    // Avoid static circular import: momoService ↔ paymentGatewayCredentials
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { clearMomoTokenCache } = require('./momoService') as typeof import('./momoService');
    clearMomoTokenCache();
  } catch {
    /* ignore */
  }
}

export type CredentialProfile =
  | 'flutterwave'
  | 'mtn_momo'
  | 'airtel_api'
  | 'stripe'
  | 'paypal'
  | 'generic_api_secret'
  | 'none';

export type GatewayFieldMeta = {
  name: string;
  label: string;
  kind: 'text' | 'secret' | 'url';
  hint?: string;
  /** UI grouping (admin Payment Gateways modal) */
  group?: string;
};

const CANONICAL_KEYS = [
  'offline',
  'flutterwave',
  'mtn_momo',
  'airtel_money',
  'stripe',
  'paypal',
] as const;

export type CanonicalGatewayKey = (typeof CANONICAL_KEYS)[number];

export const GATEWAY_REGISTRY: Array<{
  key: CanonicalGatewayKey;
  name: string;
  type: string;
  profile: CredentialProfile;
  defaultEnabled: boolean;
}> = [
  { key: 'offline', name: 'Offline / Manual', type: 'Manual', profile: 'none', defaultEnabled: false },
  { key: 'flutterwave', name: 'Flutterwave', type: 'Payment Gateway', profile: 'flutterwave', defaultEnabled: true },
  { key: 'mtn_momo', name: 'MTN MoMo Rwanda', type: 'Mobile Money', profile: 'mtn_momo', defaultEnabled: false },
  { key: 'airtel_money', name: 'Airtel Money', type: 'Mobile Money', profile: 'airtel_api', defaultEnabled: false },
  { key: 'stripe', name: 'Stripe', type: 'Card Payments', profile: 'stripe', defaultEnabled: false },
  { key: 'paypal', name: 'PayPal', type: 'Digital Wallet', profile: 'paypal', defaultEnabled: false },
];

export function getFieldMetaForProfile(profile: CredentialProfile): GatewayFieldMeta[] {
  switch (profile) {
    case 'flutterwave':
      return [
        { name: 'publicKey', label: 'Public Key', kind: 'secret', group: 'Required credentials' },
        { name: 'secretKey', label: 'Secret Key', kind: 'secret', group: 'Required credentials' },
        { name: 'encryptionKey', label: 'Encryption Key', kind: 'secret', group: 'Required credentials', hint: 'From Flutterwave dashboard (checksum / card encryption).' },
        {
          name: 'webhookUrl',
          label: 'Webhook URL',
          kind: 'url',
          group: 'Webhooks & verification',
          hint: 'Same URL you register under Flutterwave → Settings → Webhooks (copy from “Suggested listener URL” above when possible).',
        },
        {
          name: 'webhookSecretHash',
          label: 'Webhook secret (verif-hash)',
          kind: 'secret',
          group: 'Webhooks & verification',
          hint: 'Flutterwave “Secret Hash”; must match the verif-hash header on incoming webhooks.',
        },
      ];
    case 'mtn_momo':
      return [
        { name: 'apiUser', label: 'API User ID', kind: 'text', group: 'Required', hint: 'UUID from MTN MoMo developer portal (Collections product).' },
        { name: 'apiKey', label: 'API Key', kind: 'secret', group: 'Required' },
        { name: 'subscriptionKey', label: 'Subscription Key', kind: 'secret', group: 'Required', hint: 'Sent as Ocp-Apim-Subscription-Key.' },
        {
          name: 'callbackUrl',
          label: 'Webhook URL',
          kind: 'url',
          group: 'Required',
          hint: 'MTN Collections callback URL — must match your MTN product (use the suggested URL when SERVER_URL is correct).',
        },
        {
          name: 'baseUrl',
          label: 'API base URL',
          kind: 'url',
          group: 'Advanced',
          hint: 'Sandbox example: https://sandbox.momodeveloper.mtn.com — use the host MTN gave you for your environment.',
        },
        { name: 'targetEnvironment', label: 'Target environment', kind: 'text', group: 'Advanced', hint: 'sandbox or mtnrwanda (production).' },
      ];
    case 'stripe':
      return [
        { name: 'publishableKey', label: 'Publishable key', kind: 'secret', group: 'Required', hint: 'pk_live_… or pk_test_…' },
        { name: 'secretKey', label: 'Secret key', kind: 'secret', group: 'Required', hint: 'sk_live_… or sk_test_…' },
        {
          name: 'webhookSecret',
          label: 'Webhook secret',
          kind: 'secret',
          group: 'Required',
          hint: 'Signing secret (whsec_…) for endpoint /api/webhooks/stripe/webhook.',
        },
      ];
    case 'paypal':
      return [
        { name: 'clientId', label: 'Client ID', kind: 'secret', group: 'Required' },
        { name: 'clientSecret', label: 'Secret', kind: 'secret', group: 'Required' },
        { name: 'environment', label: 'Mode', kind: 'text', group: 'Required', hint: 'sandbox or live' },
        { name: 'webhookId', label: 'Webhook ID', kind: 'text', group: 'Required', hint: 'PayPal Developer → Webhooks → ID for /api/webhooks/paypal/webhook' },
      ];
    case 'airtel_api':
      return [
        { name: 'clientId', label: 'Client ID', kind: 'secret', group: 'Required' },
        { name: 'clientSecret', label: 'Client Secret', kind: 'secret', group: 'Required' },
        { name: 'merchantId', label: 'Merchant ID', kind: 'text', group: 'Required', hint: 'From Airtel Africa Open API / partner onboarding.' },
        {
          name: 'webhookUrl',
          label: 'Webhook URL',
          kind: 'url',
          group: 'Required',
          hint: 'Callback URL registered with Airtel for your merchant (required for a complete production setup).',
        },
      ];
    case 'generic_api_secret':
      return [
        { name: 'apiKey', label: 'API Key / Client ID', kind: 'secret' },
        { name: 'secretKey', label: 'Secret Key', kind: 'secret' },
        { name: 'webhookUrl', label: 'Webhook URL', kind: 'url' },
      ];
    case 'none':
      return [];
    default:
      return [];
  }
}

/**
 * Field definitions for the admin UI must follow the gateway **key**, not a possibly stale
 * `credentialProfile` stored in MongoDB (invalid values produced an empty form).
 */
export function getFieldMetaForGatewayKey(key: string): GatewayFieldMeta[] {
  const def = GATEWAY_REGISTRY.find((x) => x.key === key);
  const profile = def?.profile ?? resolveProfileForKey(key);
  return getFieldMetaForProfile(profile);
}

function maskValue(v: string): string {
  const s = String(v || '');
  if (!s) return '';
  if (s.length <= 6) return '***';
  return `${s.slice(0, 4)}…${s.slice(-3)}`;
}

export function buildMaskedSummary(
  profile: CredentialProfile,
  creds: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {};
  if (profile === 'none') return out;
  const meta = getFieldMetaForProfile(profile);
  for (const f of meta) {
    const raw = creds[f.name];
    if (typeof raw === 'string' && raw.trim()) {
      out[f.name] = f.kind === 'secret' ? maskValue(raw) : maskValue(raw);
    }
  }
  return out;
}

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Masked summaries use an ellipsis; do not persist those back over real secrets. */
function isMaskedPlaceholder(s: string): boolean {
  return s.includes('\u2026') && s.length < 120;
}

function mergeIncomingOntoPrevious(prev: Record<string, unknown>, inc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...prev };
  for (const [k, v] of Object.entries(inc)) {
    if (typeof v !== 'string') {
      if (v !== undefined && v !== null) out[k] = v;
      continue;
    }
    const t = v.trim();
    if (!t) continue;
    if (isMaskedPlaceholder(t)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Merge admin form payload with previously stored secrets (empty or masked fields do not wipe keys).
 * Applies safe defaults for Airtel / MTN optional columns not shown in the short admin form.
 */
export function mergeCredentialsForSave(
  profile: CredentialProfile,
  incoming: Record<string, unknown>,
  previous: Record<string, unknown> | null
): Record<string, unknown> {
  const prev = previous && typeof previous === 'object' ? { ...previous } : {};
  const merged = mergeIncomingOntoPrevious(prev, incoming);
  if (profile === 'airtel_api') {
    if (!trimStr(merged.baseUrl)) merged.baseUrl = 'https://openapiuat.airtel.africa';
    if (!trimStr(merged.country)) merged.country = 'RW';
    if (!trimStr(merged.currency)) merged.currency = 'RWF';
    if (!trimStr(merged.environment)) merged.environment = 'sandbox';
  }
  if (profile === 'mtn_momo') {
    if (!trimStr(merged.targetEnvironment)) merged.targetEnvironment = 'sandbox';
  }
  return merged;
}

function pickMergedStr(dbVal: unknown, envVal: string | undefined): string {
  const d = typeof dbVal === 'string' ? dbVal.trim() : '';
  if (d) return d;
  return (envVal || '').trim();
}

function flutterwaveFromEnv(): { publicKey: string; secretKey: string } | null {
  const publicKey = (process.env.FLW_PUBLIC_KEY || '').trim();
  const secretKey = (process.env.FLW_SECRET_KEY || '').trim();
  if (!publicKey || !secretKey) return null;
  return { publicKey, secretKey };
}

function flutterwaveExtrasFromEnv(): { encryptionKey?: string; webhookSecretHash?: string } | null {
  const encryptionKey = (process.env.FLW_ENCRYPTION_KEY || '').trim();
  // Flutterwave docs commonly use FLW_SECRET_HASH for verif-hash
  const webhookSecretHash = (process.env.FLW_SECRET_HASH || '').trim();
  if (!encryptionKey && !webhookSecretHash) return null;
  return {
    ...(encryptionKey ? { encryptionKey } : {}),
    ...(webhookSecretHash ? { webhookSecretHash } : {}),
  };
}

function momoFromEnv(): Record<string, string> | null {
  const baseUrl = (process.env.MOMO_BASE_URL || '').trim().replace(/\/$/, '');
  const subscriptionKey = (process.env.MOMO_SUBSCRIPTION_KEY || '').trim();
  const apiUser = (process.env.MOMO_API_USER || '').trim();
  const apiKey = (process.env.MOMO_API_KEY || '').trim();
  const targetEnvironment = (process.env.MOMO_TARGET_ENVIRONMENT || 'sandbox').trim();
  const callbackUrl = (process.env.MOMO_CALLBACK_URL || '').trim();
  if (!baseUrl || !subscriptionKey || !apiUser || !apiKey) return null;
  return {
    baseUrl,
    subscriptionKey,
    apiUser,
    apiKey,
    targetEnvironment,
    ...(callbackUrl ? { callbackUrl } : {}),
  };
}

function parseDecrypted(row: { encryptedCredentials?: string | null; credentialProfile?: CredentialProfile } | null): Record<string, unknown> | null {
  if (!row?.encryptedCredentials) return null;
  try {
    return decryptCredentialsJson(row.encryptedCredentials);
  } catch {
    return null;
  }
}

export async function getFlutterwaveKeysResolved(): Promise<{ publicKey: string; secretKey: string }> {
  await ensureAllPaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key: 'flutterwave' }).lean();
  const fromDb = parseDecrypted(row as any);
  const env = flutterwaveFromEnv();
  const publicKey = pickMergedStr(fromDb?.publicKey, env?.publicKey);
  const secretKey = pickMergedStr(fromDb?.secretKey, env?.secretKey);
  if (!publicKey || !secretKey) {
    throw new Error('Flutterwave is not configured (set keys in Admin → Finance or FLW_PUBLIC_KEY/FLW_SECRET_KEY)');
  }
  return { publicKey, secretKey };
}

export async function getFlutterwaveResolvedConfig(): Promise<{
  publicKey: string;
  secretKey: string;
  encryptionKey?: string;
  webhookSecretHash?: string;
  webhookUrl?: string;
}> {
  await ensureAllPaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key: 'flutterwave' }).lean();
  const fromDb = parseDecrypted(row as any);
  const envKeys = flutterwaveFromEnv();
  const envExtras = flutterwaveExtrasFromEnv();
  const publicKey = pickMergedStr(fromDb?.publicKey, envKeys?.publicKey);
  const secretKey = pickMergedStr(fromDb?.secretKey, envKeys?.secretKey);
  const encryptionKey = pickMergedStr(fromDb?.encryptionKey, envExtras?.encryptionKey) || undefined;
  const webhookSecretHash = pickMergedStr(fromDb?.webhookSecretHash, envExtras?.webhookSecretHash) || undefined;
  const docWebhook = typeof (row as any)?.webhookUrl === 'string' ? String((row as any).webhookUrl).trim() : '';
  const credWebhook = typeof fromDb?.webhookUrl === 'string' ? String(fromDb.webhookUrl).trim() : '';
  const webhookUrl = (credWebhook || docWebhook || undefined) as string | undefined;
  if (!publicKey || !secretKey) {
    throw new Error('Flutterwave is not configured (publicKey/secretKey missing)');
  }
  return {
    publicKey,
    secretKey,
    ...(encryptionKey ? { encryptionKey } : {}),
    ...(webhookSecretHash ? { webhookSecretHash } : {}),
    ...(webhookUrl ? { webhookUrl } : {}),
  };
}

export type MomoResolvedConfig = {
  baseUrl: string;
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  targetEnvironment: string;
  callbackUrl?: string;
};

export async function getMomoResolvedConfig(): Promise<MomoResolvedConfig | null> {
  await ensureAllPaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key: 'mtn_momo' }).lean();
  const fromDb = parseDecrypted(row as any);
  const env = momoFromEnv();
  const baseUrl = pickMergedStr(fromDb?.baseUrl, env?.baseUrl).replace(/\/$/, '');
  const subscriptionKey = pickMergedStr(fromDb?.subscriptionKey, env?.subscriptionKey);
  const apiUser = pickMergedStr(fromDb?.apiUser, env?.apiUser);
  const apiKey = pickMergedStr(fromDb?.apiKey, env?.apiKey);
  const targetEnvironment = pickMergedStr(fromDb?.targetEnvironment, env?.targetEnvironment) || 'sandbox';
  const callbackRaw = pickMergedStr(fromDb?.callbackUrl, env?.callbackUrl);
  const callbackUrl = callbackRaw || undefined;
  if (!baseUrl || !subscriptionKey || !apiUser || !apiKey) return null;
  return {
    baseUrl,
    subscriptionKey,
    apiUser,
    apiKey,
    targetEnvironment,
    ...(callbackUrl ? { callbackUrl } : {}),
  };
}

export type StripeResolvedCreds = {
  secretKey: string;
  publishableKey?: string;
  webhookSecret?: string;
};

function stripeFromEnv(): Partial<StripeResolvedCreds> | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  return {
    secretKey,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim(),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  };
}

export async function getStripeCredentialsResolved(): Promise<StripeResolvedCreds> {
  await ensureAllPaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key: 'stripe' }).lean();
  const fromDb = parseDecrypted(row as any);
  const env = stripeFromEnv();
  const secretKey = pickMergedStr(fromDb?.secretKey, env?.secretKey);
  if (!secretKey) {
    throw new Error('Stripe is not configured (Admin Finance or STRIPE_SECRET_KEY)');
  }
  const publishableKey = pickMergedStr(fromDb?.publishableKey, env?.publishableKey);
  const webhookSecret = pickMergedStr(fromDb?.webhookSecret, env?.webhookSecret);
  return {
    secretKey,
    ...(publishableKey ? { publishableKey } : {}),
    ...(webhookSecret ? { webhookSecret } : {}),
  };
}

function paypalFromEnv(): { clientId: string; clientSecret: string; environment?: string } | null {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, environment: (process.env.PAYPAL_ENVIRONMENT || 'sandbox').trim() };
}

export async function getPaypalCredentialsResolved(): Promise<{
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'live';
  webhookId?: string;
}> {
  await ensureAllPaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key: 'paypal' }).lean();
  const fromDb = parseDecrypted(row as any);
  const env = paypalFromEnv();
  const clientId = pickMergedStr(fromDb?.clientId, env?.clientId);
  const clientSecret = pickMergedStr(fromDb?.clientSecret, env?.clientSecret);
  const envFlag = (pickMergedStr(fromDb?.environment, env?.environment) || 'sandbox').toLowerCase();
  const environment: 'sandbox' | 'live' = envFlag === 'live' ? 'live' : 'sandbox';
  if (!clientId || !clientSecret) {
    throw new Error('PayPal is not configured (Admin Finance or PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)');
  }
  const webhookId = pickMergedStr(fromDb?.webhookId, process.env.PAYPAL_WEBHOOK_ID) || undefined;
  return { clientId, clientSecret, environment, ...(webhookId ? { webhookId } : {}) };
}

export type AirtelResolvedConfig = {
  clientId: string;
  clientSecret: string;
  merchantId?: string;
  baseUrl: string;
  country: string;
  currency: string;
};

function airtelFromEnv(): Partial<AirtelResolvedConfig> | null {
  const clientId = process.env.AIRTEL_CLIENT_ID?.trim();
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    merchantId: process.env.AIRTEL_MERCHANT_ID?.trim(),
    baseUrl: (process.env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.africa').trim().replace(/\/$/, ''),
    country: (process.env.AIRTEL_COUNTRY || 'RW').trim(),
    currency: (process.env.AIRTEL_CURRENCY || 'RWF').trim(),
  };
}

export async function getAirtelCredentialsResolved(): Promise<AirtelResolvedConfig> {
  await ensureAllPaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key: 'airtel_money' }).lean();
  const fromDb = parseDecrypted(row as any);
  const env = airtelFromEnv();
  const clientId = pickMergedStr(fromDb?.clientId, env?.clientId);
  const clientSecret = pickMergedStr(fromDb?.clientSecret, env?.clientSecret);
  const merchantId = pickMergedStr(fromDb?.merchantId, env?.merchantId) || undefined;
  const baseUrl =
    pickMergedStr(fromDb?.baseUrl, env?.baseUrl).replace(/\/$/, '') || 'https://openapiuat.airtel.africa';
  const country = pickMergedStr(fromDb?.country, env?.country) || 'RW';
  const currency = pickMergedStr(fromDb?.currency, env?.currency) || 'RWF';
  if (!clientId || !clientSecret) {
    throw new Error('Airtel Money is not configured (Admin Finance or AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET)');
  }
  return { clientId, clientSecret, ...(merchantId ? { merchantId } : {}), baseUrl, country, currency };
}

/** OAuth test config from merged credential object (includes defaults for base URL / country / currency). */
export function buildAirtelDraftConfigFromMerged(plain: Record<string, unknown>): AirtelResolvedConfig | null {
  const clientId = trimStr(plain.clientId);
  const clientSecret = trimStr(plain.clientSecret);
  const merchantId = trimStr(plain.merchantId);
  const baseUrl = trimStr(plain.baseUrl).replace(/\/$/, '') || 'https://openapiuat.airtel.africa';
  const country = trimStr(plain.country) || 'RW';
  const currency = trimStr(plain.currency) || 'RWF';
  if (!clientId || !clientSecret || !merchantId) return null;
  return { clientId, clientSecret, merchantId, baseUrl, country, currency };
}

export async function isGatewayFullyConfigured(key: string): Promise<boolean> {
  await ensureAllPaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key }).lean();
  if (!row) return false;
  const profile = (row.credentialProfile || resolveProfileForKey(key)) as CredentialProfile;
  if (profile === 'none') return true;
  if (key === 'flutterwave') {
    try {
      const cfg = await getFlutterwaveResolvedConfig();
      return Boolean(
        cfg.publicKey &&
          cfg.secretKey &&
          cfg.encryptionKey?.trim() &&
          cfg.webhookSecretHash?.trim() &&
          cfg.webhookUrl?.trim()
      );
    } catch {
      return false;
    }
  }
  if (key === 'mtn_momo') {
    const c = await getMomoResolvedConfig();
    return Boolean(c?.baseUrl && c.subscriptionKey && c.apiUser && c.apiKey && c.callbackUrl);
  }
  if (key === 'stripe') {
    try {
      const c = await getStripeCredentialsResolved();
      return Boolean(c.secretKey && c.publishableKey && c.webhookSecret);
    } catch {
      return false;
    }
  }
  if (key === 'paypal') {
    try {
      const c = await getPaypalCredentialsResolved();
      return Boolean(c.clientId && c.clientSecret && c.environment && c.webhookId);
    } catch {
      return false;
    }
  }
  if (key === 'airtel_money') {
    try {
      const c = await getAirtelCredentialsResolved();
      const raw = parseDecrypted(row as any);
      const webhookUrl = trimStr(raw?.webhookUrl);
      return Boolean(
        c.clientId && c.clientSecret && c.merchantId && c.baseUrl && c.country && c.currency && webhookUrl
      );
    } catch {
      return false;
    }
  }
  if (!row.encryptedCredentials) return false;
  const creds = parseDecrypted(row as any);
  if (!creds) return false;
  if (profile === 'generic_api_secret') {
    return Boolean(
      typeof creds.apiKey === 'string' &&
        creds.apiKey.trim() &&
        typeof creds.secretKey === 'string' &&
        creds.secretKey.trim()
    );
  }
  return false;
}

export function resolveProfileForKey(key: string): CredentialProfile {
  const g = GATEWAY_REGISTRY.find((x) => x.key === key);
  return g?.profile ?? 'generic_api_secret';
}

export async function ensureAllPaymentGateways(): Promise<void> {
  for (const g of GATEWAY_REGISTRY) {
    await PaymentGatewayConfig.updateOne(
      { key: g.key },
      {
        $setOnInsert: {
          key: g.key,
          name: g.name,
          type: g.type,
          status: g.defaultEnabled ? 'online' : 'offline',
          isEnabled: g.defaultEnabled,
          issues: [],
          testMode: false,
          credentialProfile: g.profile,
        },
        $set: {
          name: g.name,
          type: g.type,
          credentialProfile: g.profile,
        },
      },
      { upsert: true }
    );
  }
  const allowed = GATEWAY_REGISTRY.map((x) => x.key);
  await PaymentGatewayConfig.deleteMany({ key: { $nin: allowed } });
}

export async function appendGatewayHealthLog(
  gatewayId: string,
  level: 'info' | 'warn' | 'error',
  message: string
): Promise<void> {
  const entry = { at: new Date(), level, message };
  await PaymentGatewayConfig.findByIdAndUpdate(gatewayId, {
    $push: {
      healthLogs: {
        $each: [entry],
        $slice: -40,
      },
    },
  });
}

let fwClient: InstanceType<typeof Flutterwave> | null = null;
let fwFp = '';

export function invalidateFlutterwaveClientCache(): void {
  fwClient = null;
  fwFp = '';
}

function bumpMomoAfterCredentialChange(): void {
  clearMomoTokenCacheSafe();
}

export async function getFlutterwaveClient(): Promise<InstanceType<typeof Flutterwave>> {
  const keys = await getFlutterwaveKeysResolved();
  const fp = `${keys.publicKey.slice(-6)}:${keys.secretKey.slice(-6)}`;
  if (fwClient && fp === fwFp) return fwClient;
  fwClient = new Flutterwave(keys.publicKey, keys.secretKey);
  fwFp = fp;
  return fwClient;
}

export async function testFlutterwaveConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const flw = await getFlutterwaveClient();
    const res: any = await flw.Misc.bal();
    if (res?.status === 'success') {
      return { ok: true, message: 'Connected — wallet balances retrieved' };
    }
    return { ok: false, message: res?.message || 'Unexpected Flutterwave response' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Flutterwave test failed' };
  }
}

export async function testMomoConnectionWithConfig(cfg: MomoResolvedConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await axios.post<MomoTokenResponse>(
      `${cfg.baseUrl}/collection/token/`,
      {},
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${cfg.apiUser}:${cfg.apiKey}`, 'utf8').toString('base64')}`,
          'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
          'X-Target-Environment': cfg.targetEnvironment,
        },
        timeout: 25_000,
        validateStatus: () => true,
      }
    );
    if (res.status === 200 && res.data?.access_token) {
      return { ok: true, message: 'Connected — MTN Collections token obtained' };
    }
    const detail = res.data ? JSON.stringify(res.data) : res.statusText;
    return { ok: false, message: `MTN token failed (${res.status}): ${detail}` };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'MTN MoMo test failed' };
  }
}

type MomoTokenResponse = { access_token?: string };

export async function testGatewayByKey(
  key: string,
  opts?: {
    momoOverride?: MomoResolvedConfig | null;
    flutterwaveOverride?: { publicKey: string; secretKey: string };
    airtelOverride?: AirtelResolvedConfig;
  }
): Promise<{ ok: boolean; message: string }> {
  const profile = resolveProfileForKey(key);
  if (profile === 'none') {
    return { ok: true, message: 'No API credentials required for offline/manual payments' };
  }
  if (key === 'flutterwave') {
    if (opts?.flutterwaveOverride?.publicKey && opts?.flutterwaveOverride?.secretKey) {
      const flw = new Flutterwave(opts.flutterwaveOverride.publicKey, opts.flutterwaveOverride.secretKey);
      const res: any = await flw.Misc.bal();
      if (res?.status === 'success') {
        return { ok: true, message: 'Connected — wallet balances retrieved (draft keys)' };
      }
      return { ok: false, message: res?.message || 'Flutterwave test failed' };
    }
    return testFlutterwaveConnection();
  }
  if (key === 'mtn_momo') {
    const cfg = opts?.momoOverride ?? (await getMomoResolvedConfig());
    if (!cfg) return { ok: false, message: 'MTN MoMo is not configured' };
    return testMomoConnectionWithConfig(cfg);
  }
  if (key === 'stripe') {
    const { testStripeConnection } = await import('./stripeCheckout.service');
    return testStripeConnection();
  }
  if (key === 'paypal') {
    const { testPayPalConnection } = await import('./paypalCheckout.service');
    return testPayPalConnection();
  }
  if (key === 'airtel_money') {
    const { testAirtelConnection } = await import('./airtelMoney.service');
    return testAirtelConnection(opts?.airtelOverride);
  }
  if (profile === 'generic_api_secret') {
    const row = await PaymentGatewayConfig.findOne({ key }).lean();
    const creds = parseDecrypted(row as any);
    if (!creds?.apiKey || !creds?.secretKey) {
      return { ok: false, message: 'API Key and Secret Key are required' };
    }
    return { ok: true, message: 'Credentials present (provider-specific live test not implemented)' };
  }
  return { ok: false, message: 'Unknown gateway profile' };
}

export function suggestedFlutterwaveWebhookUrl(): string {
  const base = getServerUrl();
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/api/webhooks/flutterwave/webhook`;
}

export function suggestedStripeWebhookUrl(): string {
  const base = getServerUrl();
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/api/webhooks/stripe/webhook`;
}

export function suggestedPaypalWebhookUrl(): string {
  const base = getServerUrl();
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/api/webhooks/paypal/webhook`;
}

export function suggestedMomoCallbackUrl(): string {
  const explicit = (process.env.MOMO_CALLBACK_URL || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const base = getServerUrl();
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/api/payments/momo/callback`;
}

export async function saveEncryptedCredentials(
  gatewayMongoId: string,
  profile: CredentialProfile,
  plain: Record<string, unknown>
): Promise<void> {
  const enc = encryptCredentialsJson(plain);
  const masked = buildMaskedSummary(profile, plain);
  const update: Record<string, unknown> = {
    encryptedCredentials: enc,
    maskedSummary: masked,
  };
  if (profile === 'flutterwave' && typeof plain.webhookUrl === 'string' && plain.webhookUrl.trim()) {
    update.webhookUrl = plain.webhookUrl.trim();
  }
  await PaymentGatewayConfig.findByIdAndUpdate(gatewayMongoId, update);
  invalidateFlutterwaveClientCache();
  bumpMomoAfterCredentialChange();
}

export function invalidatePaymentRuntimeCaches(): void {
  invalidateFlutterwaveClientCache();
  bumpMomoAfterCredentialChange();
}
