import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  MessageSquare,
  FileText,
  TrendingUp,
  User,
  X,
  Download,
} from 'lucide-react';

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

const mockDisputes: Dispute[] = [
  {
    id: '1',
    disputeNumber: 'DSP-001234',
    orderId: 'ORD-12345',
    customerName: 'John Doe',
    sellerName: 'Tech Store',
    category: 'Item Not Received',
    status: 'open',
    createdAt: '2024-03-15T10:30:00',
    evidenceCount: 3,
    messageCount: 8,
  },
  {
    id: '2',
    disputeNumber: 'DSP-001235',
    orderId: 'ORD-12346',
    customerName: 'Jane Smith',
    sellerName: 'Fashion Hub',
    category: 'Wrong Item',
    status: 'under_review',
    createdAt: '2024-03-14T15:20:00',
    evidenceCount: 5,
    messageCount: 12,
  },
  {
    id: '3',
    disputeNumber: 'DSP-001236',
    orderId: 'ORD-12347',
    customerName: 'Bob Johnson',
    sellerName: 'Electronics Plus',
    category: 'Product Not as Described',
    status: 'decision_made',
    createdAt: '2024-03-13T09:00:00',
    evidenceCount: 4,
    messageCount: 15,
  },
];

export default function DisputeResolutionCenter() {
  const [disputes, setDisputes] = useState<Dispute[]>(mockDisputes);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

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
    setShowDisputeModal(true);
  };

  return (
    <div className="space-y-6">
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
              {filteredDisputes.map((dispute) => (
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
              ))}
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

              {/* Evidence Uploads */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Evidence ({selectedDispute.evidenceCount} files)
                </h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-800/50"
                    >
                      <div className="mb-2 aspect-video rounded-lg bg-gray-100 dark:bg-gray-700" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          evidence-{i}.jpg
                        </span>
                        <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-3 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Upload className="mr-2 inline h-4 w-4" />
                  Request More Evidence
                </button>
              </div>

              {/* Chat Timeline */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Conversation Timeline ({selectedDispute.messageCount} messages)
                </h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800/50"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {i % 2 === 0 ? selectedDispute.customerName : selectedDispute.sellerName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(Date.now() - i * 3600000).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Message content about the dispute...
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Actions */}
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <CheckCircle className="mr-2 inline h-4 w-4" />
                  Approve Buyer Claim
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <CheckCircle className="mr-2 inline h-4 w-4" />
                  Approve Seller Claim
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <XCircle className="mr-2 inline h-4 w-4" />
                  Partial Refund
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <TrendingUp className="mr-2 inline h-4 w-4" />
                  Escalate
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <XCircle className="mr-2 inline h-4 w-4" />
                  Close Dispute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

