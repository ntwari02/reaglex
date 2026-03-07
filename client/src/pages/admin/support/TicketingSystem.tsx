import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Eye,
  Send,
  X,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { adminSupportAPI } from '@/lib/api';
import { pageTransition, modalBackdrop, modalPanel } from './supportAnimations';

interface Ticket {
  id: string;
  ticketNumber: string;
  userType: 'customer' | 'seller';
  userName: string;
  userEmail: string;
  subject: string;
  category: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  createdAt: string;
  lastUpdated: string;
  orderId?: string;
  messageCount: number;
}

const categoryToBackend: Record<string, string> = {
  'Payment': 'billing',
  'Delivery': 'other',
  'Product Quality': 'product',
  'Refund': 'other',
  'Technical': 'technical',
  'Account': 'account',
  'Other': 'other',
};

export default function TicketingSystem() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetail, setTicketDetail] = useState<any>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(() => {
    setLoading(true);
    setError(null);
    const categoryParam = categoryFilter === 'all' ? undefined : (categoryToBackend[categoryFilter] || categoryFilter);
    adminSupportAPI
      .getTickets({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryParam,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        search: searchTerm.trim() || undefined,
        page,
        limit: 20,
      })
      .then((res) => {
        setTickets(res.tickets ?? []);
        setTotalPages(res.pagination?.pages ?? 1);
      })
      .catch((err) => setError(err?.message ?? 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [statusFilter, categoryFilter, priorityFilter, searchTerm, page]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketDetail(null);
    setShowTicketModal(true);
    adminSupportAPI
      .getTicket(ticket.id)
      .then((res) => setTicketDetail(res.ticket))
      .catch(() => setTicketDetail(null));
  };


  const getStatusBadge = (status: Ticket['status']) => {
    const styles = {
      open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      resolved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    const styles = {
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
      urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    adminSupportAPI
      .addTicketMessage(selectedTicket.id, { message: replyText.trim() })
      .then((res) => {
        setTicketDetail(res.ticket);
        setReplyText('');
        loadTickets();
      })
      .catch((err) => alert(err?.message ?? 'Failed to send reply'))
      .finally(() => setSending(false));
  };

  const frontendToBackendStatus: Record<string, string> = {
    open: 'open',
    pending: 'in_progress',
    resolved: 'resolved',
    closed: 'closed',
  };
  const handleUpdateTicket = (updates: { status?: string; priority?: string; assignedTo?: string | null }) => {
    if (!selectedTicket) return;
    const body = { ...updates };
    if (updates.status) body.status = frontendToBackendStatus[updates.status] || updates.status;
    adminSupportAPI
      .updateTicket(selectedTicket.id, body)
      .then((res) => {
        setTicketDetail(res.ticket);
        setSelectedTicket((prev) => (prev ? { ...prev, ...updates, status: (updates.status as any) ?? prev.status, priority: (updates.priority as any) ?? prev.priority, assignedTo: updates.assignedTo ?? prev.assignedTo } : null));
        loadTickets();
      })
      .catch((err) => alert(err?.message ?? 'Failed to update ticket'));
  };

  return (
    <motion.div
      className="space-y-6"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      {/* Header with Search and Filters */}
      <motion.div
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ticket number, name, email, order ID..."
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
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="Payment">Payment</option>
            <option value="Delivery">Delivery</option>
            <option value="Product Quality">Product Quality</option>
            <option value="Refund">Refund</option>
            <option value="Technical">Technical</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            type="button"
            onClick={() => loadTickets()}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-500 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 disabled:opacity-50"
            title="Refresh from database"
          >
            <RefreshCw className={`mr-1 inline h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div
        className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Ticket #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading tickets...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-red-600 dark:text-red-400">
                    {error}
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No tickets found from the database. Create tickets as a seller to see them here.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket, i) => (
                <motion.tr
                  key={ticket.id}
                  custom={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {ticket.ticketNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {ticket.userName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.userEmail}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                          ticket.userType === 'customer'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200'
                        }`}
                      >
                        {ticket.userType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900 dark:text-white">{ticket.subject}</p>
                    {ticket.orderId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Order: {ticket.orderId}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {ticket.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                  <td className="px-6 py-4">{getPriorityBadge(ticket.priority)}</td>
                  <td className="px-6 py-4">
                    {ticket.assignedTo ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {ticket.assignedTo}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(ticket.lastUpdated).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleViewTicket(ticket)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-emerald-900/20"
                    >
                      <Eye className="mr-1 inline h-4 w-4" />
                      View
                    </button>
                  </td>
                </motion.tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {showTicketModal && selectedTicket && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={modalBackdrop.initial}
            animate={modalBackdrop.animate}
            exit={modalBackdrop.exit}
            transition={modalBackdrop.transition}
            onClick={() => setShowTicketModal(false)}
          >
            <motion.div
              className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
              initial={modalPanel.initial}
              animate={modalPanel.animate}
              exit={modalPanel.exit}
              transition={modalPanel.transition}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="border-b border-gray-200 p-6 dark:border-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedTicket.ticketNumber}
                  </h2>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{selectedTicket.subject}</p>
                </div>
                <button
                  onClick={() => setShowTicketModal(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {getStatusBadge(selectedTicket.status)}
                {getPriorityBadge(selectedTicket.priority)}
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {selectedTicket.category}
                </span>
              </div>
            </div>

            <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-6 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
              {/* User Info */}
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  User Information
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedTicket.userName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedTicket.userEmail}
                    </p>
                  </div>
                  {selectedTicket.orderId && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedTicket.orderId}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">User Type</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selectedTicket.userType}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Message History ({ticketDetail?.messages?.length ?? selectedTicket.messageCount} messages)
                </h3>
                <div className="space-y-4">
                  {!ticketDetail ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                  ) : (ticketDetail.messages || []).length === 0 ? (
                    <p className="text-sm text-gray-500">No messages yet.</p>
                  ) : (
                    (ticketDetail.messages || []).map((msg: any) => (
                      <div
                        key={msg._id || msg.createdAt}
                        className={`rounded-xl border p-4 dark:border-gray-800 ${
                          msg.senderRole === 'admin' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-gray-200 bg-white dark:bg-gray-800/50'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {msg.senderName} {msg.isInternal ? '(Internal)' : ''}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reply Section */}
              {selectedTicket.status !== 'closed' && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Reply to Ticket</h3>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    rows={4}
                    className="mb-3 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      <Send className="mr-2 inline h-4 w-4" />
                      {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              {selectedTicket.status !== 'closed' && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleUpdateTicket({ status: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Priority:</span>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button
                    onClick={() => handleUpdateTicket({ status: 'resolved' })}
                    className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
                  >
                    <CheckCircle className="mr-2 inline h-4 w-4" />
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

