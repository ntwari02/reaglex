import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { adminSupportAPI } from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import {
  MessageSquare,
  FileText,
  Paperclip,
  CheckCircle,
  X,
  AlertTriangle,
  Send,
  Clock,
  User,
  Download,
} from 'lucide-react';

interface SellerSupportProps {
  sellerId: string;
}

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type DisputeStatus = 'new' | 'under_review' | 'approved' | 'rejected' | 'resolved';

interface SupportTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  messages: number;
  hasAttachments: boolean;
}

interface Dispute {
  id: string;
  orderId: string;
  customerName: string;
  type: 'refund' | 'return' | 'quality' | 'other';
  status: DisputeStatus;
  amount: number;
  description: string;
  createdAt: string;
  evidence: string[];
}

function mapTicket(t: Record<string, unknown>): SupportTicket {
  const statusRaw = String(t.status || 'open');
  const status: TicketStatus =
    statusRaw === 'in_progress' || statusRaw === 'waiting_customer'
      ? 'in_progress'
      : statusRaw === 'resolved' || statusRaw === 'closed'
        ? 'resolved'
        : 'open';
  return {
    id: String(t.id || t.ticketNumber),
    subject: String(t.subject || ''),
    status,
    priority: (t.priority as SupportTicket['priority']) || 'medium',
    createdAt: t.createdAt ? String(t.createdAt).slice(0, 10) : '',
    updatedAt: t.lastUpdated ? String(t.lastUpdated).slice(0, 10) : '',
    messages: Number(t.messageCount ?? 0),
    hasAttachments: false,
  };
}

function mapDispute(d: Record<string, unknown>): Dispute {
  const buyer = d.buyerId as Record<string, string> | undefined;
  const order = d.orderId as Record<string, unknown> | undefined;
  return {
    id: String(d._id || d.id),
    orderId: order?.orderNumber ? String(order.orderNumber) : String(d.orderId || ''),
    customerName: buyer?.fullName || String(d.buyerName || 'Customer'),
    type: (String(d.type || 'other') as Dispute['type']) || 'other',
    status: (String(d.status || 'new') as DisputeStatus) || 'new',
    amount: Number(d.amount ?? order?.total ?? 0),
    description: String(d.description || d.reason || ''),
    createdAt: d.createdAt ? String(d.createdAt).slice(0, 10) : '',
    evidence: Array.isArray(d.evidence) ? (d.evidence as string[]) : [],
  };
}

export default function SellerSupport({ sellerId }: SellerSupportProps) {
  const showToast = useToastStore((s) => s.showToast);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tickets' | 'disputes'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const loadSupport = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const [ticketsRes, disputesRes] = await Promise.all([
        adminSupportAPI.getTickets({ sellerId, limit: 50 }),
        adminSupportAPI.getDisputes({ sellerId, limit: 50 }),
      ]);
      setTickets((ticketsRes.tickets || []).map((t) => mapTicket(t as Record<string, unknown>)));
      setDisputes((disputesRes.disputes || []).map((d) => mapDispute(d as Record<string, unknown>)));
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to load support data', 'error');
      setTickets([]);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [sellerId, showToast]);

  useEffect(() => {
    loadSupport();
  }, [loadSupport]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [messageText, setMessageText] = useState('');

  const getStatusBadge = (status: TicketStatus | DisputeStatus) => {
    const styles: Record<string, string> = {
      open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      new: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] || ''}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[priority as keyof typeof styles]}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Support & Disputes</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Support tickets and dispute management</p>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'tickets'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Support Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'disputes'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Disputes ({disputes.length})
          </button>
        </div>
      </div>

      {/* Support Tickets Tab */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</h3>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>ID: {ticket.id}</span>
                    <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                    <span>{ticket.messages} messages</span>
                    {ticket.hasAttachments && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> Has attachments
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowTicketModal(true);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {dispute.type.charAt(0).toUpperCase() + dispute.type.slice(1)} Dispute
                    </h3>
                    {getStatusBadge(dispute.status)}
                  </div>
                  <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">{dispute.description}</div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>ID: {dispute.id}</span>
                    <span>Order: {dispute.orderId}</span>
                    <span>Customer: {dispute.customerName}</span>
                    <span>Amount: ${dispute.amount.toFixed(2)}</span>
                    <span>Created: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                    {dispute.evidence.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> {dispute.evidence.length} files
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {dispute.status === 'new' && (
                    <>
                      <button
                        onClick={() => handleApproveDispute(dispute.id)}
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectDispute(dispute.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedDispute(dispute);
                      setShowDisputeModal(true);
                    }}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowTicketModal(false);
                setSelectedTicket(null);
              }}
              className="absolute right-4 top-4 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{selectedTicket.subject}</h3>
            <div className="mb-4 flex items-center gap-2">
              {getStatusBadge(selectedTicket.status)}
              {getPriorityBadge(selectedTicket.priority)}
            </div>
            <div className="mb-6 space-y-3 max-h-96 overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
              {/* Mock messages */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Seller</span>
                  <span className="text-xs text-gray-500">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">Initial support request message...</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400">
                <Paperclip className="h-4 w-4" />
              </button>
              <button className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowDisputeModal(false);
                setSelectedDispute(null);
              }}
              className="absolute right-4 top-4 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Dispute Details</h3>
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Dispute ID</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedDispute.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedDispute.orderId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedDispute.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ${selectedDispute.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedDispute.type.charAt(0).toUpperCase() + selectedDispute.type.slice(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  {getStatusBadge(selectedDispute.status)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedDispute.description}</p>
              </div>
              {selectedDispute.evidence.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Evidence Files</p>
                  <div className="space-y-2">
                    {selectedDispute.evidence.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{file}</span>
                        </div>
                        <button className="rounded-full border border-gray-200 p-1 text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-400">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Upload Evidence</p>
                <button className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 hover:border-emerald-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <Paperclip className="mx-auto mb-2 h-6 w-6" />
                  Click to upload files
                </button>
              </div>
              {selectedDispute.status === 'new' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveDispute(selectedDispute.id)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
                  >
                    Approve Claim
                  </button>
                  <button
                    onClick={() => handleRejectDispute(selectedDispute.id)}
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                  >
                    Reject Claim
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function handleApproveDispute(disputeId: string) {
  console.log('Approve dispute:', disputeId);
}

function handleRejectDispute(disputeId: string) {
  console.log('Reject dispute:', disputeId);
}
