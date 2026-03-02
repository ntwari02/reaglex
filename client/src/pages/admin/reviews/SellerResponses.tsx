import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  AlertTriangle,
  User,
} from 'lucide-react';

interface SellerResponse {
  id: string;
  sellerName: string;
  reviewId: string;
  customerName: string;
  response: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  flagged: boolean;
}

const mockResponses: SellerResponse[] = [
  {
    id: '1',
    sellerName: 'Tech Store',
    reviewId: 'rev-123',
    customerName: 'John Doe',
    response: 'Thank you for your feedback! We appreciate your review.',
    status: 'approved',
    createdAt: '2024-03-16T10:30:00',
    flagged: false,
  },
  {
    id: '2',
    sellerName: 'Fashion Hub',
    reviewId: 'rev-456',
    customerName: 'Jane Smith',
    response: 'This is inappropriate and unprofessional content...',
    status: 'pending',
    createdAt: '2024-03-17T14:20:00',
    flagged: true,
  },
];

export default function SellerResponses() {
  const [responses, setResponses] = useState<SellerResponse[]>(mockResponses);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredResponses = responses.filter((response) => {
    const matchesSearch =
      response.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: SellerResponse['status']) => {
    const styles = {
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seller Responses</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Moderate seller replies to customer reviews
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by seller or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Responses List */}
      <div className="space-y-4">
        {filteredResponses.map((response) => (
          <div
            key={response.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {response.sellerName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Response to {response.customerName}'s review
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                  {getStatusBadge(response.status)}
                  {response.flagged && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">
                      Flagged
                    </span>
                  )}
                </div>

                <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{response.response}</p>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(response.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <CheckCircle className="mr-1 inline h-4 w-4" />
                  Approve
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                  <XCircle className="mr-1 inline h-4 w-4" />
                  Reject
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Edit className="mr-1 inline h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

