import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { getServerUrl, isProductionNodeEnv } from '../config/publicEnv';

type MomoTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type RequestToPayStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED' | string;

export type MomoRequestToPayResult = {
  referenceId: string;
  status: number;
};

export type MomoPaymentStatus = {
  status: RequestToPayStatus;
  amount?: string;
  currency?: string;
  financialTransactionId?: string;
  externalId?: string;
  reason?: { code?: string; message?: string };
  raw?: unknown;
};

let cachedToken: { token: string; expiresAtMs: number } | null = null;

export function clearMomoTokenCache(): void {
  cachedToken = null;
}

function momoConfig() {
  const baseUrl = (process.env.MOMO_BASE_URL || '').trim().replace(/\/$/, '');
  const subscriptionKey = (process.env.MOMO_SUBSCRIPTION_KEY || '').trim();
  const apiUser = (process.env.MOMO_API_USER || '').trim();
  const apiKey = (process.env.MOMO_API_KEY || '').trim();
  const targetEnvironment = (process.env.MOMO_TARGET_ENVIRONMENT || 'sandbox').trim();
  return { baseUrl, subscriptionKey, apiUser, apiKey, targetEnvironment };
}

export function isMomoConfigured(): boolean {
  const c = momoConfig();
  return Boolean(c.baseUrl && c.subscriptionKey && c.apiUser && c.apiKey);
}

function basicAuthHeader(apiUser: string, apiKey: string): string {
  const raw = `${apiUser}:${apiKey}`;
  return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
}

/**
 * Collections OAuth token (Basic API_USER:API_KEY). Cached until shortly before `expires_in` (default 3600s).
 */
export async function getMomoAccessToken(): Promise<string> {
  const { baseUrl, subscriptionKey, apiUser, apiKey, targetEnvironment } = momoConfig();
  if (!baseUrl || !subscriptionKey || !apiUser || !apiKey) {
    throw new Error('MTN MoMo is not configured (missing MOMO_* environment variables)');
  }

  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAtMs) {
    return cachedToken.token;
  }

  const url = `${baseUrl}/collection/token/`;
  try {
    const { data } = await axios.post<MomoTokenResponse>(
      url,
      {},
      {
        headers: {
          Authorization: basicAuthHeader(apiUser, apiKey),
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'X-Target-Environment': targetEnvironment,
        },
        timeout: 25_000,
      }
    );

    const token = data.access_token;
    if (!token) {
      throw new Error('MoMo token response missing access_token');
    }

    const ttlSec =
      typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : 3600;
    const safetyMs = 120_000;
    let expiresAtMs = now + ttlSec * 1000 - safetyMs;
    if (expiresAtMs <= now + 60_000) {
      expiresAtMs = now + 50 * 60_000;
    }
    cachedToken = { token, expiresAtMs };
    return token;
  } catch (e) {
    const ax = e as AxiosError;
    const detail = ax.response?.data ?? ax.message;
    throw new Error(`MoMo token request failed: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
}

/**
 * Public HTTPS URL MTN will POST callbacks to. Prefer MOMO_CALLBACK_URL in production
 * (full URL including /api/payments/momo/callback). Otherwise SERVER_URL (or RENDER_EXTERNAL_URL / APP_URL) + path.
 */
export function buildDefaultMomoCallbackUrl(): string | undefined {
  const explicit = (process.env.MOMO_CALLBACK_URL || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const base = getServerUrl();
  if (!base) return undefined;
  return `${base.replace(/\/$/, '')}/api/payments/momo/callback`;
}

export function assertMomoCallbackUrlProductionSafe(): void {
  const url = buildDefaultMomoCallbackUrl();
  if (!isProductionNodeEnv()) return;
  if (!url || /localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error(
      'MoMo requires a public callback URL. Set MOMO_CALLBACK_URL to https://your-api-host/.../momo/callback or set SERVER_URL to your hosted API base (not localhost).'
    );
  }
}

function collectionHeaders(token: string, extra?: Record<string, string>) {
  const { subscriptionKey, targetEnvironment } = momoConfig();
  return {
    Authorization: `Bearer ${token}`,
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    'X-Target-Environment': targetEnvironment,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/**
 * Collections RequestToPay. `referenceId` must be a UUID (v4).
 * `amount` is minor units as string per MTN API (e.g. "1500" for 1500 RWF).
 */
async function postRequestToPayOnce(
  url: string,
  body: Record<string, unknown>,
  referenceId: string,
  token: string
) {
  return axios.post(url, body, {
    headers: collectionHeaders(token, { 'X-Reference-Id': referenceId }),
    validateStatus: () => true,
    timeout: 35_000,
  });
}

export async function requestToPay(input: {
  referenceId: string;
  amount: string;
  currency: string;
  externalId: string;
  payerMsisdn: string;
  payerMessage?: string;
  payeeNote?: string;
}): Promise<MomoRequestToPayResult> {
  const { baseUrl } = momoConfig();
  let token = await getMomoAccessToken();
  const callbackUrl = buildDefaultMomoCallbackUrl();

  const url = `${baseUrl}/collection/v1_0/requesttopay`;
  const body: Record<string, unknown> = {
    amount: input.amount,
    currency: input.currency,
    externalId: input.externalId,
    payer: {
      partyIdType: 'MSISDN',
      partyId: input.payerMsisdn,
    },
    payerMessage: input.payerMessage || 'Reaglex order',
    payeeNote: input.payeeNote || `Order ${input.externalId}`,
  };
  if (callbackUrl) {
    body.callbackUrl = callbackUrl;
  }

  try {
    let res = await postRequestToPayOnce(url, body, input.referenceId, token);
    if (res.status === 401) {
      clearMomoTokenCache();
      token = await getMomoAccessToken();
      res = await postRequestToPayOnce(url, body, input.referenceId, token);
    }

    if (res.status === 202 || res.status === 201) {
      return { referenceId: input.referenceId, status: res.status };
    }

    const msg = res.data ? JSON.stringify(res.data) : res.statusText;
    throw new Error(`MoMo RequestToPay failed (${res.status}): ${msg}`);
  } catch (e) {
    if ((e as Error).message?.startsWith('MoMo RequestToPay failed')) throw e;
    const ax = e as AxiosError;
    const detail = ax.response?.data ?? ax.message;
    throw new Error(`MoMo RequestToPay error: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
}

export async function getRequestToPayStatus(referenceId: string): Promise<MomoPaymentStatus> {
  const { baseUrl } = momoConfig();
  let token = await getMomoAccessToken();
  const url = `${baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(referenceId)}`;

  let res = await axios.get(url, {
    headers: collectionHeaders(token, { 'X-Reference-Id': referenceId }),
    validateStatus: () => true,
    timeout: 25_000,
  });
  if (res.status === 401) {
    clearMomoTokenCache();
    token = await getMomoAccessToken();
    res = await axios.get(url, {
      headers: collectionHeaders(token, { 'X-Reference-Id': referenceId }),
      validateStatus: () => true,
      timeout: 25_000,
    });
  }

  if (res.status !== 200) {
    const msg = res.data ? JSON.stringify(res.data) : res.statusText;
    throw new Error(`MoMo status failed (${res.status}): ${msg}`);
  }

  const d = res.data as Record<string, unknown>;
  return {
    status: String(d.status || 'UNKNOWN'),
    amount: typeof d.amount === 'string' ? d.amount : undefined,
    currency: typeof d.currency === 'string' ? d.currency : undefined,
    financialTransactionId:
      typeof d.financialTransactionId === 'string' ? d.financialTransactionId : undefined,
    externalId: typeof d.externalId === 'string' ? d.externalId : undefined,
    reason: d.reason as MomoPaymentStatus['reason'],
    raw: d,
  };
}

/** Alias for MTN RequestToPay GET status (same as getRequestToPayStatus). */
export const getPaymentStatus = getRequestToPayStatus;

export function newMomoReferenceId(): string {
  return randomUUID();
}

/**
 * Normalize to MSISDN without + for MTN Collections (Rwanda: country code 250).
 */
export function normalizeMomoMsisdn(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('250') && digits.length >= 12) return digits;
  if (digits.startsWith('0') && digits.length >= 10) return `250${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('7')) return `250${digits}`;
  if (digits.length === 10 && digits.startsWith('7')) return `250${digits}`;
  return digits.length >= 11 ? digits : null;
}
