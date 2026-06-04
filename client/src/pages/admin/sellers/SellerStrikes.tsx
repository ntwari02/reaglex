import React, { useEffect, useState } from 'react';
import { AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface SellerStrikesProps {
  sellerId: string;
}

export default function SellerStrikes({ sellerId }: SellerStrikesProps) {
  const showToast = useToastStore((s) => s.showToast);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('active');
  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sellerId) return;
      setLoading(true);
      try {
        const res = await adminAPI.getSellerDetails(sellerId);
        if (!cancelled) {
          setStatus(res.seller.status || 'active');
          setWarningCount(res.seller.warningCount ?? 0);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : 'Failed to load policy data', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId, showToast]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Strikes & Policy</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Account warnings and enforcement status</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Account status</h3>
          </div>
          <p className="text-2xl font-bold capitalize text-gray-900 dark:text-white">{status}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Warnings issued</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{warningCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Policy actions</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Use the seller list to warn, suspend, or ban this account. Each warning increments the counter above and is
          stored on the user record for audit.
        </p>
      </div>
    </div>
  );
}
