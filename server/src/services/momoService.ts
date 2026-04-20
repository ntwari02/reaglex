import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { getMomoResolvedConfig, type MomoResolvedConfig } from './paymentGatewayCredentials.service';
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

function basicAuthHeader(apiUser: string, apiKey: string): string {
  const raw = `${apiUser}:${apiKey}`;
  return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
}

async function resolveConfig(): Promise<MomoResolvedConfig | null> {
  return getMomoResolvedConfig();
}

export async function isMomoConfigured(): Promise<boolean> {
  const c = await resolveConfig();
  return Boolean(c?.baseUrl && c.subscriptionKey && c.apiUser && c.apiKey && c.currency);
}

/**
 * Public HTTPS URL MTN will POST callbacks to. Uses stored callback, MOMO_CALLBACK_URL, or SERVER_URL + path.
 */
export async function buildDefaultMomoCallbackUrl(): Promise<string | undefined> {
  const c = await resolveConfig();
  const fromCfg = c?.callbackUrl?.trim().replace(/\/$/, '');
  if (fromCfg) return fromCfg;
  const explicit = (process.env.MOMO_CALLBACK_URL || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const base = getServerUrl();
  if (!base) return undefined;
  return `${base.replace(/\/$/, '')}/api/payments/momo/callback`;
}

export async function assertMomoCallbackUrlProductionSafe(): Promise<void> {
  const url = await buildDefaultMomoCallbackUrl();
  if (!isProductionNodeEnv()) return;
  if (!url || /localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error(
      'MoMo requires a public callback URL. Set callback in Admin → MTN MoMo, or MOMO_CALLBACK_URL / SERVER_URL on the host.'
    );
  }
}

/**
 * Collections OAuth token (Basic API_USER:API_KEY). Cached until shortly before `expires_in` (default 3600s).
 */
export async function getMomoAccessToken(): Promise<string> {
  const cfg = await resolveConfig();
  if (!cfg) {
    throw new Error('MTN MoMo is not configured (Admin Finance or MOMO_* environment variables)');
  }

  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAtMs) {
    return cachedToken.token;
  }

  const url = `${cfg.baseUrl}/collection/token/`;
  try {
    const { data } = await axios.post<MomoTokenResponse>(
      url,
      {},
      {
        headers: {
          Authorization: basicAuthHeader(cfg.apiUser, cfg.apiKey),
          'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
          'X-Target-Environment': cfg.targetEnvironment,
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

async function collectionHeaders(token: string, cfg: MomoResolvedConfig, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${token}`,
    'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
    'X-Target-Environment': cfg.targetEnvironment,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function postRequestToPayOnce(
  url: string,
  body: Record<string, unknown>,
  referenceId: string,
  token: string,
  cfg: MomoResolvedConfig
) {
  const h = await collectionHeaders(token, cfg, { 'X-Reference-Id': referenceId });
  return axios.post(url, body, {
    headers: h,
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
  const cfg = await resolveConfig();
  if (!cfg) {
    throw new Error('MTN MoMo is not configured');
  }
  let token = await getMomoAccessToken();
  const callbackUrl = await buildDefaultMomoCallbackUrl();

  const url = `${cfg.baseUrl}/collection/v1_0/requesttopay`;
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
    let res = await postRequestToPayOnce(url, body, input.referenceId, token, cfg);
    if (res.status === 401) {
      clearMomoTokenCache();
      token = await getMomoAccessToken();
      res = await postRequestToPayOnce(url, body, input.referenceId, token, cfg);
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
  const cfg = await resolveConfig();
  if (!cfg) {
    throw new Error('MTN MoMo is not configured');
  }
  let token = await getMomoAccessToken();
  const url = `${cfg.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(referenceId)}`;

  let h = await collectionHeaders(token, cfg, { 'X-Reference-Id': referenceId });
  let res = await axios.get(url, {
    headers: h,
    validateStatus: () => true,
    timeout: 25_000,
  });
  if (res.status === 401) {
    clearMomoTokenCache();
    token = await getMomoAccessToken();
    h = await collectionHeaders(token, cfg, { 'X-Reference-Id': referenceId });
    res = await axios.get(url, {
      headers: h,
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
