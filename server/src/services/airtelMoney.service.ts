import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { getAirtelCredentialsResolved, type AirtelResolvedConfig } from './paymentGatewayCredentials.service';

type TokenResponse = { access_token?: string; token_type?: string; expires_in?: number };

let cached: { token: string; exp: number; cfg: string } | null = null;

function cacheKey(c: AirtelResolvedConfig): string {
  return `${c.baseUrl}:${c.clientId}`;
}

export async function getAirtelAccessToken(cfg?: AirtelResolvedConfig): Promise<{ token: string; config: AirtelResolvedConfig }> {
  const c = cfg || (await getAirtelCredentialsResolved());
  const now = Date.now();
  if (cached && cached.cfg === cacheKey(c) && now < cached.exp - 60_000) {
    return { token: cached.token, config: c };
  }

  const url = `${c.baseUrl}/auth/oauth2/token`;
  const { data } = await axios.post<TokenResponse>(
    url,
    {
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: 'client_credentials',
    },
    {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 25_000,
    }
  );

  const token = data.access_token;
  if (!token) {
    throw new Error('Airtel OAuth did not return access_token');
  }
  const ttlMs = (typeof data.expires_in === 'number' ? data.expires_in : 3600) * 1000;
  cached = { token, exp: now + ttlMs, cfg: cacheKey(c) };
  return { token, config: c };
}

/**
 * USSD push collection — Airtel Africa Open API merchant v1.
 * @see https://developers.airtel.africa/documentation
 */
export async function airtelRequestToPay(input: {
  amount: string;
  msisdn: string;
  reference: string;
  externalId: string;
}): Promise<{ transactionId: string; status: number }> {
  const { token, config } = await getAirtelAccessToken();
  const msisdn = input.msisdn.replace(/\D/g, '');
  const url = `${config.baseUrl}/merchant/v1/payments/`;
  const body = {
    reference: input.reference,
    subscriber: {
      country: config.country,
      currency: config.currency,
      msisdn,
    },
    transaction: {
      amount: Number(input.amount),
      country: config.country,
      currency: config.currency,
      id: input.externalId,
    },
    ...(config.merchantId ? { merchant: { id: config.merchantId } } : {}),
  };

  const res = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Country': config.country,
      'X-Currency': config.currency,
      ...(config.merchantId ? { 'X-Merchant-Id': config.merchantId } : {}),
    },
    validateStatus: () => true,
    timeout: 35_000,
  });

  if (res.status !== 200 && res.status !== 201 && res.status !== 202) {
    const detail = res.data ? JSON.stringify(res.data) : res.statusText;
    throw new Error(`Airtel collection failed (${res.status}): ${detail}`);
  }

  const tid =
    (res.data as any)?.data?.transaction?.id ||
    (res.data as any)?.transaction?.id ||
    (res.data as any)?.transactionId ||
    input.reference;

  return { transactionId: String(tid), status: res.status };
}

export async function getAirtelPaymentStatus(transactionId: string): Promise<{
  status: string;
  amount?: string;
  currency?: string;
}> {
  const { token, config } = await getAirtelAccessToken();
  const url = `${config.baseUrl}/standard/v1/payments/${encodeURIComponent(transactionId)}`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'X-Country': config.country,
      'X-Currency': config.currency,
    },
    validateStatus: () => true,
    timeout: 25_000,
  });
  if (res.status !== 200) {
    const detail = res.data ? JSON.stringify(res.data) : res.statusText;
    throw new Error(`Airtel status failed (${res.status}): ${detail}`);
  }
  const d = res.data as any;
  const status = String(d?.data?.transaction?.status || d?.transaction?.status || d?.status || 'UNKNOWN');
  return {
    status,
    amount: d?.data?.transaction?.amount != null ? String(d.data.transaction.amount) : undefined,
    currency: d?.data?.transaction?.currency || config.currency,
  };
}

export function newAirtelReferenceId(): string {
  return randomUUID();
}

export function normalizeAirtelMsisdn(raw: string, countryCode = '250'): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith(countryCode) && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 10) return `${countryCode}${digits.slice(1)}`;
  if (digits.length === 9) return `${countryCode}${digits}`;
  return digits.length >= 11 ? digits : null;
}

export async function testAirtelConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await getAirtelAccessToken();
    return { ok: true, message: 'Connected — Airtel OAuth token obtained' };
  } catch (e) {
    const ax = e as AxiosError;
    const detail = ax.response?.data ?? ax.message;
    return {
      ok: false,
      message: typeof detail === 'string' ? detail : JSON.stringify(detail),
    };
  }
}
