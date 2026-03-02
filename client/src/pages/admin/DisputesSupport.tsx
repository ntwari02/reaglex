import React, { useState, useEffect } from 'react';
import { AlertTriangle, MessageSquare, Search, Eye, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function DisputesSupport() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'disputes' | 'tickets'>('disputes');
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'disputes') {
      loadDisputes();
    } else {
      loadTickets();
    }
  }, [activeTab, filter]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('disputes')
        .select(`
          *,
          order:orders(id, order_number, total, buyer_id, seller_id),
          raised_by_profile:profiles!disputes_raised_by_fkey(id, email, full_name)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    // Mock tickets data - in real app, this would come from a support_tickets table
    const mockTickets = [
      {
        id: '1',
        user_id: 'user1',
        user_name: 'John Buyer',
        subject: 'Product not received',
        message: 'I ordered a product 2 weeks ago but haven\'t received it yet.',
        status: 'open',
        priority: 'high',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        user_id: 'user2',
        user_name: 'Jane Seller',
        subject: 'Payment issue',
        message: 'My payout was not processed correctly.',
        status: 'in_progress',
        priority: 'medium',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    setTickets(mockTickets);
    setLoading(false);
  };

  const handleResolveDispute = async (disputeId: string, resolution: string, winner: 'buyer' | 'seller') => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId);

      if (error) throw error;
      loadDisputes();
      setShowDisputeModal(false);
    } catch (error) {
      console.error('Error resolving dispute:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredDisputes = disputes.filter(dispute =>
    dispute.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.raised_by_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dispute.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Disputes & Support Tickets</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage disputes and customer support tickets
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('disputes')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'disputes'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Disputes ({disputes.filter(d => d.status === 'open').length})
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4 inline mr-2" />
              Support Tickets ({tickets.filter(t => t.status === 'open').length})
            </button>
          </div>
        </div>

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <div className="p-6">
            {/* Filters */}
            <div className="mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search disputes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                {['all', 'open', 'under_review', 'resolved', 'closed'].map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(status)}
                  >
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>

            {/* Disputes List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No disputes found</div>
            ) : (
              <div className="space-y-4">
                {filteredDisputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            Order #{dispute.order?.order_number || 'N/A'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                            {dispute.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <strong>Reason:</strong> {dispute.reason}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <strong>Raised by:</strong> {dispute.raised_by_profile?.full_name || dispute.raised_by_profile?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Description:</strong> {dispute.description}
                        </p>
                        {dispute.evidence && dispute.evidence.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Evidence:</p>
                            <div className="flex gap-2 mt-1">
                              {dispute.evidence.map((evidence: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={evidence}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  Evidence {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Created: {new Date(dispute.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDispute(dispute);
                            setShowDisputeModal(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Support Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No support tickets found</div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === 'open'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {ticket.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.priority === 'high'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <strong>From:</strong> {ticket.user_name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {ticket.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Created: {new Date(ticket.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View & Reply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dispute Resolution Modal */}
      {showDisputeModal && selectedDispute && (
        <DisputeResolutionModal
          dispute={selectedDispute}
          onClose={() => {
            setShowDisputeModal(false);
            setSelectedDispute(null);
          }}
          onResolve={handleResolveDispute}
        />
      )}
    </div>
  );
}

function DisputeResolutionModal({ dispute, onClose, onResolve }: any) {
  const [resolution, setResolution] = useState('');
  const [winner, setWinner] = useState<'buyer' | 'seller'>('buyer');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-gray-600">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resolve Dispute</h2>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Dispute Details</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Order:</strong> #{dispute.order?.order_number}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Reason:</strong> {dispute.reason}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Description:</strong> {dispute.description}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resolution Decision
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="buyer"
                  checked={winner === 'buyer'}
                  onChange={(e) => setWinner(e.target.value as 'buyer' | 'seller')}
                  className="mr-2"
                />
                Buyer Wins (Refund)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="seller"
                  checked={winner === 'seller'}
                  onChange={(e) => setWinner(e.target.value as 'buyer' | 'seller')}
                  className="mr-2"
                />
                Seller Wins (No Refund)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resolution Notes
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter resolution details..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onResolve(dispute.id, resolution, winner)}
            disabled={!resolution.trim()}
          >
            Resolve Dispute
          </Button>
        </div>
      </div>
    </div>
  );
}
