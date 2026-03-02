import { useState } from 'react';
import { Download, Upload, FileText, CheckCircle } from 'lucide-react';

export default function ImportExport() {
  const [exportFormat, setExportFormat] = useState('csv');
  const [importFile, setImportFile] = useState<File | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Import / Export</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Bulk manage collections with CSV files
        </p>
      </div>

      {/* Export */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Export Collections</h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Export all collections to CSV format for backup or migration
        </p>
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Export Format
          </label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="excel">Excel</option>
          </select>
        </div>
        <button className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl">
          <Download className="mr-2 inline h-4 w-4" />
          Export Collections
        </button>
      </div>

      {/* Import */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Upload className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Import Collections</h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Import multiple collections from CSV file
        </p>
        <div className="mb-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {importFile ? importFile.name : 'Drop CSV file here or click to browse'}
          </p>
          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className="mt-4 inline-block cursor-pointer rounded-xl border border-gray-200 bg-white px-6 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <Upload className="mr-2 inline h-4 w-4" />
            Choose File
          </label>
        </div>
        {importFile && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              File selected: {importFile.name}
            </span>
          </div>
        )}
        <button className="w-full rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
          <Upload className="mr-2 inline h-4 w-4" />
          Import Collections
        </button>
      </div>
    </div>
  );
}

