import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  User,
  X,
} from 'lucide-react';
import { adminSupportAPI } from '@/lib/api';
import { pageTransition } from './supportAnimations';

interface Dispute {
  id: string;
  disputeNumber: string;
  orderId: string;
  customerName: string;
  sellerName: string;
  category: string;
  status: 'open' | 'under_review' | 'decision_made' | 'closed';
  createdAt: string;
  evidenceCount: number;
  messageCount: number;
}

function mapBackendStatus(s: string): Dispute['status'] {
  if (['new', 'seller_response', 'buyer_response'].includes(s)) return 'open';
  if (s === 'under_review') return 'under_review';
  if (['approved', 'rejected', 'resolved'].includes(s)) return 'decision_made';
  return 'open';
}

function mapBackendTypeToCategory(t: string): string {
  const map: Record<string, string> = {
    refund: 'Refund',
    return: 'Return',
    quality: 'Product Not as Described',
    delivery: 'Item Not Received',
    other: 'Other',
  };
  return map[t] || t;
}

export default function DisputeResolutionCenter() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeDetail, setDisputeDetail] = useState<any>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const loadDisputes = useCallback(() => {
    setLoading(true);
    setError(null);
    adminSupportAPI
      .getDisputes({
        page: 1,
        limit: 100,
      })
      .then((res) => {
        const list: Dispute[] = (res.disputes || []).map((d: any) => ({
          id: d._id?.toString() ?? d.id,
          disputeNumber: d.disputeNumber,
          orderId: d.orderId?.orderNumber ?? d.orderId?.toString?.() ?? '',
          customerName: (d.buyerId as any)?.fullName ?? 'Buyer',
          sellerName: (d.sellerId as any)?.fullName ?? 'Seller',
          category: mapBackendTypeToCategory(d.type || 'other'),
          status: mapBackendStatus(d.status),
          createdAt: d.createdAt,
          evidenceCount: (d.evidence && d.evidence.length) || 0,
          messageCount: 0,
        }));
        setDisputes(list);
      })
      .catch((err) => setError(err?.message ?? 'Failed to load disputes'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.disputeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispute.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || dispute.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: Dispute['status']) => {
    const styles = {
      open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      decision_made: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    const labels = {
      open: 'Open',
      under_review: 'Under Review',
      decision_made: 'Decision Made',
      closed: 'Closed',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleViewDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDisputeDetail(null);
    setShowDisputeModal(true);
    adminSupportAPI.getDispute(dispute.id).then((res) => setDisputeDetail(res.dispute)).catch(() => setDisputeDetail(null));
  };

  const handleResolve = (decision: 'approved' | 'rejected' | 'resolved', resolution?: string) => {
    if (!selectedDispute) return;
    setResolving(true);
    adminSupportAPI
      .resolveDispute(selectedDispute.id, { decision, resolution: resolution || '' })
      .then(() => {
        loadDisputes();
        setShowDisputeModal(false);
        setSelectedDispute(null);
        setDisputeDetail(null);
      })
      .catch((err) => alert(err?.message ?? 'Failed to resolve'))
      .finally(() => setResolving(false));
  };

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      {/* Header with Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by dispute number, order ID, customer, seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="decision_made">Decision Made</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="Item Not Received">Item Not Received</option>
            <option value="Wrong Item">Wrong Item</option>
            <option value="Product Not as Described">Product Not as Described</option>
            <option value="Seller Cancelled Order">Seller Cancelled Order</option>
            <option value="Shipping Delay">Shipping Delay</option>
            <option value="Fraudulent Seller">Fraudulent Seller</option>
            <option value="Payment Dispute">Payment Dispute</option>
          </select>
        </div>
      </div>

      {/* Disputes Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Dispute #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Evidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500">Loading disputes...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-red-600">{error}</td>
                </tr>
              ) : (
                filteredDisputes.map((dispute) => (
                <tr
                  key={dispute.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {dispute.disputeNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">{dispute.orderId}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {dispute.customerName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {dispute.sellerName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {dispute.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(dispute.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {dispute.evidenceCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleViewDispute(dispute)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                    >
                      <Eye className="mr-1 inline h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispute Details Modal */}
      {showDisputeModal && selectedDispute && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDisputeModal(false)}
        >
          <div
            className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 p-6 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedDispute.disputeNumber}
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {selectedDispute.category}
                  </p>
                </div>
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {getStatusBadge(selectedDispute.status)}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Order: {selectedDispute.orderId}
                </span>
              </div>
            </div>

            <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-6 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
              {/* Order Details */}
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Order Details
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedDispute.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Seller</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedDispute.sellerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedDispute.orderId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Dispute Category</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedDispute.category}
                    </p>
                  </div>
                </div>
              </div>

              {disputeDetail && (
                <>
                  {disputeDetail.description && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Description</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{disputeDetail.description}</p>
                    </div>
                  )}
                  {disputeDetail.sellerResponse && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800/50">
                      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Seller response</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{disputeDetail.sellerResponse}</p>
                    </div>
                  )}
                  {disputeDetail.buyerResponse && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800/50">
                      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Buyer response</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{disputeDetail.buyerResponse}</p>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                      Evidence ({(disputeDetail.evidence && disputeDetail.evidence.length) || 0} files)
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {(disputeDetail.evidence || []).map((ev: any, i: number) => (
                        <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-800/50">
                          <p className="text-xs text-gray-600 dark:text-gray-400">{ev.description || ev.type || 'Evidence'}</p>
                          {ev.url && (
                            <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">View</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedDispute.status !== 'decision_made' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleResolve('approved')}
                    disabled={resolving}
                    className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 disabled:opacity-50"
                  >
                    <CheckCircle className="mr-2 inline h-4 w-4" />
                    Approve (buyer)
                  </button>
                  <button
                    onClick={() => handleResolve('rejected')}
                    disabled={resolving}
                    className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 disabled:opacity-50"
                  >
                    <XCircle className="mr-2 inline h-4 w-4" />
                    Reject claim
                  </button>
                  <button
                    onClick={() => handleResolve('resolved')}
                    disabled={resolving}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300 disabled:opacity-50"
                  >
                    Mark resolved
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

