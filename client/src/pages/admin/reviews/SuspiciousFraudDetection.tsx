import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Shield,
  UserX,
  XCircle,
  FileText,
} from 'lucide-react';
import { adminReviewsAPI } from '@/lib/api';

interface SuspiciousReview {
  id: string;
  customerName: string;
  productName: string;
  trigger: string;
  riskLevel: 'high' | 'medium' | 'low';
  evidence: string[];
  createdAt: string;
}

export default function SuspiciousFraudDetection() {
  const [suspicious, setSuspicious] = useState<SuspiciousReview[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminReviewsAPI.getSuspicious()
      .then((res) => setSuspicious(res.suspicious || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getRiskBadge = (risk: SuspiciousReview['riskLevel']) => {
    const styles = {
      high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[risk]}`}>
        {risk} risk
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Suspicious / Fraud Review Detection
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Identify and manage potentially fraudulent reviews
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search suspicious reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
      <div className="space-y-4">
        {suspicious
          .filter((s) =>
            s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.productName.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {review.productName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {review.customerName}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {getRiskBadge(review.riskLevel)}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Trigger: {review.trigger}
                    </span>
                  </div>

                  <div className="mb-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Evidence:</p>
                    {review.evidence.map((evidence, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <Shield className="h-3 w-3 text-gray-400" />
                        <span>• {evidence}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(review.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => adminReviewsAPI.removeSuspicious(review.id).then(() => load())}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300"
                  >
                    <XCircle className="mr-1 inline h-4 w-4" />
                    Remove
                  </button>
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <UserX className="mr-1 inline h-4 w-4" />
                    Block User
                  </button>
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <FileText className="mr-1 inline h-4 w-4" />
                    Require Evidence
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
      )}
    </div>
  );
}

