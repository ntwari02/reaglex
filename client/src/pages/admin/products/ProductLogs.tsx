import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { adminProductsAPI } from '@/lib/api';

interface ProductLogsProps {
  productId: string;
  onBack: () => void;
}

export default function ProductLogs({ productId, onBack }: ProductLogsProps) {
  const [logs, setLogs] = useState<{ id: string; action: string; at: string; by: string; details: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminProductsAPI
      .getProductLogs(productId)
      .then((res) => setLogs(res.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Product Logs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Activity history from database</p>
        </div>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">No logs for this product yet.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {logs.map((log) => (
              <li key={log.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{log.action}</span>
                  <span className="text-sm text-gray-500">{log.at ? new Date(log.at).toLocaleString() : ''}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{log.details}</p>
                {log.by && <p className="text-xs text-gray-500 mt-1">By: {log.by}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

