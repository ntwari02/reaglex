import React from 'react';
import { FileText, Download, Calendar } from 'lucide-react';

export default function FinancialReports() {
  const reports = [
    { id: 'RPT-001', name: 'Daily Revenue Report', type: 'daily', date: '2024-03-17' },
    { id: 'RPT-002', name: 'Weekly Revenue Report', type: 'weekly', date: '2024-03-10' },
    { id: 'RPT-003', name: 'Monthly Revenue Report', type: 'monthly', date: '2024-02-01' },
    { id: 'RPT-004', name: 'Yearly Revenue Report', type: 'yearly', date: '2023-01-01' },
    { id: 'RPT-005', name: 'Top Earning Sellers', type: 'sellers', date: '2024-03-17' },
    { id: 'RPT-006', name: 'Loss Report (Refunds & Chargebacks)', type: 'losses', date: '2024-03-17' },
    { id: 'RPT-007', name: 'Profit Summary', type: 'profit', date: '2024-03-17' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Financial Reports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Auto-generated and custom reports</p>
      </div>
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
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

