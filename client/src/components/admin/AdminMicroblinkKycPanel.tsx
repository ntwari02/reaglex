import React from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  User,
  ScanFace,
  FileText,
  ExternalLink,
  Flag,
} from 'lucide-react';
import { resolveAssetUrl } from '@/lib/config';

export interface MicroblinkFraudFlag {
  name: string;
  result: string;
  message?: string;
  severity: 'fail' | 'warn' | 'pass' | 'unknown';
}

export interface MicroblinkKycMeta {
  processingStatus?: string;
  recommendedOutcome?: string;
  verificationResult?: string;
  certaintyLevel?: string;
  confidenceScore?: number;
  performedChecks?: number;
  fraudFlags?: MicroblinkFraudFlag[];
  checkSummary?: { passed: number; failed: number; messages: string[] };
}

export interface AdminIdentityKyc {
  step?: string;
  document?: MicroblinkKycMeta & {
    type?: string;
    fullName?: string;
    idNumber?: string;
    dateOfBirth?: string;
    expiryDate?: string;
    country?: string;
    nationality?: string;
    verified?: boolean;
    verifiedAt?: string;
    frontImageUrl?: string;
    backImageUrl?: string;
    rejectionReason?: string;
  };
  face?: MicroblinkKycMeta & {
    verified?: boolean;
    verifiedAt?: string;
    matchScore?: number;
    livenessScore?: number;
    selfieImageUrl?: string;
    rejectionReason?: string;
  };
  trustBonuses?: {
    documentVerified: boolean;
    faceVerified: boolean;
    phoneVerified: boolean;
    businessVerified: boolean;
  };
  lastAttemptAt?: string;
}

export interface MicroblinkRegionInfo {
  region: string;
  envValue: string;
  baseUrl: string;
  configured: boolean;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        ok
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
      }`}
    >
      {ok ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function ConfidenceBar({ score }: { score?: number }) {
  if (score == null) return <span className="text-sm text-gray-500">—</span>;
  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className={`${barColor} h-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white w-10 text-right">{score}%</span>
    </div>
  );
}

function VerificationMeta({ meta, title }: { meta?: MicroblinkKycMeta; title: string }) {
  if (!meta) return null;
  const failed = (meta.fraudFlags || []).filter((f) => f.severity === 'fail' || f.severity === 'warn');
  return (
    <div className="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">Processing</p>
          <p className="font-medium text-gray-900 dark:text-white">{meta.processingStatus || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Outcome</p>
          <p className="font-medium text-gray-900 dark:text-white">{meta.recommendedOutcome || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Result</p>
          <p className="font-medium text-gray-900 dark:text-white">{meta.verificationResult || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Certainty</p>
          <p className="font-medium text-gray-900 dark:text-white">{meta.certaintyLevel || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Confidence</p>
          <ConfidenceBar score={meta.confidenceScore} />
        </div>
      </div>
      {failed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-1">
            <Flag className="h-3 w-3" /> Fraud / quality flags ({failed.length})
          </p>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {failed.map((f, i) => (
              <li key={i} className="text-xs rounded border border-red-200 bg-red-50 px-2 py-1 dark:border-red-900 dark:bg-red-950/40">
                <span className="font-medium">{f.name}</span>
                {f.message ? <span className="text-red-600 dark:text-red-300"> — {f.message}</span> : null}
                <span className="text-gray-500"> ({f.result})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AdminMicroblinkKycPanel({
  identityKyc,
  microblink,
  liveUpdatedAt,
}: {
  identityKyc: AdminIdentityKyc | null | undefined;
  microblink?: MicroblinkRegionInfo | null;
  /** Set when data arrived via WebSocket (live admin refresh). */
  liveUpdatedAt?: string | null;
}) {
  const doc = identityKyc?.document;
  const face = identityKyc?.face;
  const hasData = Boolean(doc || face || (identityKyc?.step && identityKyc.step !== 'not_started'));

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/40">
        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0" />
          No Microblink identity verification submitted yet.
        </p>
      </div>
    );
  }

  const alertFlags = [
    ...(doc?.fraudFlags || []),
    ...(face?.fraudFlags || []),
  ].filter((f) => f.severity === 'fail' || f.severity === 'warn');

  const regionLabel = microblink
    ? `${microblink.region.toUpperCase()} (${microblink.envValue})`
    : '—';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            Microblink identity verification
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Step: <span className="font-medium">{identityKyc?.step || 'unknown'}</span>
            {identityKyc?.lastAttemptAt ? ` · Last attempt ${formatDate(identityKyc.lastAttemptAt)}` : ''}
            {liveUpdatedAt ? (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">· Live update {formatDate(liveUpdatedAt)}</span>
            ) : null}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500 dark:text-gray-400">
          <p>API region: <span className="font-medium text-gray-800 dark:text-gray-200">{regionLabel}</span></p>
          <p className={microblink?.configured ? 'text-emerald-600' : 'text-amber-600'}>
            {microblink?.configured ? 'Microblink configured' : 'Microblink not configured'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-red-400" />
              Document scan
            </h5>
            <StatusPill ok={Boolean(doc?.verified)} label={doc?.verified ? 'Verified' : 'Not verified'} />
          </div>
          {doc ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2 text-sm mb-3">
                <div><p className="text-xs text-gray-500">Full name</p><p className="font-medium">{doc.fullName || '—'}</p></div>
                <div><p className="text-xs text-gray-500">ID number</p><p className="font-medium font-mono text-xs">{doc.idNumber || '—'}</p></div>
                <div><p className="text-xs text-gray-500">DOB</p><p className="font-medium">{doc.dateOfBirth ? formatDate(String(doc.dateOfBirth)) : '—'}</p></div>
                <div><p className="text-xs text-gray-500">Expiry</p><p className="font-medium">{doc.expiryDate ? formatDate(String(doc.expiryDate)) : '—'}</p></div>
                <div><p className="text-xs text-gray-500">Country</p><p className="font-medium">{doc.country || '—'}</p></div>
                <div><p className="text-xs text-gray-500">Document type</p><p className="font-medium">{doc.type || '—'}</p></div>
              </div>
              {doc.rejectionReason && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">{doc.rejectionReason}</p>
              )}
              <VerificationMeta meta={doc} title="Document verification details" />
              <div className="mt-3 flex flex-wrap gap-2">
                {doc.frontImageUrl && (
                  <a href={resolveAssetUrl(doc.frontImageUrl) || doc.frontImageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Front image
                  </a>
                )}
                {doc.backImageUrl && (
                  <a href={resolveAssetUrl(doc.backImageUrl) || doc.backImageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> Back image
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No document scan on file.</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ScanFace className="h-4 w-4 text-red-400" />
              Face match
            </h5>
            <StatusPill ok={Boolean(face?.verified)} label={face?.verified ? 'Matched' : 'Not matched'} />
          </div>
          {face ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><p className="text-xs text-gray-500">Match score</p><ConfidenceBar score={face.matchScore} /></div>
                <div><p className="text-xs text-gray-500">Liveness</p><ConfidenceBar score={face.livenessScore} /></div>
              </div>
              {face.rejectionReason && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">{face.rejectionReason}</p>
              )}
              <VerificationMeta meta={face} title="Face verification details" />
              {face.selfieImageUrl && (
                <a href={resolveAssetUrl(face.selfieImageUrl) || face.selfieImageUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                  <ExternalLink className="h-3 w-3" /> View selfie
                </a>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No selfie / face match on file.</p>
          )}
        </div>
      </div>

      {alertFlags.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Combined fraud / quality alerts ({alertFlags.length})
          </p>
          <ul className="text-xs text-amber-900 dark:text-amber-100 space-y-1 max-h-24 overflow-y-auto">
            {alertFlags.map((f, i) => (
              <li key={i}>• {f.name}{f.message ? `: ${f.message}` : ''} ({f.severity})</li>
            ))}
          </ul>
        </div>
      )}

      {identityKyc?.trustBonuses && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">Doc +25: {identityKyc.trustBonuses.documentVerified ? 'yes' : 'no'}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">Face +25: {identityKyc.trustBonuses.faceVerified ? 'yes' : 'no'}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">Phone +15: {identityKyc.trustBonuses.phoneVerified ? 'yes' : 'no'}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">Business +35: {identityKyc.trustBonuses.businessVerified ? 'yes' : 'no'}</span>
        </div>
      )}
    </div>
  );
}
