import React, { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Shield,
  X,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface SellerStrikesProps {
  sellerId: string;
}

type StrikeType = 'warning' | 'strike' | 'suspension' | 'ban';
type ViolationType = 'policy' | 'fraud' | 'quality' | 'shipping' | 'communication' | 'other';

interface Strike {
  id: string;
  type: StrikeType;
  violation: ViolationType;
  reason: string;
  issuedBy: string;
  issuedDate: string;
  expiresDate?: string;
  status: 'active' | 'resolved' | 'expired';
  notes?: string;
}

interface Violation {
  id: string;
  type: ViolationType;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  date: string;
  resolved: boolean;
}

const mockStrikes: Strike[] = [
  {
    id: 'STRIKE-001',
    type: 'warning',
    violation: 'quality',
    reason: 'Multiple customer complaints about product quality',
    issuedBy: 'Admin User',
    issuedDate: '2024-03-10',
    expiresDate: '2024-04-10',
    status: 'active',
    notes: 'First warning, monitor closely',
  },
  {
    id: 'STRIKE-002',
    type: 'strike',
    violation: 'shipping',
    reason: 'Delayed shipping on 5+ orders',
    issuedBy: 'Admin User',
    issuedDate: '2024-02-15',
    status: 'active',
  },
  {
    id: 'STRIKE-003',
    type: 'warning',
    violation: 'communication',
    reason: 'Poor response time to customer inquiries',
    issuedBy: 'Admin User',
    issuedDate: '2024-01-20',
    status: 'resolved',
  },
];

const mockViolations: Violation[] = [
  {
    id: 'VIOL-001',
    type: 'fraud',
    description: 'Suspicious payment activity detected',
    severity: 'high',
    date: '2024-03-15',
    resolved: false,
  },
  {
    id: 'VIOL-002',
    type: 'quality',
    description: 'Product not matching description',
    severity: 'medium',
    date: '2024-03-12',
    resolved: false,
  },
  {
    id: 'VIOL-003',
    type: 'policy',
    description: 'Violation of marketplace policies',
    severity: 'low',
    date: '2024-03-08',
    resolved: true,
  },
];

export default function SellerStrikes({ sellerId }: SellerStrikesProps) {
  const [showAddStrikeModal, setShowAddStrikeModal] = useState(false);
  const [showFraudAlerts, setShowFraudAlerts] = useState(true);
  const [productUploadBlocked, setProductUploadBlocked] = useState(false);

  const activeStrikes = mockStrikes.filter((s) => s.status === 'active');
  const unresolvedViolations = mockViolations.filter((v) => !v.resolved);
  const fraudAlerts = mockViolations.filter((v) => v.type === 'fraud' && !v.resolved);

  const getStrikeTypeBadge = (type: StrikeType) => {
    const styles = {
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      strike: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
      suspension: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      ban: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[type]}`}>{type}</span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[severity as keyof typeof styles]}`}>
        {severity}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Strikes & Policy Enforcement</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Policy violations and compliance management</p>
        </div>
        <button
          onClick={() => setShowAddStrikeModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
        >
          <Plus className="h-4 w-4" /> Add Strike/Warning
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Active Strikes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeStrikes.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 text-white">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Unresolved Violations</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{unresolvedViolations.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Fraud Alerts</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{fraudAlerts.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <Ban className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Product Upload</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {productUploadBlocked ? 'Blocked' : 'Allowed'}
          </p>
        </div>
      </div>

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 && showFraudAlerts && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-900/20">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-red-900 dark:text-red-200">Fraud Alerts</h3>
            </div>
            <button
              onClick={() => setShowFraudAlerts(false)}
              className="rounded-full border border-red-200 p-1 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {fraudAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-red-200 bg-white p-3 dark:border-red-800 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{alert.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(alert.date).toLocaleDateString()}
                    </p>
                  </div>
                  {getSeverityBadge(alert.severity)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Upload Block */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Product Upload Control</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Block seller from uploading new products
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={productUploadBlocked}
              onChange={(e) => setProductUploadBlocked(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-gray-700"></div>
          </label>
        </div>
      </div>

      {/* Strikes List */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Strikes & Warnings History</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {mockStrikes.map((strike) => (
            <div key={strike.id} className="p-6">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {getStrikeTypeBadge(strike.type)}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {strike.violation} violation
                    </span>
                  </div>
                  <p className="mb-2 font-semibold text-gray-900 dark:text-white">{strike.reason}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Issued by: {strike.issuedBy}</span>
                    <span>Date: {new Date(strike.issuedDate).toLocaleDateString()}</span>
                    {strike.expiresDate && (
                      <span>Expires: {new Date(strike.expiresDate).toLocaleDateString()}</span>
                    )}
                    <span className={`${strike.status === 'active' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {strike.status}
                    </span>
                  </div>
                  {strike.notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{strike.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Violations List */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Violation List</h3>
        </div>
        <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">Violation ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {mockViolations.map((violation) => (
                <tr
                  key={violation.id}
                  className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{violation.id}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-gray-600 dark:text-gray-300">
                      {violation.type.charAt(0).toUpperCase() + violation.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{violation.description}</td>
                  <td className="px-4 py-4">{getSeverityBadge(violation.severity)}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(violation.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    {violation.resolved ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> Resolved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Strike Modal */}
      {showAddStrikeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAddStrikeModal(false)}
              className="absolute right-4 top-4 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add Strike/Warning</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Type</label>
                <select className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  <option value="warning">Warning</option>
                  <option value="strike">Strike</option>
                  <option value="suspension">Suspension</option>
                  <option value="ban">Ban</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Violation Type
                </label>
                <select className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-10 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  <option value="policy">Policy</option>
                  <option value="fraud">Fraud</option>
                  <option value="quality">Quality</option>
                  <option value="shipping">Shipping</option>
                  <option value="communication">Communication</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Reason</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Describe the violation..."
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">Notes</label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Internal notes (optional)..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddStrikeModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40">
                  Issue Strike
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
