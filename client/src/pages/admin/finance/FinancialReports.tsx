import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { adminFinanceAPI } from '@/lib/api';

export default function FinancialReports() {
  const [reports, setReports] = useState<{ id: string; name: string; type: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFinanceAPI.getReports().then((res) => {
      setReports((res.reports || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        date: r.date ? new Date(r.date).toISOString().slice(0, 10) : '',
      })));
    }).catch(() => setReports([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Financial Reports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Auto-generated and custom reports</p>
      </div>
      {loading && <div className="text-center text-gray-500 py-4">Loading...</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        {reports.map((report) => (
          <div
            key={report.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">{report.name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(report.date).toLocaleDateString()}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  const now = new Date();
                  adminFinanceAPI.generateReport({
                    reportType: report.type,
                    month: now.getMonth() + 1,
                    year: now.getFullYear(),
                    format: 'pdf',
                  }).catch(() => {});
                }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

