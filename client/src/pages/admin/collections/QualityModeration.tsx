import { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, XCircle, Merge, Image as ImageIcon } from 'lucide-react';

interface QualityIssue {
  id: string;
  type: 'duplicate' | 'empty' | 'violation' | 'image';
  collectionName: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

const mockIssues: QualityIssue[] = [
  {
    id: '1',
    type: 'duplicate',
    collectionName: 'Summer Sale',
    severity: 'medium',
    message: 'Similar collection found: "Summer Collection"',
  },
  {
    id: '2',
    type: 'empty',
    collectionName: 'New Arrivals',
    severity: 'high',
    message: 'Collection has no products',
  },
];

export default function QualityModeration() {
  const [issues, setIssues] = useState<QualityIssue[]>(mockIssues);
  const [autoDetection, setAutoDetection] = useState(true);

  const getSeverityBadge = (severity: QualityIssue['severity']) => {
    const styles = {
      high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[severity]}`}>
        {severity}
      </span>
    );
  };

  const getTypeIcon = (type: QualityIssue['type']) => {
    switch (type) {
      case 'duplicate':
        return <Merge className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      case 'empty':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'violation':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'image':
        return <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Quality & Moderation
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Detect and resolve collection quality issues
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Auto Detection</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={autoDetection}
              onChange={(e) => setAutoDetection(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
      </div>

      {/* Quality Issues */}
      <div className="space-y-4">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {getTypeIcon(issue.type)}
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {issue.collectionName}
                    </h3>
                    {getSeverityBadge(issue.severity)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{issue.message}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIssues(issues.filter((i) => i.id !== issue.id))}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                >
                  <CheckCircle className="mr-1 inline h-4 w-4" />
                  Resolve
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

