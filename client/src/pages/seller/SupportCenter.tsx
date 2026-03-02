import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  LifeBuoy,
  Mail,
  FileText,
  AlertTriangle,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Paperclip,
  X,
  Download,
  Star,
  Eye,
  Tag,
  TrendingUp,
  MessageSquare,
  Calendar,
  User,
  ChevronRight,
  Loader2,
  Package,
  DollarSign,
  Shield,
  Truck,
  BookOpen,
  Bell,
  Activity,
  Lock,
  Phone,
  Headphones,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';

const API_BASE = 'http://localhost:5000/api/seller/support';
const KB_API_BASE = 'http://localhost:5000/api/seller/knowledge-base';
const DISPUTE_API_BASE = 'http://localhost:5000/api/seller/disputes';
const HEALTH_API_BASE = 'http://localhost:5000/api/seller/account-health';
const NOTIFICATION_API_BASE = 'http://localhost:5000/api/seller/notifications';

// Helper to resolve avatar URL (handles both full URLs and relative paths)
const resolveAvatarUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // If it's a relative path, prepend the API host
  const API_HOST = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${API_HOST}${url.startsWith('/') ? url : '/' + url}`;
};

interface TicketMessage {
  _id?: string;
  senderId: string;
  senderName: string;
  senderRole: 'seller' | 'admin' | 'support';
  message: string;
  attachments?: string[];
  isInternal?: boolean;
  createdAt: string;
  readAt?: string;
  readBy?: string[];
}

interface SupportTicket {
  _id: string;
  ticketNumber: string;
  sellerId: string;
  subject: string;
  category: 'technical' | 'billing' | 'account' | 'product' | 'payout' | 'verification' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  description: string;
  messages: TicketMessage[];
  assignedTo?: {
    _id: string;
    fullName: string;
    email: string;
  };
  tags?: string[];
  relatedOrderId?: string;
  relatedProductId?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  satisfactionRating?: number;
  satisfactionFeedback?: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

interface KnowledgeArticle {
  _id: string;
  title: string;
  content: string;
  category: 'getting_started' | 'product_listing' | 'shipping' | 'returns' | 'payments' | 'security' | 'platform_rules' | 'other';
  tags: string[];
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

interface Dispute {
  _id: string;
  disputeNumber: string;
  orderId: any;
  buyerId: any;
  type: 'refund' | 'return' | 'quality' | 'delivery' | 'other';
  reason: string;
  description: string;
  status: 'new' | 'under_review' | 'seller_response' | 'buyer_response' | 'approved' | 'rejected' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence: Array<{ type: string; url: string; description?: string }>;
  sellerResponse?: string;
  createdAt: string;
  updatedAt: string;
}

interface AccountHealth {
  overallStatus: 'good' | 'warning' | 'restricted';
  performanceScore: number;
  metrics: {
    totalOrders: number;
    orderDefectRate: number;
    lateShipmentRate: number;
    cancellationRate: number;
    policyViolations: number;
  };
  warnings: string[];
  recommendations: string[];
}

interface SystemNotification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'policy_update' | 'system_announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
}

const SupportCenter: React.FC = () => {
  const { showToast } = useToastStore();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'knowledge' | 'disputes' | 'health' | 'notifications' | 'contact'>('knowledge');
  
  // Ticket management state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
  });
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSatisfactionModal, setShowSatisfactionModal] = useState(false);
  
  // Knowledge base state
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [kbCategory, setKbCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);
  
  // Disputes state
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeResponse, setDisputeResponse] = useState('');
  
  // Account health state
  const [accountHealth, setAccountHealth] = useState<AccountHealth | null>(null);
  
  // Notifications state
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Live chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; text: string; sender: 'user' | 'support'; timestamp: Date }>>([
    {
      id: '1',
      text: 'Hello! 👋 Welcome to REAGLE-X Support. How can I help you today?',
      sender: 'support',
      timestamp: new Date(),
    },
  ]);
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'priority'>('updatedAt');
  
  // Create ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'other' as SupportTicket['category'],
    priority: 'medium' as SupportTicket['priority'],
    description: '',
    tags: [] as string[],
    attachments: [] as File[],
  });
  
  // Message form
  const [messageText, setMessageText] = useState('');
  const [messageAttachments, setMessageAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageFileInputRef = useRef<HTMLInputElement>(null);
  
  // Satisfaction form
  const [satisfaction, setSatisfaction] = useState({ rating: 0, feedback: '' });
  
  // Polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch tickets
  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy);
      params.append('sortOrder', 'desc');
      params.append('page', '1');
      params.append('limit', '50');

      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error: any) {
      console.error('Failed to fetch tickets:', error);
      showToast('Failed to load tickets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data.stats || stats);
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch single ticket
  const fetchTicket = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/${ticketId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch ticket');
      const data = await response.json();
      setSelectedTicket(data.ticket);
      
      // Update in tickets list
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? data.ticket : t))
      );
    } catch (error: any) {
      console.error('Failed to fetch ticket:', error);
      showToast('Failed to load ticket details', 'error');
    }
  };

  // Create ticket
  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Upload attachments first if any
      let attachmentUrls: string[] = [];
      if (newTicket.attachments.length > 0) {
        const formData = new FormData();
        newTicket.attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        const uploadResponse = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
          credentials: 'include',
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          attachmentUrls = uploadData.files.map((f: any) => f.path);
        }
      }

      // Create ticket
      const response = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          ...newTicket,
          attachments: attachmentUrls,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create ticket');
      }

      await response.json();
      showToast('Ticket created successfully', 'success');
      setShowCreateModal(false);
      setNewTicket({
        subject: '',
        category: 'other',
        priority: 'medium',
        description: '',
        tags: [],
        attachments: [],
      });
      fetchTickets();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      showToast(error.message || 'Failed to create ticket', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() && messageAttachments.length === 0) {
      showToast('Please enter a message or attach a file', 'error');
      return;
    }

    if (!selectedTicket) return;

    setIsSending(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Send message
      const formData = new FormData();
    formData.append('message', messageText);
    
    // Upload files if any
    if (messageAttachments.length > 0) {
      messageAttachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await fetch(`${API_BASE}/${selectedTicket._id}/messages`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send message');
    }
      showToast('Message sent successfully', 'success');
      setMessageText('');
      setMessageAttachments([]);
      fetchTicket(selectedTicket._id);
      fetchTickets();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      showToast(error.message || 'Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Update ticket status
  const handleUpdateStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      showToast('Ticket status updated', 'success');
      fetchTickets();
      if (selectedTicket?._id === ticketId) {
        fetchTicket(ticketId);
      }
      fetchStats();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      showToast('Failed to update ticket status', 'error');
    }
  };

  // Submit satisfaction
  const handleSubmitSatisfaction = async () => {
    if (!selectedTicket || satisfaction.rating === 0) {
      showToast('Please select a rating', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/${selectedTicket._id}/satisfaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(satisfaction),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to submit rating');
      
      showToast('Thank you for your feedback!', 'success');
      setShowSatisfactionModal(false);
      setSatisfaction({ rating: 0, feedback: '' });
      fetchTicket(selectedTicket._id);
    } catch (error: any) {
      console.error('Failed to submit satisfaction:', error);
      showToast('Failed to submit feedback', 'error');
    }
  };

  // Handle chat message sending
  const handleSendChatMessage = () => {
    if (!chatMessage.trim()) return;
    
    const userMessage = {
      id: Date.now().toString(),
      text: chatMessage.trim(),
      sender: 'user' as const,
      timestamp: new Date(),
    };
    
    setChatMessages((prev) => [...prev, userMessage]);
    setChatMessage('');
    
    // Simulate support response (in real app, this would be a WebSocket or API call)
    setTimeout(() => {
      const supportMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Thank you for your message. Our support team will respond shortly. In the meantime, you can also create a support ticket for more complex issues.',
        sender: 'support' as const,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, supportMessage]);
    }, 1500);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isMessage: boolean = false) => {
    const files = Array.from(e.target.files || []);
    if (isMessage) {
      setMessageAttachments((prev) => [...prev, ...files]);
    } else {
      setNewTicket((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
    }
  };

  // Remove attachment
  const removeAttachment = (index: number, isMessage: boolean = false) => {
    if (isMessage) {
      setMessageAttachments((prev) => prev.filter((_, i) => i !== index));
    } else {
      setNewTicket((prev) => ({
        ...prev,
        attachments: prev.attachments.filter((_, i) => i !== index),
      }));
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Get status badge
  const getStatusBadge = (status: SupportTicket['status']) => {
    const styles: Record<string, string> = {
      open: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50',
      in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50',
      waiting_customer: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-700/50',
      resolved: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700/50',
      closed: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
    };
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status] || ''}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  // Get priority badge
  const getPriorityBadge = (priority: SupportTicket['priority']) => {
    const styles: Record<string, string> = {
      low: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700/50',
      medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50',
      high: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-700/50',
      urgent: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700/50',
    };
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[priority] || ''}`}>
        {priority}
      </span>
    );
  };

  // Get category icon
  const getCategoryIcon = (category: SupportTicket['category']) => {
    const icons: Record<string, React.ReactNode> = {
      technical: <AlertTriangle className="w-4 h-4" />,
      billing: <FileText className="w-4 h-4" />,
      account: <User className="w-4 h-4" />,
      product: <Tag className="w-4 h-4" />,
      payout: <TrendingUp className="w-4 h-4" />,
      verification: <CheckCircle className="w-4 h-4" />,
      other: <MessageSquare className="w-4 h-4" />,
    };
    return icons[category] || icons.other;
  };

  // Knowledge Base Functions
  const fetchArticles = async () => {
    setIsLoadingArticles(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      if (kbSearchQuery) params.append('query', kbSearchQuery);
      if (kbCategory !== 'all') params.append('category', kbCategory);
      
      const response = await fetch(`${KB_API_BASE}/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch articles');
      }
      const data = await response.json();
      setArticles(data.articles || []);
      
      // Log for debugging
      console.log('Knowledge base articles loaded:', data.articles?.length || 0);
    } catch (error: any) {
      console.error('Failed to fetch articles:', error);
      showToast(error.message || 'Failed to load knowledge base articles', 'error');
      setArticles([]);
    } finally {
      setIsLoadingArticles(false);
    }
  };

  const fetchArticle = async (articleId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${KB_API_BASE}/${articleId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch article');
      const data = await response.json();
      setSelectedArticle(data.article);
      setShowArticleModal(true);
    } catch (error: any) {
      console.error('Failed to fetch article:', error);
      showToast('Failed to load article', 'error');
    }
  };

  const submitArticleFeedback = async (articleId: string, helpful: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${KB_API_BASE}/${articleId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ helpful }),
        credentials: 'include',
      });
      
      if (response.ok) {
        showToast('Thank you for your feedback!', 'success');
        if (selectedArticle) {
          fetchArticle(selectedArticle._id);
        }
      }
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
    }
  };

  // Dispute Functions
  const fetchDisputes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${DISPUTE_API_BASE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch disputes');
      const data = await response.json();
      setDisputes(data.disputes || []);
    } catch (error: any) {
      console.error('Failed to fetch disputes:', error);
    }
  };

  const submitDisputeResponse = async () => {
    if (!selectedDispute || !disputeResponse.trim()) {
      showToast('Please enter a response', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${DISPUTE_API_BASE}/${selectedDispute._id}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ response: disputeResponse }),
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to submit response');
      showToast('Response submitted successfully', 'success');
      setDisputeResponse('');
      fetchDisputes();
      setShowDisputeModal(false);
    } catch (error: any) {
      console.error('Failed to submit response:', error);
      showToast('Failed to submit response', 'error');
    }
  };

  // Account Health Functions
  const fetchAccountHealth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${HEALTH_API_BASE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch account health');
      const data = await response.json();
      setAccountHealth(data.health);
    } catch (error: any) {
      console.error('Failed to fetch account health:', error);
    }
  };

  // Notification Functions
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${NOTIFICATION_API_BASE}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${NOTIFICATION_API_BASE}/unread-count`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error: any) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchTickets();
    fetchStats();
    fetchAccountHealth();
    fetchNotifications();
    fetchUnreadCount();
    // Fetch articles on initial load if knowledge tab is active
    if (activeTab === 'knowledge') {
      fetchArticles();
    }

    // Poll for updates every 30 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchTickets();
      fetchUnreadCount();
      if (selectedTicket) {
        fetchTicket(selectedTicket._id);
      }
    }, 30000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [statusFilter, categoryFilter, searchQuery, sortBy]);

  // Fetch articles when search/category changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'knowledge') {
        fetchArticles();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [kbSearchQuery, kbCategory, activeTab]);

  // Fetch disputes when tab is active
  useEffect(() => {
    if (activeTab === 'disputes') {
      fetchDisputes();
    }
  }, [activeTab]);

  // Re-fetch when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTickets();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter, categoryFilter, sortBy]);

  const quickHelpCategories = [
    { icon: Package, label: 'Order Issues', category: 'product' },
    { icon: DollarSign, label: 'Payments & Payouts', category: 'payout' },
    { icon: Shield, label: 'Account & Verification', category: 'verification' },
    { icon: Tag, label: 'Product Listing Issues', category: 'product' },
    { icon: Truck, label: 'Shipping & Delivery', category: 'other' },
    { icon: AlertTriangle, label: 'Policy Violations', category: 'account' },
    { icon: Lock, label: 'Account Access / Login', category: 'account' },
  ];

  const getAccountStatusBadge = () => {
    if (!user) return null;
    const status = user.seller_verified ? 'Verified' : user.seller_status === 'pending' ? 'Pending' : 'Unverified';
    const color = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Seller Info */}
      <div className="bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-900/10 dark:to-orange-900/10 rounded-xl p-6 border border-red-100 dark:border-red-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 flex items-center gap-3 sm:gap-4">
            {/* User Profile Avatar */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-red-400 to-orange-500 overflow-hidden flex-shrink-0 border-2 border-white dark:border-gray-800 shadow-md">
              {user?.avatar_url ? (
                <img
                  src={resolveAvatarUrl(user.avatar_url) || ''}
                  alt={user.full_name || user.email || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl">
                  {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
                <LifeBuoy className="w-8 h-8 text-red-400 dark:text-red-400" />
                Seller Support Center
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm transition-colors duration-300">
                Get help managing your store, orders, payments, and account.
              </p>
              {user && (
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{user.full_name || user.email}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">ID: {user.id?.slice(0, 8)}...</span>
                  {getAccountStatusBadge()}
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={() => {
              setActiveTab('tickets');
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Quick Help Shortcuts */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {quickHelpCategories.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={index}
                onClick={() => {
                  setActiveTab('tickets');
                  setNewTicket({ ...newTicket, category: item.category as any });
                  setShowCreateModal(true);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/80 dark:bg-gray-800/30 hover:bg-red-50/50 dark:hover:bg-red-900/10 rounded-xl p-4 text-gray-900 dark:text-gray-200 hover:shadow-lg transition-all border border-red-100 dark:border-red-500/20 hover:border-red-200 dark:hover:border-red-500/30"
              >
                <Icon className="w-6 h-6 mb-2" />
                <p className="text-xs font-semibold text-center">{item.label}</p>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'tickets', label: 'Tickets', icon: FileText, badge: stats.open },
          { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
          { id: 'health', label: 'Account Health', icon: Activity },
          { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
          { id: 'contact', label: 'Contact', icon: Headphones },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-red-400 text-red-600 dark:text-red-400 font-medium'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold shadow-sm">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-red-50/80 to-orange-50/80 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-red-100 dark:border-red-500/20 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Tickets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-red-400 dark:text-red-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-500/20 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Open</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.open}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500 dark:text-amber-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-500/20 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.inProgress}</p>
                </div>
                <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-500/20 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Resolved</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{stats.resolved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500 dark:text-green-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50/80 to-slate-50/80 dark:from-gray-800/30 dark:to-slate-800/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700/30 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Closed</p>
                  <p className="text-2xl font-bold text-gray-700 dark:text-gray-300 mt-1">{stats.closed}</p>
                </div>
                <XCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          </div>

          {/* Account Health Summary */}
          {accountHealth && (
            <div className="bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-900/10 dark:to-orange-900/10 rounded-xl p-6 border border-red-100 dark:border-red-500/20">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-400" />
                Account Health
              </h3>
              <div className="flex items-center gap-4 mb-4">
                <div className={`px-4 py-2 rounded-lg ${
                  accountHealth.overallStatus === 'good' 
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700/50'
                    : accountHealth.overallStatus === 'warning'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700/50'
                }`}>
                  Status: {accountHealth.overallStatus.toUpperCase()}
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  Performance Score: {accountHealth.performanceScore}%
                </div>
              </div>
              {accountHealth.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50/50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">Warnings:</p>
                  <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300">
                    {accountHealth.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recent Tickets Preview */}
          {tickets.length > 0 && (
            <div className="bg-gradient-to-br from-white/80 to-red-50/30 dark:from-gray-900/50 dark:to-red-900/10 rounded-xl p-6 border border-red-100 dark:border-red-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-400" />
                  Recent Tickets
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('tickets')}
                  className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {tickets.slice(0, 3).map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowDetailModal(true);
                      fetchTicket(ticket._id);
                    }}
                    className="p-3 bg-white/60 dark:bg-gray-800/30 rounded-lg border border-red-100 dark:border-red-500/20 hover:border-red-200 dark:hover:border-red-500/30 cursor-pointer transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {ticket.subject}
                          </h4>
                          {getStatusBadge(ticket.status)}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ticket.ticketNumber} • {formatDate(ticket.updatedAt)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="bg-gradient-to-r from-white/80 to-red-50/30 dark:from-gray-900/50 dark:to-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-500/20">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={kbSearchQuery}
                  onChange={(e) => setKbSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <select
                value={kbCategory}
                onChange={(e) => setKbCategory(e.target.value)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Categories</option>
                <option value="getting_started">Getting Started</option>
                <option value="product_listing">Product Listing</option>
                <option value="shipping">Shipping & Logistics</option>
                <option value="returns">Returns & Refunds</option>
                <option value="payments">Payments & Wallet</option>
                <option value="security">Account Security</option>
                <option value="platform_rules">Platform Rules</option>
              </select>
            </div>
          </div>

          {/* Articles List */}
          <div className="bg-gradient-to-br from-white/80 to-red-50/20 dark:from-gray-900/50 dark:to-red-900/10 rounded-xl border border-red-100 dark:border-red-500/20 overflow-hidden shadow-sm">
            {isLoadingArticles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-400" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading articles...</span>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12 px-4">
                <BookOpen className="w-16 h-16 mx-auto text-red-300 dark:text-red-500/50 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">No articles found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  {kbSearchQuery || kbCategory !== 'all' 
                    ? 'Try adjusting your search or category filter'
                    : 'The knowledge base is currently empty. Articles will appear here once they are published by administrators.'}
                </p>
                {(kbSearchQuery || kbCategory !== 'all') ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setKbSearchQuery('');
                      setKbCategory('all');
                    }}
                    className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-700/50 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <div className="mt-4 p-4 bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-900/10 dark:to-orange-900/10 rounded-lg border border-red-100 dark:border-red-500/20">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      💡 <strong>Tip:</strong> If you need help, you can create a support ticket by clicking "New Ticket" above.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-red-100 dark:divide-red-500/20">
                {articles.map((article) => (
                  <div
                    key={article._id}
                    onClick={() => fetchArticle(article._id)}
                    className="p-4 hover:bg-red-50/50 dark:hover:bg-red-900/10 cursor-pointer transition-colors border-l-4 border-transparent hover:border-red-300 dark:hover:border-red-500/50"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{article.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{article.content}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {article.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {article.helpfulCount} helpful
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="space-y-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700/30 overflow-hidden">
            {disputes.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No disputes found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {disputes.map((dispute) => (
                  <div
                    key={dispute._id}
                    onClick={() => {
                      setSelectedDispute(dispute);
                      setShowDisputeModal(true);
                    }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{dispute.reason}</h3>
                          <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {dispute.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{dispute.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{dispute.disputeNumber}</span>
                          <span>{formatDate(dispute.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Health Tab */}
      {activeTab === 'health' && accountHealth && (
        <div className="space-y-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Account Health Dashboard</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Order Defect Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{accountHealth.metrics.orderDefectRate}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Late Shipment Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{accountHealth.metrics.lateShipmentRate}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cancellation Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{accountHealth.metrics.cancellationRate}%</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Policy Violations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{accountHealth.metrics.policyViolations}</p>
              </div>
            </div>

            {accountHealth.recommendations.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Recommendations:</p>
                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                  {accountHealth.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700/30 overflow-hidden">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div key={notification._id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/40">
                        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{notification.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDate(notification.createdAt)}</span>
                          {notification.actionRequired && (
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">Action Required</span>
                          )}
                        </div>
                        {notification.actionUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => window.location.href = notification.actionUrl!}
                          >
                            {notification.actionText || 'Take Action'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Tab */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <Headphones className="w-8 h-8 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Live Chat Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Chat with our support team during business hours</p>
            <Button 
              onClick={() => setShowChatModal(true)}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              Start Chat
            </Button>
          </div>
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <Mail className="w-8 h-8 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Email Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Send us an email and we'll respond within 24 hours</p>
            <a href="mailto:support@reaglex.com" className="block">
              <Button variant="outline" className="w-full">support@reaglex.com</Button>
            </a>
          </div>
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <Phone className="w-8 h-8 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Emergency Contact</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">For critical issues requiring immediate attention</p>
            <Button variant="outline" className="w-full">Request Callback</Button>
          </div>
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30">
            <Lock className="w-8 h-8 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Security & Privacy</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Learn how we handle your data and protect your privacy</p>
            <Button variant="outline" className="w-full">View Privacy Policy</Button>
          </div>
        </div>
      )}

      {/* Tickets List - Only show in tickets tab */}
      {activeTab === 'tickets' && (
        <>
          {/* Filters and Search */}
          <div className="bg-gradient-to-r from-white/80 to-red-50/30 dark:from-gray-900/50 dark:to-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-500/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_customer">Waiting</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="account">Account</option>
                <option value="product">Product</option>
                <option value="payout">Payout</option>
                <option value="verification">Verification</option>
                <option value="other">Other</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="updatedAt">Last Updated</option>
                <option value="createdAt">Created Date</option>
                <option value="priority">Priority</option>
              </select>
            </div>
          </div>

          {/* Tickets List */}
          <div className="bg-gradient-to-br from-white/80 to-red-50/20 dark:from-gray-900/50 dark:to-red-900/10 rounded-xl border border-red-100 dark:border-red-500/20 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <LifeBuoy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Ticket
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setShowDetailModal(true);
                  fetchTicket(ticket._id);
                }}
                className="p-4 hover:bg-red-50/50 dark:hover:bg-red-900/10 cursor-pointer transition-colors border-l-4 border-transparent hover:border-red-300 dark:hover:border-red-500/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-gray-500">{getCategoryIcon(ticket.category)}</div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {ticket.subject}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {ticket.ticketNumber}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {ticket.messages?.length || 0} messages
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(ticket.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        </>
      )}

      {/* Create Ticket Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="account">Account</option>
                  <option value="product">Product</option>
                  <option value="payout">Payout</option>
                  <option value="verification">Verification</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Please provide detailed information about your issue..."
                rows={6}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attachments
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileSelect(e, false)}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Attach Files
              </Button>
              {newTicket.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {newTicket.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index, false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTicket}
                disabled={isCreating}
                className="bg-red-500 hover:bg-red-600"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ticket
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(selectedTicket.category)}
                      {selectedTicket.subject}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(selectedTicket.status)}
                      {getPriorityBadge(selectedTicket.priority)}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedTicket.ticketNumber}
                      </span>
                    </div>
                  </div>
                  {selectedTicket.status === 'resolved' && !selectedTicket.satisfactionRating && (
                    <Button
                      onClick={() => setShowSatisfactionModal(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Rate Experience
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {/* Messages */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedTicket.messages?.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        msg.senderRole === 'seller'
                          ? 'bg-gray-50 dark:bg-gray-900/20 ml-8'
                          : 'bg-gray-50 dark:bg-gray-800/50 mr-8'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            {msg.senderName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({msg.senderRole})
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {msg.message}
                      </p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.attachments.map((att, attIndex) => (
                            <a
                              key={attIndex}
                              href={`http://localhost:5000${att}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:underline"
                            >
                              <Download className="w-4 h-4" />
                              {att.split('/').pop()}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="space-y-3">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message..."
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            ref={messageFileInputRef}
                            type="file"
                            multiple
                            onChange={(e) => handleFileSelect(e, true)}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => messageFileInputRef.current?.click()}
                          >
                            <Paperclip className="w-4 h-4 mr-2" />
                            Attach
                          </Button>
                          {messageAttachments.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {messageAttachments.length} file(s) selected
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={handleSendMessage}
                          disabled={isSending || (!messageText.trim() && messageAttachments.length === 0)}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {isSending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    {selectedTicket.status !== 'closed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedTicket._id, 'closed')}
                      >
                        Close Ticket
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Satisfaction Modal */}
      <Dialog open={showSatisfactionModal} onOpenChange={setShowSatisfactionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How would you rate your experience?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSatisfaction({ ...satisfaction, rating })}
                    className={`p-2 rounded ${
                      satisfaction.rating >= rating
                        ? 'bg-gray-400 text-gray-900'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    <Star className="w-6 h-6" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Feedback (Optional)
              </label>
              <textarea
                value={satisfaction.feedback}
                onChange={(e) => setSatisfaction({ ...satisfaction, feedback: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Tell us more about your experience..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSatisfactionModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitSatisfaction}
                className="bg-red-500 hover:bg-red-600"
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Knowledge Article Modal */}
      <Dialog open={showArticleModal} onOpenChange={setShowArticleModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedArticle.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedArticle.content}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedArticle.views} views
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      {selectedArticle.helpfulCount} found helpful
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => submitArticleFeedback(selectedArticle._id, true)}
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Helpful
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => submitArticleFeedback(selectedArticle._id, false)}
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Not Helpful
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispute Detail Modal */}
      <Dialog open={showDisputeModal} onOpenChange={setShowDisputeModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedDispute && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-gray-500" />
                  Dispute: {selectedDispute.disputeNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Reason</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedDispute.reason}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedDispute.description}</p>
                </div>
                {selectedDispute.sellerResponse && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Your Response</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedDispute.sellerResponse}</p>
                  </div>
                )}
                {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'approved' && selectedDispute.status !== 'rejected' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Submit Response</h4>
                    <textarea
                      value={disputeResponse}
                      onChange={(e) => setDisputeResponse(e.target.value)}
                      placeholder="Enter your response to this dispute..."
                      rows={6}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
                    />
                    <Button
                      onClick={submitDisputeResponse}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      Submit Response
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Live Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="w-5 h-5" />
              Live Chat Support
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col min-h-[400px]">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      msg.sender === 'user'
                        ? 'bg-red-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Input Area */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && chatMessage.trim()) {
                    handleSendChatMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <Button
                onClick={handleSendChatMessage}
                disabled={!chatMessage.trim()}
                className="bg-red-500 hover:bg-red-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportCenter;
