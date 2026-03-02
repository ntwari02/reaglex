import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Send,
  Paperclip,
  Tag,
  UserPlus,
  FileText,
  TrendingUp,
  X,
} from 'lucide-react';

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

const mockTickets: Ticket[] = [
  {
    id: '1',
    ticketNumber: 'TKT-001234',
    userType: 'customer',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    subject: 'Order not received',
    category: 'Delivery',
    status: 'open',
    priority: 'high',
    assignedTo: 'Sarah Johnson',
    createdAt: '2024-03-15T10:30:00',
    lastUpdated: '2024-03-17T14:20:00',
    orderId: 'ORD-12345',
    messageCount: 5,
  },
  {
    id: '2',
    ticketNumber: 'TKT-001235',
    userType: 'seller',
    userName: 'Tech Store',
    userEmail: 'tech@store.com',
    subject: 'Payment issue',
    category: 'Payment',
    status: 'pending',
    priority: 'medium',
    createdAt: '2024-03-16T09:15:00',
    lastUpdated: '2024-03-17T11:45:00',
    messageCount: 3,
  },
  {
    id: '3',
    ticketNumber: 'TKT-001236',
    userType: 'customer',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    subject: 'Product quality issue',
    category: 'Product Quality',
    status: 'resolved',
    priority: 'medium',
    assignedTo: 'Mike Wilson',
    createdAt: '2024-03-14T15:20:00',
    lastUpdated: '2024-03-17T10:00:00',
    orderId: 'ORD-12346',
    messageCount: 8,
  },
  {
    id: '4',
    ticketNumber: 'TKT-001237',
    userType: 'customer',
    userName: 'Bob Johnson',
    userEmail: 'bob@example.com',
    subject: 'Refund request',
    category: 'Refund',
    status: 'open',
    priority: 'urgent',
    createdAt: '2024-03-17T08:00:00',
    lastUpdated: '2024-03-17T12:30:00',
    orderId: 'ORD-12347',
    messageCount: 2,
  },
];

export default function TicketingSystem() {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [replyText, setReplyText] = useState('');

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.orderId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

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

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return;
    // Handle reply logic here
    console.log('Sending reply:', replyText);
    setReplyText('');
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
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
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
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {showTicketModal && selectedTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowTicketModal(false)}
        >
          <div
            className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
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
                  Message History ({selectedTicket.messageCount} messages)
                </h3>
                <div className="space-y-4">
                  {/* Mock messages */}
                  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedTicket.userName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Initial message about the issue...
                    </p>
                  </div>
                </div>
              </div>

              {/* Reply Section */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Reply to Ticket
                </h3>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={4}
                  className="mb-3 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                      <Paperclip className="mr-1 inline h-4 w-4" />
                      Attach
                    </button>
                    <button className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                      <FileText className="mr-1 inline h-4 w-4" />
                      Template
                    </button>
                  </div>
                  <button
                    onClick={handleSendReply}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
                  >
                    <Send className="mr-2 inline h-4 w-4" />
                    Send Reply
                  </button>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="mt-6 flex flex-wrap gap-2">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <UserPlus className="mr-2 inline h-4 w-4" />
                  Assign Staff
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Tag className="mr-2 inline h-4 w-4" />
                  Change Priority
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <FileText className="mr-2 inline h-4 w-4" />
                  Add Note
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <CheckCircle className="mr-2 inline h-4 w-4" />
                  Mark Resolved
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <TrendingUp className="mr-2 inline h-4 w-4" />
                  Escalate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

