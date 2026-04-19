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
        { name: 'publicKey', label: 'Public Key', kind: 'secret' },
        { name: 'secretKey', label: 'Secret Key', kind: 'secret' },
        { name: 'webhookUrl', label: 'Webhook URL (dashboard)', kind: 'url', hint: 'Register this in Flutterwave dashboard webhooks' },
      ];
    case 'mtn_momo':
      return [
        { name: 'baseUrl', label: 'MOMO_BASE_URL', kind: 'url' },
        { name: 'subscriptionKey', label: 'Subscription Key', kind: 'secret' },
        { name: 'apiUser', label: 'API User (UUID)', kind: 'text' },
        { name: 'apiKey', label: 'API Key', kind: 'secret' },
        { name: 'targetEnvironment', label: 'Target environment', kind: 'text', hint: 'sandbox or mtnrwanda (production)' },
        { name: 'callbackUrl', label: 'Callback URL', kind: 'url', hint: 'Must match MTN product callback; server default uses SERVER_URL' },
      ];
    case 'stripe':
      return [
        { name: 'secretKey', label: 'Secret key (sk_live_… / sk_test_…)', kind: 'secret' },
        { name: 'publishableKey', label: 'Publishable key (pk_…)', kind: 'secret' },
        { name: 'webhookSecret', label: 'Webhook signing secret (whsec_…)', kind: 'secret', hint: 'For /api/webhooks/stripe/webhook' },
        { name: 'environment', label: 'Environment', kind: 'text', hint: 'sandbox or live (informational; keys determine mode)' },
      ];
    case 'paypal':
      return [
        { name: 'clientId', label: 'Client ID', kind: 'secret' },
        { name: 'clientSecret', label: 'Secret', kind: 'secret' },
        { name: 'environment', label: 'Environment', kind: 'text', hint: 'sandbox or live' },
      ];
    case 'airtel_api':
      return [
        { name: 'clientId', label: 'Client ID', kind: 'secret' },
        { name: 'clientSecret', label: 'Client Secret', kind: 'secret' },
        { name: 'baseUrl', label: 'API base URL', kind: 'url', hint: 'Sandbox: https://openapiuat.airtel.africa — Live: https://openapi.airtel.africa' },
        { name: 'country', label: 'Country code', kind: 'text', hint: 'RW for Rwanda' },
        { name: 'currency', label: 'Currency', kind: 'text', hint: 'RWF' },
        { name: 'environment', label: 'Environment', kind: 'text', hint: 'sandbox or live' },
      ];
    case 'generic_api_secret':
      return [
        { name: 'apiKey', label: 'API Key / Client ID', kind: 'secret' },
        { name: 'secretKey', label: 'Secret Key', kind: 'secret' },
        { name: 'webhookUrl', label: 'Webhook URL', kind: 'url' },
      ];
    default:
      return [];
  }
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
  return { clientId, clientSecret, environment };
}

export type AirtelResolvedConfig = {
  clientId: string;
  clientSecret: string;
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
  const baseUrl =
    pickMergedStr(fromDb?.baseUrl, env?.baseUrl).replace(/\/$/, '') || 'https://openapiuat.airtel.africa';
  const country = pickMergedStr(fromDb?.country, env?.country) || 'RW';
  const currency = pickMergedStr(fromDb?.currency, env?.currency) || 'RWF';
  if (!clientId || !clientSecret) {
    throw new Error('Airtel Money is not configured (Admin Finance or AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET)');
  }
  return { clientId, clientSecret, baseUrl, country, currency };
}

export async function isGatewayFullyConfigured(key: string): Promise<boolean> {
  await ensureAllPaymentGateways();
  const row = await PaymentGatewayConfig.findOne({ key }).lean();
  if (!row) return false;
  const profile = (row.credentialProfile || resolveProfileForKey(key)) as CredentialProfile;
  if (profile === 'none') return true;
  if (key === 'flutterwave') {
    try {
      await getFlutterwaveKeysResolved();
      return true;
    } catch {
      return false;
    }
  }
  if (key === 'mtn_momo') {
    const c = await getMomoResolvedConfig();
    return Boolean(c);
  }
  if (key === 'stripe') {
    try {
      await getStripeCredentialsResolved();
      return true;
    } catch {
      return false;
    }
  }
  if (key === 'paypal') {
    try {
      await getPaypalCredentialsResolved();
      return true;
    } catch {
      return false;
    }
  }
  if (key === 'airtel_money') {
    try {
      await getAirtelCredentialsResolved();
      return true;
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
    return testAirtelConnection();
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
  await PaymentGatewayConfig.findByIdAndUpdate(gatewayMongoId, {
    encryptedCredentials: enc,
    maskedSummary: masked,
  });
  invalidateFlutterwaveClientCache();
  bumpMomoAfterCredentialChange();
}

export function invalidatePaymentRuntimeCaches(): void {
  invalidateFlutterwaveClientCache();
  bumpMomoAfterCredentialChange();
}
