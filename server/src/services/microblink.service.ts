import axios, { isAxiosError } from 'axios';
import FormData from 'form-data';

/** Keep under Render/proxy ~30s request limit so the client gets JSON, not a bare 502 gateway page. */
const MICROBLINK_TIMEOUT_MS = 28_000;

/** Thrown when Microblink HTTP API returns an error or an invalid payload. */
export class MicroblinkApiError extends Error {
  readonly httpStatus: number;
  readonly upstreamBody?: unknown;

  constructor(message: string, httpStatus: number, upstreamBody?: unknown) {
    super(message);
    this.name = 'MicroblinkApiError';
    this.httpStatus = httpStatus;
    this.upstreamBody = upstreamBody;
  }
}

/** Host subdomain values for BlinkID Verify API (see Microblink regional endpoints). */
export type MicroblinkRegion = 'us-east' | 'eu' | 'ca';

export interface MicroblinkFraudFlag {
  name: string;
  result: string;
  message?: string;
  severity: 'fail' | 'warn' | 'pass' | 'unknown';
}

export interface MicroblinkRegionConfig {
  /** Normalized host subdomain: us-east | eu | ca */
  region: MicroblinkRegion;
  /** Raw env value (e.g. EU, us-east) */
  envValue: string;
  baseUrl: string;
  configured: boolean;
}

export interface MicroblinkVerifyResult {
  processingStatus: string;
  recommendedOutcome: string;
  verificationResult: string;
  certaintyLevel?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  idNumber?: string;
  dateOfBirth?: string;
  documentExpiry?: string;
  country?: string;
  nationality?: string;
  documentType?: string;
  faceMatchScore?: number;
  livenessScore?: number;
  checksPassed: number;
  checksFailed: number;
  failureMessages: string[];
  fraudFlags: MicroblinkFraudFlag[];
  confidenceScore?: number;
  performedChecks?: number;
  raw?: Record<string, unknown>;
}

/** Map MICROBLINK_REGION env to API host subdomain. Default: eu (development). */
export function resolveMicroblinkRegion(raw?: string): MicroblinkRegion {
  const value = (raw ?? process.env.MICROBLINK_REGION ?? 'eu').trim().toLowerCase();
  if (value === 'eu' || value === 'europe') return 'eu';
  if (value === 'ca' || value === 'canada') return 'ca';
  if (value === 'us' || value === 'us-east' || value === 'usa' || value === 'us_east') return 'us-east';
  return 'eu';
}

export interface MicroblinkDiagnostics {
  region: MicroblinkRegion;
  envValue: string;
  baseUrl: string;
  configured: boolean;
  licenseKeyLength: number;
  secretLength: number;
  /** True when whitespace appears inside the secret (common Render `+` → space bug). */
  secretMayBeCorrupted: boolean;
  secretLooksTruncated: boolean;
  usingBase64Secret: boolean;
}

/** Read secret from MICROBLINK_SECRET or MICROBLINK_SECRET_B64 (recommended on Render when secret contains + or =). */
export function resolveMicroblinkSecret(): string | null {
  const b64 =
    process.env.MICROBLINK_SECRET_B64?.trim() || process.env.MICROBLINK_SECRET_BASE64?.trim();
  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8').trim();
      return decoded || null;
    } catch {
      console.error('[microblink] MICROBLINK_SECRET_B64 is not valid base64');
      return null;
    }
  }
  const plain = process.env.MICROBLINK_SECRET?.trim();
  return plain || null;
}

export function getMicroblinkDiagnostics(): MicroblinkDiagnostics {
  const envValue = (process.env.MICROBLINK_REGION ?? 'eu').trim();
  const region = resolveMicroblinkRegion(envValue);
  const licenseKey = process.env.MICROBLINK_LICENSE_KEY?.trim() ?? '';
  const secret = resolveMicroblinkSecret() ?? '';
  const usingBase64Secret = Boolean(
    process.env.MICROBLINK_SECRET_B64?.trim() || process.env.MICROBLINK_SECRET_BASE64?.trim(),
  );
  const secretMayBeCorrupted = Boolean(secret && /\s/.test(secret));
  const secretLooksTruncated =
    Boolean(secret) && !usingBase64Secret && !secretMayBeCorrupted && secret.length < 40;

  return {
    region,
    envValue: envValue || 'eu',
    baseUrl: `https://${region}.verify.microblink.com`,
    configured: Boolean(licenseKey && secret && getAuthHeader()),
    licenseKeyLength: licenseKey.length,
    secretLength: secret.length,
    secretMayBeCorrupted,
    secretLooksTruncated,
    usingBase64Secret,
  };
}

export function getMicroblinkRegionConfig(): MicroblinkRegionConfig {
  const d = getMicroblinkDiagnostics();
  return {
    region: d.region,
    envValue: d.envValue,
    baseUrl: d.baseUrl,
    configured: d.configured,
  };
}

export function logMicroblinkStartupCheck(): void {
  const d = getMicroblinkDiagnostics();
  if (!d.configured) {
    console.warn('[microblink] Identity verification disabled (missing MICROBLINK_LICENSE_KEY or secret)');
    return;
  }
  console.log(
    `[microblink] region=${d.region} host=${d.baseUrl} secretLen=${d.secretLength} b64=${d.usingBase64Secret}`,
  );
  if (d.secretMayBeCorrupted) {
    console.error(
      '[microblink] Secret contains whitespace — often caused by unquoted + in Render env. ' +
        'Re-paste the secret in quotes or set MICROBLINK_SECRET_B64 instead.',
    );
  }
  if (d.secretLooksTruncated) {
    console.warn(
      `[microblink] Secret length ${d.secretLength} looks short; confirm the full value including trailing == is set.`,
    );
  }
}

function getBaseUrl(): string {
  return getMicroblinkRegionConfig().baseUrl;
}

function getAuthHeader(): string | null {
  const licenseKey = process.env.MICROBLINK_LICENSE_KEY?.trim();
  const secret = resolveMicroblinkSecret();
  if (!licenseKey || !secret) return null;
  const token = Buffer.from(`${licenseKey}:${secret}`).toString('base64');
  return `Basic ${token}`;
}

export function isMicroblinkConfigured(): boolean {
  return Boolean(getAuthHeader());
}

export function microblinkUpstreamHint(httpStatus: number): string | undefined {
  if (httpStatus === 401 || httpStatus === 403) {
    return (
      'Microblink rejected credentials. Confirm MICROBLINK_REGION matches your license (EU → eu, US → us-east), ' +
      'and on Render set MICROBLINK_SECRET in quotes or use MICROBLINK_SECRET_B64 if the secret contains + or =.'
    );
  }
  if (httpStatus === 404) {
    return 'Microblink API host not found for this region. Try MICROBLINK_REGION=us-east or eu.';
  }
  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    return 'Microblink or the network path is temporarily unavailable. Retry with a smaller image (under 5 MB).';
  }
  return undefined;
}

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (v && typeof v === 'object' && 'value' in (v as object)) {
      const inner = (v as { value?: unknown }).value;
      if (typeof inner === 'string' && inner.trim()) return inner.trim();
    }
  }
  return undefined;
}

function walkExtraction(node: unknown, bucket: Record<string, unknown>) {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === 'object' && 'value' in (val as object)) {
      bucket[key] = (val as { value: unknown }).value;
    } else if (val && typeof val === 'object') {
      walkExtraction(val, bucket);
    }
  }
}

function parseExtraction(extraction: unknown): Partial<MicroblinkVerifyResult> {
  const flat: Record<string, unknown> = {};
  walkExtraction(extraction, flat);

  const firstName = pickString(flat.firstName, flat.givenName, flat.givenNames);
  const lastName = pickString(flat.lastName, flat.surname, flat.fullName);
  const fullName =
    pickString(flat.fullName, flat.owner, flat.name) ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    undefined;

  return {
    fullName,
    firstName,
    lastName,
    idNumber: pickString(flat.documentNumber, flat.personalIdNumber, flat.identityNumber, flat.idNumber),
    dateOfBirth: pickString(flat.dateOfBirth, flat.birthDate),
    documentExpiry: pickString(flat.dateOfExpiry, flat.expiryDate, flat.documentExpiry),
    country: pickString(flat.country, flat.issuingCountry, flat.nationalityCountry),
    nationality: pickString(flat.nationality, flat.nationalityCountry),
    documentType: pickString(flat.documentType, flat.type),
  };
}

function parseFaceScores(payload: Record<string, unknown>): { faceMatchScore?: number; livenessScore?: number } {
  const checks = Array.isArray(payload.checks) ? payload.checks : [];
  let faceMatchScore: number | undefined;
  let livenessScore: number | undefined;

  for (const check of checks) {
    if (!check || typeof check !== 'object') continue;
    const c = check as Record<string, unknown>;
    const name = String(c.name || c.type || '').toLowerCase();
    const score = typeof c.score === 'number' ? c.score : typeof c.probability === 'number' ? c.probability : undefined;
    if (score === undefined) continue;
    if (name.includes('face') && name.includes('match')) faceMatchScore = score;
    if (name.includes('liveness')) livenessScore = score;
  }

  const processIndicators = Array.isArray(payload.processIndicators) ? payload.processIndicators : [];
  for (const ind of processIndicators) {
    if (!ind || typeof ind !== 'object') continue;
    const i = ind as Record<string, unknown>;
    const name = String(i.name || i.type || '').toLowerCase();
    const score = typeof i.score === 'number' ? i.score : undefined;
    if (score === undefined) continue;
    if (name.includes('face') && name.includes('match')) faceMatchScore = faceMatchScore ?? score;
    if (name.includes('liveness')) livenessScore = livenessScore ?? score;
  }

  return { faceMatchScore, livenessScore };
}

function classifyCheckResult(result: string): 'pass' | 'fail' | 'warn' | 'unknown' {
  if (result === 'pass' || result === 'passed' || result === 'ok' || result === 'accept') return 'pass';
  if (result === 'fail' || result === 'failed' || result === 'reject' || result === 'rejected') return 'fail';
  if (result === 'warn' || result === 'warning' || result === 'manuallyreview' || result === 'undeterminable')
    return 'warn';
  return 'unknown';
}

function extractFraudFlags(payload: Record<string, unknown>): MicroblinkFraudFlag[] {
  const flags: MicroblinkFraudFlag[] = [];
  const checks = Array.isArray(payload.checks) ? payload.checks : [];

  for (const check of checks) {
    if (!check || typeof check !== 'object') continue;
    const c = check as Record<string, unknown>;
    const name = pickString(c.name, c.type, c.checkType) || 'Unknown check';
    const resultRaw = String(c.result || c.status || 'unknown');
    const severity = classifyCheckResult(resultRaw.toLowerCase());
    flags.push({
      name,
      result: resultRaw,
      message: pickString(c.message, c.description),
      severity,
    });
  }

  const indicators = Array.isArray(payload.processIndicators) ? payload.processIndicators : [];
  for (const ind of indicators) {
    if (!ind || typeof ind !== 'object') continue;
    const i = ind as Record<string, unknown>;
    const name = pickString(i.name, i.type, i.indicator) || 'Process indicator';
    const resultRaw = String(i.result || i.status || i.level || 'info');
    const sevLower = resultRaw.toLowerCase();
    const severity =
      sevLower.includes('fail') || sevLower.includes('poor') || sevLower.includes('error')
        ? 'fail'
        : sevLower.includes('warn')
          ? 'warn'
          : 'unknown';
    if (severity === 'fail' || severity === 'warn') {
      flags.push({
        name,
        result: resultRaw,
        message: pickString(i.message, i.description),
        severity,
      });
    }
  }

  return flags;
}

function summarizeChecks(payload: Record<string, unknown>): {
  checksPassed: number;
  checksFailed: number;
  failureMessages: string[];
} {
  const flags = extractFraudFlags(payload);
  let checksPassed = 0;
  let checksFailed = 0;
  const failureMessages: string[] = [];

  for (const flag of flags) {
    if (flag.severity === 'pass') checksPassed += 1;
    else if (flag.severity === 'fail') {
      checksFailed += 1;
      failureMessages.push(flag.message || flag.name);
    }
  }

  return { checksPassed, checksFailed, failureMessages };
}

function deriveConfidenceScore(
  verification: Record<string, unknown>,
  checksPassed: number,
  checksFailed: number,
): number | undefined {
  const certainty = String(verification.certaintyLevel || '').toLowerCase();
  if (certainty === 'high') return 95;
  if (certainty === 'medium' || certainty === 'moderate') return 75;
  if (certainty === 'low') return 50;

  const total = checksPassed + checksFailed;
  if (total > 0) return Math.round((checksPassed / total) * 100);

  const result = String(verification.result || '').toLowerCase();
  if (result === 'pass') return 85;
  if (result === 'fail') return 25;
  return undefined;
}

export function mapMicroblinkResponse(data: Record<string, unknown>): MicroblinkVerifyResult {
  const verification = (data.verification || {}) as Record<string, unknown>;
  const extracted = parseExtraction(data.extraction);
  const faceScores = parseFaceScores(data);
  const fraudFlags = extractFraudFlags(data);
  const { checksPassed, checksFailed, failureMessages } = summarizeChecks(data);
  const performedChecks =
    typeof verification.performedChecks === 'number'
      ? verification.performedChecks
      : fraudFlags.length || undefined;

  return {
    processingStatus: String(data.processingStatus || 'Unknown'),
    recommendedOutcome: String(verification.recommendedOutcome || 'Undeterminable'),
    verificationResult: String(verification.result || 'Unknown'),
    certaintyLevel: verification.certaintyLevel ? String(verification.certaintyLevel) : undefined,
    ...extracted,
    ...faceScores,
    checksPassed,
    checksFailed,
    failureMessages,
    fraudFlags,
    confidenceScore: deriveConfidenceScore(verification, checksPassed, checksFailed),
    performedChecks,
    raw: data,
  };
}

/** Fields persisted on seller identity KYC from a Microblink response. */
export function buildMicroblinkKycMeta(result: MicroblinkVerifyResult) {
  return {
    processingStatus: result.processingStatus,
    recommendedOutcome: result.recommendedOutcome,
    verificationResult: result.verificationResult,
    certaintyLevel: result.certaintyLevel,
    confidenceScore: result.confidenceScore,
    performedChecks: result.performedChecks,
    fraudFlags: result.fraudFlags.filter((f) => f.severity !== 'pass').slice(0, 50),
    checkSummary: {
      passed: result.checksPassed,
      failed: result.checksFailed,
      messages: result.failureMessages,
    },
  };
}

export function isAcceptableDocumentOutcome(result: MicroblinkVerifyResult): boolean {
  const outcome = result.recommendedOutcome.toLowerCase();
  if (outcome === 'accept') return true;
  if (outcome === 'manuallyreview' && result.verificationResult.toLowerCase() === 'pass') return true;
  return result.verificationResult.toLowerCase() === 'pass' && result.checksFailed === 0;
}

export function isAcceptableFaceOutcome(result: MicroblinkVerifyResult): boolean {
  const outcome = result.recommendedOutcome.toLowerCase();
  if (outcome === 'accept') return true;
  const match = result.faceMatchScore ?? 0;
  const live = result.livenessScore ?? 0;
  if (match >= 70 && live >= 70) return true;
  return result.verificationResult.toLowerCase() === 'pass';
}

type ImageInput = { buffer: Buffer; filename: string; mimetype: string };

function parseMicroblinkErrorBody(data: unknown, status: number): string {
  if (!data || typeof data !== 'object') {
    return `Microblink API error (${status})`;
  }
  const obj = data as Record<string, unknown>;
  const direct =
    pickString(obj.message, obj.error, obj.detail, obj.title) ||
    (typeof obj.error === 'object' && obj.error
      ? pickString((obj.error as Record<string, unknown>).message)
      : undefined);
  if (direct) return direct;

  const errors = obj.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const parts = errors
      .map((e) => {
        if (typeof e === 'string') return e;
        if (e && typeof e === 'object') {
          return pickString((e as Record<string, unknown>).message, (e as Record<string, unknown>).detail);
        }
        return undefined;
      })
      .filter(Boolean);
    if (parts.length) return parts.join('; ');
  }

  return `Microblink API error (${status})`;
}

async function postMicroblinkDocver(form: FormData, auth: string): Promise<Record<string, unknown>> {
  const url = `${getBaseUrl()}/api/v2/docver`;
  try {
    const { data, status } = await axios.post<unknown>(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: auth,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: MICROBLINK_TIMEOUT_MS,
      validateStatus: () => true,
    });

    if (status < 200 || status >= 300) {
      throw new MicroblinkApiError(parseMicroblinkErrorBody(data, status), status, data);
    }

    if (!data || typeof data !== 'object') {
      throw new MicroblinkApiError('Microblink returned an empty or invalid response', 502);
    }

    return data as Record<string, unknown>;
  } catch (error) {
    if (error instanceof MicroblinkApiError) throw error;
    if (isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new MicroblinkApiError('Identity verification timed out. Please try again.', 504);
      }
      const status = error.response?.status ?? 502;
      const body = error.response?.data;
      throw new MicroblinkApiError(
        body ? parseMicroblinkErrorBody(body, status) : error.message || 'Microblink request failed',
        status,
        body,
      );
    }
    throw error;
  }
}

export async function verifyDocumentImages(images: {
  imageFront: ImageInput;
  imageBack?: ImageInput;
  imageSelfie?: ImageInput;
}): Promise<MicroblinkVerifyResult> {
  const auth = getAuthHeader();
  if (!auth) {
    throw new Error('Microblink is not configured. Set MICROBLINK_LICENSE_KEY and MICROBLINK_SECRET.');
  }

  const form = new FormData();
  form.append('imageFront', images.imageFront.buffer, {
    filename: images.imageFront.filename,
    contentType: images.imageFront.mimetype,
  });
  if (images.imageBack) {
    form.append('imageBack', images.imageBack.buffer, {
      filename: images.imageBack.filename,
      contentType: images.imageBack.mimetype,
    });
  }
  if (images.imageSelfie) {
    form.append('imageSelfie', images.imageSelfie.buffer, {
      filename: images.imageSelfie.filename,
      contentType: images.imageSelfie.mimetype,
    });
  }

  const data = await postMicroblinkDocver(form, auth);
  return mapMicroblinkResponse(data);
}

export async function fetchImageBuffer(imageUrl: string): Promise<ImageInput> {
  const { data, headers } = await axios.get<ArrayBuffer>(imageUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(data);
  const contentType = String(headers['content-type'] || 'image/jpeg');
  const ext = contentType.includes('png') ? 'png' : 'jpg';
  return { buffer, filename: `document.${ext}`, mimetype: contentType };
}
