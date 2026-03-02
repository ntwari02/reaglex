import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Upload, 
  Send, 
  Image as ImageIcon, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  User,
  DollarSign,
  AlertCircle,
  FileCheck,
  Ban,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

const API_BASE = 'http://localhost:5000/api/seller/disputes';

interface DisputeEvidence {
  type: 'photo' | 'document' | 'message' | 'receipt' | 'video' | 'other';
  url: string;
  description?: string;
  uploadedAt: string;
}

interface DisputeMessage {
  sender: 'buyer' | 'seller' | 'platform';
  text: string;
  date: string;
  readOnly?: boolean;
}

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  items: OrderItem[];
  customer: string;
  customerEmail: string;
}

interface Buyer {
  _id: string;
  fullName?: string;
  email?: string;
  avatar_url?: string;
}

interface Dispute {
  _id: string;
  disputeNumber: string;
  orderId: Order | string;
  buyerId: Buyer | string;
  type: 'refund' | 'return' | 'quality' | 'delivery' | 'other';
  reason: string;
  description: string;
  status: 'new' | 'under_review' | 'seller_response' | 'buyer_response' | 'approved' | 'rejected' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence: DisputeEvidence[];
  sellerResponse?: string;
  sellerResponseAt?: string;
  buyerResponse?: string;
  buyerResponseAt?: string;
  adminDecision?: string;
  adminDecisionAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  responseDeadline?: string;
}

const DisputeResolution: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDisputeDetails, setShowDisputeDetails] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseType, setResponseType] = useState<'accept' | 'evidence' | 'dispute' | null>(null);
  const [responseText, setResponseText] = useState('');
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Fetch disputes from backend
  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (reasonFilter !== 'all') params.append('type', reasonFilter);
      if (dateRangeFilter.start) params.append('startDate', dateRangeFilter.start);
      if (dateRangeFilter.end) params.append('endDate', dateRangeFilter.end);
      params.append('sort', sortOrder === 'newest' ? '-1' : '1');

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (response.status === 403) {
        window.location.href = '/';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch disputes' }));
        throw new Error(errorData.message || 'Failed to fetch disputes');
      }
      
      const data = await response.json();
      setDisputes(data.disputes || []);
    } catch (error: any) {
      console.error('Error fetching disputes:', error);
      showToast(error.message || 'Failed to load disputes', 'error');
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reasonFilter, dateRangeFilter.start, dateRangeFilter.end, sortOrder, showToast]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const fetchDisputeDetails = async (disputeId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/${disputeId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch dispute details');
      const data = await response.json();
      setSelectedDispute(data.dispute);
    } catch (error) {
      console.error('Error fetching dispute details:', error);
      showToast('Failed to load dispute details', 'error');
    }
  };

  const handleViewDispute = async (dispute: Dispute) => {
    await fetchDisputeDetails(dispute._id);
    setShowDisputeDetails(true);
  };

  const handleOpenResponseModal = (type: 'accept' | 'evidence' | 'dispute') => {
    setResponseType(type);
    setResponseText('');
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedDispute || !responseText.trim()) return;

    setSubmittingResponse(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/${selectedDispute._id}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          response: responseText,
          actionType: responseType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit response');
      }

      showToast('Response submitted successfully', 'success');
      setShowResponseModal(false);
      setResponseText('');
      await fetchDisputeDetails(selectedDispute._id);
      await fetchDisputes();
    } catch (error: any) {
      console.error('Error submitting response:', error);
      showToast(error.message || 'Failed to submit response', 'error');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleEvidenceFileChange = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    
    // Validate file types and sizes
    const validFiles = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'video/mp4', 'video/mov', 'video/avi', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
      const maxSize = 50 * 1024 * 1024; // 50MB (increased for videos)
      
      if (!validTypes.includes(file.type)) {
        showToast(`File ${file.name} is not a supported type`, 'error');
        return false;
      }
      if (file.size > maxSize) {
        showToast(`File ${file.name} exceeds 10MB limit`, 'error');
        return false;
      }
      return true;
    });

    setEvidenceFiles(prev => [...prev, ...validFiles]);
  };

  const handleSubmitEvidence = async () => {
    if (!selectedDispute || (evidenceFiles.length === 0 && !evidenceNotes.trim())) return;

    setUploadingEvidence(true);
    try {
      const formData = new FormData();
      evidenceFiles.forEach(file => {
        formData.append('files', file);
      });
      if (evidenceNotes.trim()) {
        formData.append('notes', evidenceNotes);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/${selectedDispute._id}/evidence`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload evidence');
      }

      showToast('Evidence uploaded successfully', 'success');
      setShowEvidenceModal(false);
      setEvidenceFiles([]);
      setEvidenceNotes('');
      await fetchDisputeDetails(selectedDispute._id);
      await fetchDisputes();
    } catch (error: any) {
      console.error('Error uploading evidence:', error);
      showToast(error.message || 'Failed to upload evidence', 'error');
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Filter and sort disputes
  const filteredDisputes = useMemo(() => {
    let filtered = [...disputes];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(dispute => {
        const order = typeof dispute.orderId === 'object' ? dispute.orderId : null;
        const buyer = typeof dispute.buyerId === 'object' ? dispute.buyerId : null;
        return (
          dispute.disputeNumber.toLowerCase().includes(term) ||
          (order?.orderNumber || '').toLowerCase().includes(term) ||
          dispute.reason.toLowerCase().includes(term) ||
          (buyer?.email || '').toLowerCase().includes(term)
        );
      });
    }

    // Date range filter
    if (dateRangeFilter.start || dateRangeFilter.end) {
      filtered = filtered.filter(dispute => {
        const disputeDate = new Date(dispute.createdAt);
        if (dateRangeFilter.start) {
          const startDate = new Date(dateRangeFilter.start);
          if (disputeDate < startDate) return false;
        }
        if (dateRangeFilter.end) {
          const endDate = new Date(dateRangeFilter.end);
          endDate.setHours(23, 59, 59, 999);
          if (disputeDate > endDate) return false;
        }
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [disputes, searchTerm, dateRangeFilter, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const open = disputes.filter(d => d.status === 'new' || d.status === 'seller_response').length;
    const awaitingResponse = disputes.filter(d => d.status === 'new' || d.status === 'buyer_response').length;
    const underReview = disputes.filter(d => d.status === 'under_review').length;
    const resolved = disputes.filter(d => d.status === 'resolved' || d.status === 'approved' || d.status === 'rejected').length;
    
    return { open, awaitingResponse, underReview, resolved, total: disputes.length };
  }, [disputes]);

  // Get status badge info
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      'new': { label: 'Open', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle },
      'seller_response': { label: 'Awaiting Seller Response', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Clock },
      'buyer_response': { label: 'Awaiting Buyer Response', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
      'under_review': { label: 'Under Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: MessageSquare },
      'resolved': { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
      'approved': { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
      'rejected': { label: 'Rejected', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle },
    };

    return statusMap[status] || statusMap['new'];
  };

  // Mask buyer email
  const maskEmail = (email?: string) => {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    const masked = local[0] + '*'.repeat(Math.min(local.length - 2, 5)) + local[local.length - 1];
    return `${masked}@${domain}`;
  };

  // Get dispute amount (from order total)
  const getDisputeAmount = (dispute: Dispute) => {
    const order = typeof dispute.orderId === 'object' ? dispute.orderId : null;
    return order?.total || 0;
  };

  // Check if action is required
  const requiresAction = (dispute: Dispute) => {
    return dispute.status === 'new' || dispute.status === 'buyer_response';
  };

  // Calculate time until deadline
  const getTimeUntilDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    
    if (diff <= 0) return { expired: true, text: 'Deadline passed' };
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return { expired: false, text: `${days}d ${hours}h remaining` };
    if (hours > 0) return { expired: false, text: `${hours}h remaining`, urgent: true };
    return { expired: false, text: 'Less than 1 hour', urgent: true };
  };

  // Build conversation timeline from dispute data
  const buildConversationTimeline = (dispute: Dispute): DisputeMessage[] => {
    const timeline: DisputeMessage[] = [];
    
    // Initial buyer complaint
    timeline.push({
      sender: 'buyer',
      text: dispute.description,
      date: new Date(dispute.createdAt).toLocaleString(),
      readOnly: true,
    });

    // Seller response
    if (dispute.sellerResponse) {
      timeline.push({
        sender: 'seller',
        text: dispute.sellerResponse,
        date: dispute.sellerResponseAt ? new Date(dispute.sellerResponseAt).toLocaleString() : '',
        readOnly: true,
      });
    }

    // Buyer response
    if (dispute.buyerResponse) {
      timeline.push({
        sender: 'buyer',
        text: dispute.buyerResponse,
        date: dispute.buyerResponseAt ? new Date(dispute.buyerResponseAt).toLocaleString() : '',
        readOnly: true,
      });
    }

    // Admin/platform messages
    if (dispute.status === 'under_review') {
      timeline.push({
        sender: 'platform',
        text: 'This dispute is under review by our support team.',
        date: dispute.updatedAt ? new Date(dispute.updatedAt).toLocaleString() : '',
        readOnly: true,
      });
    }

    if (dispute.adminDecision) {
      timeline.push({
        sender: 'platform',
        text: dispute.adminDecision,
        date: dispute.adminDecisionAt ? new Date(dispute.adminDecisionAt).toLocaleString() : '',
        readOnly: true,
      });
    }

    if (dispute.resolution) {
      timeline.push({
        sender: 'platform',
        text: dispute.resolution,
        date: dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleString() : '',
        readOnly: true,
      });
    }

    return timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Get next action for seller
  const getNextAction = (dispute: Dispute) => {
    if (dispute.status === 'new') {
      return {
        message: 'This dispute requires your response. Please review and respond.',
        deadline: dispute.responseDeadline,
      };
    }
    if (dispute.status === 'buyer_response') {
      return {
        message: 'The buyer has responded. Please review their response and take action.',
        deadline: dispute.responseDeadline,
      };
    }
    if (dispute.status === 'under_review') {
      return {
        message: 'This dispute is under review. No action required at this time.',
        deadline: null,
      };
    }
    if (dispute.status === 'resolved' || dispute.status === 'approved' || dispute.status === 'rejected') {
      return {
        message: 'This dispute has been resolved.',
        deadline: null,
      };
    }
    return {
      message: 'Awaiting platform review.',
      deadline: null,
    };
  };

  if (loading && disputes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading disputes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            Dispute Resolution
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage customer disputes and resolve issues
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/30">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Open Disputes</p>
          <p className="text-3xl font-bold text-red-500 dark:text-red-400">{stats.open}</p>
        </div>
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/30">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Awaiting Your Response</p>
          <p className="text-3xl font-bold text-orange-500 dark:text-orange-400">{stats.awaitingResponse}</p>
        </div>
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/30">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Under Review</p>
          <p className="text-3xl font-bold text-yellow-500 dark:text-yellow-400">{stats.underReview}</p>
        </div>
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/30">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Resolved</p>
          <p className="text-3xl font-bold text-green-500 dark:text-green-400">{stats.resolved}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
        <div className="flex flex-col gap-4 mb-6">
          {/* Search and basic filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
                placeholder="Search by dispute ID, order ID, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
                <option value="all">All Statuses</option>
                <option value="new">Open</option>
                <option value="seller_response">Awaiting Seller Response</option>
                <option value="buyer_response">Awaiting Buyer Response</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
                <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Reasons</option>
                <option value="refund">Refund</option>
                <option value="return">Return</option>
                <option value="quality">Quality</option>
                <option value="delivery">Delivery</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={dateRangeFilter.start}
              onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
              placeholder="Start date"
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRangeFilter.end}
              onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
              placeholder="End date"
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {(dateRangeFilter.start || dateRangeFilter.end) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRangeFilter({ start: '', end: '' })}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Disputes Table */}
        <div className="space-y-4">
          {filteredDisputes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>No disputes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Dispute ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Order ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Buyer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Reason</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Last Updated</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDisputes.map((dispute) => {
                    const statusBadge = getStatusBadge(dispute.status);
                    const StatusIcon = statusBadge.icon;
                    const order = typeof dispute.orderId === 'object' ? dispute.orderId : null;
                    const buyer = typeof dispute.buyerId === 'object' ? dispute.buyerId : null;
                    const amount = getDisputeAmount(dispute);
                    const needsAction = requiresAction(dispute);
                    const deadline = getTimeUntilDeadline(dispute.responseDeadline);

            return (
                      <motion.tr
                        key={dispute._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                        className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                          needsAction ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white">{dispute.disputeNumber}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-gray-900 dark:text-white">{order?.orderNumber || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {buyer?.avatar_url ? (
                              <img
                                src={buyer.avatar_url.startsWith('http') ? buyer.avatar_url : `http://localhost:5000${buyer.avatar_url.startsWith('/') ? buyer.avatar_url : '/' + buyer.avatar_url}`}
                                alt={buyer?.fullName || 'Buyer'}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-teal-500 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm text-gray-900 dark:text-white">
                                {buyer?.fullName || 'Unknown'}
                    </div>
                              <div className="text-xs text-gray-500">{maskEmail(buyer?.email)}</div>
                    </div>
                  </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-700 dark:text-gray-300 capitalize">{dispute.reason}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                            <DollarSign className="w-4 h-4" />
                            {amount.toFixed(2)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${statusBadge.color} font-medium`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(dispute.updatedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {needsAction && (
                              <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                                <AlertCircle className="w-3 h-3" />
                                {deadline && (
                                  <span className={deadline.urgent ? 'font-bold' : ''}>{deadline.text}</span>
                                )}
                              </div>
                            )}
                  <Button 
                    variant="ghost" 
                              size="sm"
                    onClick={() => handleViewDispute(dispute)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                              View
                  </Button>
                </div>
                        </td>
                      </motion.tr>
            );
          })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dispute Details Dialog */}
      {selectedDispute && (
      <Dialog open={showDisputeDetails} onOpenChange={setShowDisputeDetails}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Dispute Details - {selectedDispute.disputeNumber}
            </DialogTitle>
          </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Dispute Summary Panel */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Dispute Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {typeof selectedDispute.orderId === 'object' ? selectedDispute.orderId.orderNumber : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Dispute Type:</span>
                    <span className="ml-2 text-gray-900 dark:text-white capitalize">{selectedDispute.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedDispute.reason}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Claimed Amount:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      ${getDisputeAmount(selectedDispute).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Date Opened:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {new Date(selectedDispute.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                    <span className="ml-2 text-gray-900 dark:text-white capitalize">{selectedDispute.priority}</span>
                  </div>
                </div>

                {/* Products Involved */}
                {typeof selectedDispute.orderId === 'object' && selectedDispute.orderId.items && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Products Involved</h4>
                    <div className="space-y-2">
                      {selectedDispute.orderId.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">
                            {item.name} {item.variant && `(${item.variant})`} x{item.quantity}
                          </span>
                          <span className="text-gray-900 dark:text-white">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status & Next Action Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-500/30">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Status & Next Action</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Status:</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${getStatusBadge(selectedDispute.status).color} font-medium`}>
                      {getStatusBadge(selectedDispute.status).label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {getNextAction(selectedDispute).message}
                  </div>
                  {getNextAction(selectedDispute).deadline && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-600 dark:text-orange-400">
                        Response deadline: {new Date(getNextAction(selectedDispute).deadline!).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversation Timeline */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Conversation Timeline</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {buildConversationTimeline(selectedDispute).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg ${
                        msg.sender === 'seller'
                          ? 'bg-red-50 dark:bg-red-900/20 ml-4 border border-red-200 dark:border-red-500/30'
                          : msg.sender === 'platform'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30'
                          : 'bg-gray-100 dark:bg-gray-700 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">
                          {msg.sender === 'platform' ? 'Platform Support' : msg.sender}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">{msg.date}</span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Display */}
              {selectedDispute.evidence && selectedDispute.evidence.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-red-400" />
                    Evidence
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedDispute.evidence.map((ev, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        {ev.type === 'photo' || ev.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img
                            src={`http://localhost:5000${ev.url}`}
                            alt={ev.description || `Evidence ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : ev.type === 'video' || ev.url.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i) ? (
                          <video
                            src={`http://localhost:5000${ev.url}`}
                            controls
                            className="w-full h-full object-cover"
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                            <FileText className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Outcome */}
              {(selectedDispute.status === 'resolved' || selectedDispute.status === 'approved' || selectedDispute.status === 'rejected') && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-500/30">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Resolution Outcome</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className="ml-2 text-gray-900 dark:text-white capitalize">{selectedDispute.status}</span>
                    </div>
                    {selectedDispute.resolution && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Resolution:</span>
                        <p className="mt-1 text-gray-900 dark:text-white">{selectedDispute.resolution}</p>
                        </div>
                    )}
                    {selectedDispute.resolvedAt && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Resolved on:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {new Date(selectedDispute.resolvedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Seller Response Actions */}
              {selectedDispute.status !== 'resolved' && 
               selectedDispute.status !== 'approved' && 
               selectedDispute.status !== 'rejected' && (
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Your Response Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => handleOpenResponseModal('accept')}
                      className="flex flex-col items-center gap-2 h-auto py-4 border-green-200 dark:border-green-500/30 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <span className="text-sm">Accept the Claim</span>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleOpenResponseModal('evidence')}
                      className="flex flex-col items-center gap-2 h-auto py-4 border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <FileCheck className="w-6 h-6 text-blue-500" />
                      <span className="text-sm">Provide Evidence</span>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleOpenResponseModal('dispute')}
                      className="flex flex-col items-center gap-2 h-auto py-4 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Ban className="w-6 h-6 text-red-500" />
                      <span className="text-sm">Dispute the Claim</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Response Modal */}
      <Dialog open={showResponseModal} onOpenChange={setShowResponseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              {responseType === 'accept' && 'Accept the Claim'}
              {responseType === 'evidence' && 'Provide Evidence'}
              {responseType === 'dispute' && 'Dispute the Claim'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {responseType === 'accept' && 'Explain why you are accepting this claim'}
                {responseType === 'evidence' && 'Explain your position and provide context'}
                {responseType === 'dispute' && 'Explain why you are disputing this claim'}
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Type your response here..."
                rows={6}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            {responseType === 'evidence' && (
              <div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResponseModal(false);
                    setShowEvidenceModal(true);
                  }}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Evidence Files
                </Button>
            </div>
          )}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseText('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitResponse}
                disabled={!responseText.trim() || submittingResponse}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                {submittingResponse ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evidence Upload Modal */}
      <Dialog open={showEvidenceModal} onOpenChange={setShowEvidenceModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Upload Evidence
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload Files (Images, PDFs, Documents)
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-900/40">
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Drag and drop files here, or click to browse. Max 10MB per file.
                </p>
                <label className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <span>Select Files</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleEvidenceFileChange(e.target.files)}
                    accept="image/*,.pdf,.doc,.docx,.txt,video/*"
                  />
                </label>
                {evidenceFiles.length > 0 && (
                  <div className="mt-4 text-left text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-24 overflow-y-auto">
                    {evidenceFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>{file.name}</span>
                        <span className="text-gray-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          onClick={() => setEvidenceFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes for Reviewer (optional)
              </label>
              <textarea
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
                placeholder="Explain what this evidence shows..."
                rows={3}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEvidenceModal(false);
                    setEvidenceFiles([]);
                    setEvidenceNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitEvidence}
                disabled={(evidenceFiles.length === 0 && !evidenceNotes.trim()) || uploadingEvidence}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                >
                {uploadingEvidence ? 'Uploading...' : 'Submit Evidence'}
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DisputeResolution;
