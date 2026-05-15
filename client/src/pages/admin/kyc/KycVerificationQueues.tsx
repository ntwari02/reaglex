import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, Shield, Package, Store, CheckCircle2, Clock } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import { Button } from '@/components/ui/button';

interface QueueSummary {
  sellersPendingVerification: number;
  sellersMicroblinkCompleteAwaitingAdmin: number;
  productsPendingPublication: number;
}

interface PendingSeller {
  sellerId: string;
  fullName?: string;
  email: string;
  identityKycStep: string;
  identityComplete: boolean;
  documentVerified: boolean;
  faceVerified: boolean;
  productsPendingPublication: number;
  sellerVerificationStatus?: string;
}

interface PendingProduct {
  productId: string;
  name: string;
  sku?: string;
  sellerId: string;
  sellerName: string;
  publicationStatus: string;
  inventoryStatus: string;
}

interface QueuePayload {
  summary: QueueSummary;
  pendingSellers: PendingSeller[];
  pendingProducts: PendingProduct[];
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export default function KycVerificationQueues() {
  const [data, setData] = useState<QueuePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/kyc-queues`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed to load queues');
      setData(json as QueuePayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load queues');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KYC and publication queues</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sellers pending verification and products held until identity checks complete.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--divider)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Store className="h-4 w-4" />
            Sellers pending
          </div>
          <p className="mt-2 text-3xl font-bold">{summary?.sellersPendingVerification ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-[var(--divider)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Shield className="h-4 w-4" />
            ID complete, admin pending
          </div>
          <p className="mt-2 text-3xl font-bold">{summary?.sellersMicroblinkCompleteAwaitingAdmin ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-[var(--divider)] bg-[var(--bg-surface)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Package className="h-4 w-4" />
            Products pending publication
          </div>
          <p className="mt-2 text-3xl font-bold">{summary?.productsPendingPublication ?? '—'}</p>
        </div>
      </div>

      <section className="rounded-xl border border-[var(--divider)] overflow-hidden">
        <div className="border-b border-[var(--divider)] px-4 py-3 font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending seller verification
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--divider)] text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Seller</th>
                <th className="px-4 py-2 font-medium">KYC step</th>
                <th className="px-4 py-2 font-medium">Document</th>
                <th className="px-4 py-2 font-medium">Face</th>
                <th className="px-4 py-2 font-medium">Hidden products</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(data?.pendingSellers || []).slice(0, 50).map((s) => (
                <tr key={s.sellerId} className="border-b border-[var(--divider)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.fullName || s.email}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{s.identityKycStep.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    {s.documentVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.faceVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">{s.productsPendingPublication}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/sellers?seller=${s.sellerId}`}
                      className="text-[var(--brand-primary)] hover:underline text-xs font-medium"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !data?.pendingSellers?.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No sellers pending verification.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--divider)] overflow-hidden">
        <div className="border-b border-[var(--divider)] px-4 py-3 font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" />
          Pending product publication
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--divider)] text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Seller</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(data?.pendingProducts || []).map((p) => (
                <tr key={p.productId} className="border-b border-[var(--divider)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.sku || p.productId}</div>
                  </td>
                  <td className="px-4 py-3">{p.sellerName}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      PENDING VERIFICATION
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/sellers?seller=${p.sellerId}`}
                      className="text-[var(--brand-primary)] hover:underline text-xs font-medium"
                    >
                      Seller KYC
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && !data?.pendingProducts?.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No products waiting for publication.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
