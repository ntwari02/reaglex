import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Upload,
  Camera,
  User,
  FileCheck,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToastStore } from '@/stores/toastStore';
import { API_BASE_URL } from '@/lib/config';

interface IdentityKycState {
  step: string;
  document?: {
    verified: boolean;
    fullName?: string;
    country?: string;
    rejectionReason?: string;
  };
  face?: {
    verified: boolean;
    matchScore?: number;
    livenessScore?: number;
    rejectionReason?: string;
  };
  trustBonuses?: {
    documentVerified: boolean;
    faceVerified: boolean;
    phoneVerified: boolean;
    businessVerified: boolean;
  };
}

interface StatusResponse {
  configured: boolean;
  identityKyc: IdentityKycState;
  trustBonusPoints: number;
  profilePreview?: {
    fullName?: string;
    country?: string;
    dateOfBirth?: string;
    idNumber?: string;
  };
}

const TRUST_ITEMS = [
  { key: 'documentVerified' as const, label: 'ID document verified', points: 25 },
  { key: 'faceVerified' as const, label: 'Face match verified', points: 25 },
  { key: 'phoneVerified' as const, label: 'Phone on profile', points: 15 },
  { key: 'businessVerified' as const, label: 'Business documents', points: 35 },
];

function StepBadge({ done, active, label, n }: { done: boolean; active: boolean; label: string; n: number }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[72px]">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
          done
            ? 'bg-green-500 border-green-500 text-white'
            : active
              ? 'bg-red-500 border-red-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500'
        }`}
      >
        {done ? <CheckCircle className="w-5 h-5" /> : n}
      </div>
      <span className={`text-[10px] sm:text-xs text-center ${active ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

const SellerIdentityVerification: React.FC = () => {
  const { showToast } = useToastStore();
  const apiBase = `${API_BASE_URL}/seller/settings/identity-verification`;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const authHeaders = (): HeadersInit => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const parseApiResponse = async (res: Response): Promise<Record<string, unknown>> => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (res.status === 502) {
        return {
          message:
            'The verification service did not respond in time. Try a smaller photo or retry in a moment.',
          hint:
            'If this persists, confirm MICROBLINK_LICENSE_KEY, MICROBLINK_SECRET (or MICROBLINK_SECRET_B64), and MICROBLINK_REGION on Render.',
        };
      }
      return { message: text.slice(0, 200) || `Request failed (${res.status})` };
    }
  };

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiBase, { headers: authHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load verification status');
      setStatus(await res.json());
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Could not load KYC status', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => {
    loadStatus();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [loadStatus]);

  useEffect(() => {
    const handler = () => {
      void loadStatus();
    };
    window.addEventListener('sellerKycUpdated', handler);
    return () => window.removeEventListener('sellerKycUpdated', handler);
  }, [loadStatus]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      showToast('Camera access denied. Upload a selfie instead.', 'error');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setSelfieFile(new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
      setSelfiePreview(URL.createObjectURL(blob));
      stopCamera();
    }, 'image/jpeg', 0.92);
  };

  const scanDocument = async () => {
    if (!frontFile) {
      showToast('Upload the front of your ID', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('imageFront', frontFile);
      if (backFile) form.append('imageBack', backFile);
      const res = await fetch(`${apiBase}/scan-document`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
        credentials: 'include',
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        const detail = [data.message, data.hint].filter(Boolean).join(' ');
        throw new Error(detail || 'Document scan failed');
      }
      showToast(String(data.message ?? 'Document scanned'), data.accepted ? 'success' : 'error');
      setFrontFile(null);
      setBackFile(null);
      await loadStatus();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Document scan failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const matchFace = async () => {
    if (!selfieFile) {
      showToast('Take or upload a selfie first', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('imageSelfie', selfieFile);
      const res = await fetch(`${apiBase}/match-face`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
        credentials: 'include',
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        const detail = [data.message, data.hint].filter(Boolean).join(' ');
        throw new Error(detail || 'Face verification failed');
      }
      showToast(String(data.message ?? 'Face verified'), data.accepted ? 'success' : 'error');
      setSelfieFile(null);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      setSelfiePreview(null);
      await loadStatus();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Face verification failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const applyProfile = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/apply-profile`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not update profile');
      showToast(data.message, 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Profile update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10 mb-6">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/40 mb-6">
        <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Add <code className="text-xs px-1 rounded bg-amber-100 dark:bg-amber-900/40">MICROBLINK_LICENSE_KEY</code>{' '}
            and <code className="text-xs px-1 rounded bg-amber-100 dark:bg-amber-900/40">MICROBLINK_SECRET</code> to the
            server, then restart the API.
          </span>
        </p>
      </div>
    );
  }

  const kyc = status.identityKyc;
  const docDone = Boolean(kyc.document?.verified);
  const faceDone = Boolean(kyc.face?.verified);
  const completed = kyc.step === 'completed';
  const bonuses = kyc.trustBonuses;

  return (
    <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/30 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            Seller Identity Verification
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            Powered by Microblink — scan your ID, verify authenticity, then match your face for a verified seller badge.
          </p>
        </div>
        {completed && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            KYC complete
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mb-6 overflow-x-auto pb-2">
        <StepBadge done={docDone} active={!docDone} label="Scan ID" n={1} />
        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        <StepBadge done={faceDone} active={docDone && !faceDone} label="Selfie" n={2} />
        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        <StepBadge done={completed} active={faceDone && !completed} label="Approved" n={3} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {TRUST_ITEMS.map((item) => {
          const earned = bonuses?.[item.key];
          return (
            <div
              key={item.key}
              className={`p-3 rounded-lg border text-center ${
                earned
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="text-lg font-bold text-gray-900 dark:text-white">+{item.points}</p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight">{item.label}</p>
              {earned && <CheckCircle className="w-3.5 h-3.5 text-green-500 mx-auto mt-1" />}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5" />
        Trust bonus earned: <strong>{status.trustBonusPoints}</strong> / 100 points
      </p>

      {!docDone && (
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <FileCheck className="w-4 h-4 text-red-400" />
            Step 1 — Upload ID document
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            National ID, passport, or driving license. Use a clear photo on a flat surface with good lighting.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-red-400 transition-colors">
              <Upload className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{frontFile ? frontFile.name : 'Front (required)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFrontFile(e.target.files?.[0] || null)} />
            </label>
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-red-400 transition-colors">
              <Upload className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{backFile ? backFile.name : 'Back (optional)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setBackFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          {kyc.document?.rejectionReason && (
            <p className="text-xs text-red-500 mb-2">{kyc.document.rejectionReason}</p>
          )}
          <Button onClick={scanDocument} disabled={submitting || !frontFile} className="w-full sm:w-auto">
            {submitting ? 'Scanning…' : 'Scan & verify document'}
          </Button>
        </div>
      )}

      {docDone && !faceDone && (
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-red-400" />
            Step 2 — Selfie & face match
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Take a selfie so we can confirm you are the person on your ID. Look at the camera in good lighting.
          </p>
          {cameraOn ? (
            <video
              ref={videoRef}
              className="w-full max-w-sm mx-auto rounded-lg mb-3 aspect-[4/3] bg-black object-cover"
              playsInline
              muted
            />
          ) : selfiePreview ? (
            <img src={selfiePreview} alt="Selfie preview" className="w-40 h-40 object-cover rounded-lg mx-auto mb-3 border border-gray-200 dark:border-gray-700" />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!cameraOn && !selfiePreview && (
              <>
                <Button type="button" variant="outline" onClick={startCamera}>
                  <Camera className="w-4 h-4 mr-2" />
                  Open camera
                </Button>
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Upload className="w-4 h-4" />
                  Upload selfie
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setSelfieFile(f);
                        setSelfiePreview(URL.createObjectURL(f));
                      }
                    }}
                  />
                </label>
              </>
            )}
            {cameraOn && (
              <>
                <Button type="button" onClick={captureSelfie}>
                  Capture
                </Button>
                <Button type="button" variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </>
            )}
            {selfiePreview && !cameraOn && (
              <Button onClick={matchFace} disabled={submitting}>
                {submitting ? 'Verifying…' : 'Verify face match'}
              </Button>
            )}
          </div>
          {kyc.face?.rejectionReason && (
            <p className="text-xs text-red-500 mt-2">{kyc.face.rejectionReason}</p>
          )}
        </div>
      )}

      {docDone && status.profilePreview && (
        <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 mb-4">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2 mb-2">
            <User className="w-4 h-4" />
            Extracted from your ID
          </h3>
          <ul className="text-sm text-green-900 dark:text-green-200 space-y-1">
            {status.profilePreview.fullName && <li>Name: {status.profilePreview.fullName}</li>}
            {status.profilePreview.country && <li>Country: {status.profilePreview.country}</li>}
            {status.profilePreview.dateOfBirth && <li>DOB: {status.profilePreview.dateOfBirth}</li>}
            {status.profilePreview.idNumber && <li>ID: {status.profilePreview.idNumber}</li>}
          </ul>
          <Button variant="outline" size="sm" className="mt-3" onClick={applyProfile} disabled={submitting}>
            Apply to my profile
          </Button>
        </div>
      )}

      {completed && (
        <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <p className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Identity verified. Your application is pending final admin review for the Verified Seller badge.
          </p>
          {kyc.face?.matchScore != null && (
            <p className="text-xs text-green-700 dark:text-green-400 mt-2">
              Face match: {Math.round(kyc.face.matchScore)}% · Liveness: {Math.round(kyc.face.livenessScore ?? 0)}%
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerIdentityVerification;
