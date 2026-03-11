import { useState, useEffect, useCallback } from 'react';
import { Shield, Monitor, MapPin, Check, X, Loader2 } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useToastStore } from '../stores/toastStore';

interface PendingRequest {
  requestId: string;
  deviceId: string;
  userAgent: string;
  ipAddress: string;
  createdAt: string;
}

function formatDevice(ua: string): string {
  if (!ua) return 'Unknown device';
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const browser = m ? m[1] : 'Browser';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) return `${browser} on Mobile`;
  if (ua.includes('Windows')) return `${browser} on Windows`;
  if (ua.includes('Mac')) return `${browser} on Mac`;
  if (ua.includes('Linux')) return `${browser} on Linux`;
  return browser;
}

function formatDate(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    return d.toLocaleString();
  } catch {
    return createdAt;
  }
}

export function DeviceApprovalPopup() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const { showToast } = useToastStore();

  const fetchPending = useCallback(async () => {
    try {
      const data = await authAPI.getPendingLoginRequests();
      setRequests(data.requests || []);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 12000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const handleApprove = async (requestId: string) => {
    setActioning(requestId);
    try {
      await authAPI.approvePendingRequest(requestId);
      showToast('Login approved. The other device can now sign in.', 'success');
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } catch (e: any) {
      showToast(e?.message || 'Failed to approve', 'error');
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActioning(requestId);
    try {
      await authAPI.rejectPendingRequest(requestId);
      showToast('Login request denied.', 'success');
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } catch (e: any) {
      showToast(e?.message || 'Failed to reject', 'error');
    } finally {
      setActioning(null);
    }
  };

  if (requests.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-approval-title"
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)] border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ animationFillMode: 'backwards' }}
      >
        <div className="px-6 py-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-850 border-b border-gray-200/80 dark:border-gray-700/80">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-600 shadow-sm flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="device-approval-title" className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
                New sign-in request
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Someone is trying to sign in to your account from another device. Approve only if it’s you.
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4 max-h-[min(60vh,360px)] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.requestId}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/60 p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-center gap-2.5 text-gray-900 dark:text-white font-medium">
                  <Monitor className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="truncate">{formatDevice(r.userAgent)}</span>
                </div>
                {r.ipAddress && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                    <span className="font-mono text-xs">{r.ipAddress}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(r.createdAt)}</p>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApprove(r.requestId)}
                    disabled={actioning === r.requestId}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {actioning === r.requestId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(r.requestId)}
                    disabled={actioning === r.requestId}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    {actioning === r.requestId ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Deny
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
