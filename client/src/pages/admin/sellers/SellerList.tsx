import React, { useState, useMemo, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../../lib/api';
import { useToastStore } from '../../../stores/toastStore';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Store,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Ban,
  X,
  Trash2,
  MessageSquare,
  MoreVertical,
  Download,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Users,
  UserPlus,
  Settings,
  Loader2,
  Edit,
  Power,
  PowerOff,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  ChevronLeft,
  ShoppingBag,
  FileText,
  ExternalLink,
} from 'lucide-react';

type SellerStatus = 'active' | 'pending' | 'suspended' | 'rejected' | 'banned' | 'warned' | 'inactive';
type KycStatus = 'verified' | 'pending' | 'rejected';

interface Seller {
  id: string;
  sellerName: string;
  storeName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  status: SellerStatus;
  kycStatus: KycStatus;
  totalProducts: number;
  totalOrders: number;
  earnings: number;
  joinDate: string;
  country: string;
  hasDisputes: boolean;
  hasPayoutIssues: boolean;
  userId?: string;
  warningCount?: number;
}

interface SellerStats {
  totalSellers: number;
  avgProductsPerSeller: number;
  pendingSellers: number;
  sellersWithIssues: number;
  sellerChange: number;
}

interface SellerListProps {
  onViewSeller: (sellerId: string) => void;
}

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

// Helper to resolve document/file URL (handles both full URLs and relative paths)
const resolveDocumentUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it's a relative path, prepend the API host
  const API_HOST = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return `${API_HOST}${url.startsWith('/') ? url : '/' + url}`;
};

// StatCard component
function StatCard({ icon: Icon, label, value, helper, tone = 'neutral' }: {
  icon: any;
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const toneClasses = {
    neutral: 'text-gray-600 dark:text-gray-300',
    success: 'text-emerald-600 dark:text-emerald-300',
    warning: 'text-amber-600 dark:text-amber-300',
    danger: 'text-red-600 dark:text-red-300',
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${toneClasses[tone]}`}>{value}</p>
      {helper && <p className="text-xs text-gray-500 dark:text-gray-400">{helper}</p>}
    </div>
  );
}

// InputField component
function InputField({ label, value, onChange, placeholder, type = 'text', className = '', error }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  error?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 ${
          error ? 'border-red-500' : ''
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// SelectField component
function SelectField({ label, value, onChange, options, className = '' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SellerList({ onViewSeller }: SellerListProps) {
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SellerStatus | 'all'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sellerRows, setSellerRows] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageLimit] = useState(10);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [addSellerOpen, setAddSellerOpen] = useState(false);
  const [newSeller, setNewSeller] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    accountStatus: 'active' as SellerStatus,
    sellerVerificationStatus: 'pending' as 'pending' | 'approved' | 'rejected',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [viewSellerModal, setViewSellerModal] = useState<{ open: boolean; sellerData: any | null }>({
    open: false,
    sellerData: null,
  });
  const [editSellerModal, setEditSellerModal] = useState<{ open: boolean; seller: Seller | null }>({
    open: false,
    seller: null,
  });
  const [warnConfirmModal, setWarnConfirmModal] = useState<{ open: boolean; seller: Seller | null }>({
    open: false,
    seller: null,
  });
  const [toggleActiveModal, setToggleActiveModal] = useState<{ open: boolean; seller: Seller | null; action: 'activate' | 'deactivate' }>({
    open: false,
    seller: null,
    action: 'activate',
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; seller: Seller | null }>({
    open: false,
    seller: null,
  });
  const [approveConfirmModal, setApproveConfirmModal] = useState<{ open: boolean; seller: Seller | null }>({
    open: false,
    seller: null,
  });
  const [rejectReasonModal, setRejectReasonModal] = useState<{ open: boolean; sellerId: string | null; reason: string }>({
    open: false,
    sellerId: null,
    reason: '',
  });
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    accountStatus: 'active' as SellerStatus,
    sellerVerificationStatus: 'pending' as 'pending' | 'approved' | 'rejected',
    password: '',
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger',
  });

  // Load seller statistics
  const loadSellerStats = async () => {
    try {
      setStatsLoading(true);
      const stats = await adminAPI.getSellerStats();
      setSellerStats(stats);
    } catch (err: any) {
      console.error('Failed to load seller stats:', err);
      showToast(`Failed to load seller statistics: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  // Load sellers data from API
  useEffect(() => {
    loadSellers();
    loadSellerStats();
  }, []);

  const loadSellers = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getSellers({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        verificationStatus: verificationFilter !== 'all' ? verificationFilter : undefined,
        search: searchQuery || undefined,
        page: page,
        limit: pageLimit,
      });
      setSellerRows(response.sellers);
      setTotalPages(response.pagination.totalPages);
      setTotalRecords(response.pagination.total);
      setCurrentPage(response.pagination.page);
    } catch (err: any) {
      console.error('Failed to load sellers:', err);
      setError(err.message || 'Failed to load sellers');
      setSellerRows([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  // Reload sellers when search or filters change (with debounce for search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      loadSellers(1);
    }, searchQuery ? 500 : 0);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, statusFilter, verificationFilter]);

  const filteredSellers = useMemo(() => {
    // Client-side filtering for additional refinement if needed
    return sellerRows.filter((seller) => {
      const matchesQuery =
        !searchQuery ||
        seller.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || seller.status === statusFilter;
      const matchesVerification = verificationFilter === 'all' || seller.kycStatus === verificationFilter;
      return matchesQuery && matchesStatus && matchesVerification;
    });
  }, [searchQuery, statusFilter, verificationFilter, sellerRows]);

  // Handler functions
  const handleViewSeller = async (seller: Seller) => {
    if (!seller.userId) {
      showToast('Seller ID not available. Please refresh the page.', 'error');
      return;
    }
    try {
      setActionLoading(seller.id);
      const response = await adminAPI.getSellerDetails(seller.userId);
      setViewSellerModal({ open: true, sellerData: response.seller });
    } catch (err: any) {
      console.error('Failed to load seller details:', err);
      showToast(`Failed to load seller details: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWarnSeller = (seller: Seller) => {
    setWarnConfirmModal({ open: true, seller });
  };

  const handleToggleActive = (seller: Seller) => {
    const isActive = seller.status === 'active';
    setToggleActiveModal({ open: true, seller, action: isActive ? 'deactivate' : 'activate' });
  };

  const handleEditSeller = (seller: Seller) => {
    setEditFormData({
      fullName: seller.sellerName,
      email: seller.email,
      phone: seller.phone,
      location: seller.country !== 'N/A' ? seller.country : '',
      accountStatus: seller.status,
      sellerVerificationStatus: seller.kycStatus === 'verified' ? 'approved' : seller.kycStatus === 'rejected' ? 'rejected' : 'pending',
      password: '',
    });
    setEditSellerModal({ open: true, seller });
  };

  const handleDeleteSeller = (seller: Seller) => {
    setDeleteConfirmModal({ open: true, seller });
  };

  const handleApproveSeller = (seller: Seller) => {
    setApproveConfirmModal({ open: true, seller });
  };

  const confirmWarnSeller = async () => {
    if (!warnConfirmModal.seller?.userId) return;
    try {
      setActionLoading(warnConfirmModal.seller.id);
      await adminAPI.updateSellerStatus(warnConfirmModal.seller.userId, 'warned');
      showToast(`Seller ${warnConfirmModal.seller.sellerName} has been warned.`, 'success');
      setWarnConfirmModal({ open: false, seller: null });
      loadSellers();
      loadSellerStats();
    } catch (err: any) {
      console.error('Failed to warn seller:', err);
      showToast(`Failed to warn seller: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmToggleActive = async () => {
    if (!toggleActiveModal.seller?.userId) return;
    try {
      setActionLoading(toggleActiveModal.seller.id);
      const newStatus = toggleActiveModal.action === 'activate' ? 'active' : 'inactive';
      await adminAPI.updateSellerStatus(toggleActiveModal.seller.userId, newStatus);
      showToast(`Seller ${toggleActiveModal.seller.sellerName} has been ${toggleActiveModal.action}d.`, 'success');
      setToggleActiveModal({ open: false, seller: null, action: 'activate' });
      loadSellers();
      loadSellerStats();
    } catch (err: any) {
      console.error('Failed to toggle seller status:', err);
      showToast(`Failed to ${toggleActiveModal.action} seller: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmApproveSeller = async () => {
    if (!approveConfirmModal.seller?.userId) return;
    try {
      setActionLoading(approveConfirmModal.seller.id);
      await adminAPI.updateSellerStatus(approveConfirmModal.seller.userId, 'active', 'approved');
      showToast(`Seller ${approveConfirmModal.seller.sellerName} has been approved.`, 'success');
      setApproveConfirmModal({ open: false, seller: null });
      loadSellers();
      loadSellerStats();
    } catch (err: any) {
      console.error('Failed to approve seller:', err);
      showToast(`Failed to approve seller: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDeleteSeller = async () => {
    if (!deleteConfirmModal.seller?.userId) return;
    try {
      setActionLoading(deleteConfirmModal.seller.id);
      await adminAPI.deleteSeller(deleteConfirmModal.seller.userId);
      showToast(`Seller ${deleteConfirmModal.seller.sellerName} has been deleted.`, 'success');
      setDeleteConfirmModal({ open: false, seller: null });
      loadSellers();
      loadSellerStats();
    } catch (err: any) {
      console.error('Failed to delete seller:', err);
      showToast(`Failed to delete seller: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSeller = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editSellerModal.seller?.userId) return;

    const errors: Record<string, string> = {};
    if (!editFormData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!editFormData.email.trim()) errors.email = 'Email is required';
    if (!editFormData.email.includes('@')) errors.email = 'Invalid email format';
    if (Object.keys(errors).length) {
      setEditFormErrors(errors);
      return;
    }

    try {
      setActionLoading(editSellerModal.seller.id);
      await adminAPI.updateSeller(editSellerModal.seller.userId, {
        fullName: editFormData.fullName.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        location: editFormData.location.trim(),
        accountStatus: editFormData.accountStatus,
        sellerVerificationStatus: editFormData.sellerVerificationStatus,
        password: editFormData.password.trim() || undefined,
      });
      showToast(`Seller ${editFormData.fullName} has been updated successfully.`, 'success');
      setEditSellerModal({ open: false, seller: null });
      loadSellers();
      loadSellerStats();
    } catch (err: any) {
      console.error('Failed to update seller:', err);
      showToast(`Failed to update seller: ${err.message || 'Unknown error'}`, 'error');
      if (err.message?.includes('email')) {
        setEditFormErrors({ email: 'Email is already taken' });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddSeller = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!newSeller.fullName.trim()) errors.fullName = 'Full name is required';
    if (!newSeller.email.trim()) errors.email = 'Email is required';
    if (!newSeller.email.includes('@')) errors.email = 'Invalid email format';
    if (!newSeller.password.trim()) errors.password = 'Password is required';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    try {
      setActionLoading('add-seller');
      await adminAPI.createSeller({
        fullName: newSeller.fullName.trim(),
        email: newSeller.email.trim(),
        phone: newSeller.phone.trim() || undefined,
        location: newSeller.location.trim(),
        accountStatus: newSeller.accountStatus,
        sellerVerificationStatus: newSeller.sellerVerificationStatus,
        password: newSeller.password.trim(),
      });
      showToast(`Seller ${newSeller.fullName} has been created successfully.`, 'success');
      setAddSellerOpen(false);
      resetForm();
      loadSellers();
      loadSellerStats();
    } catch (err: any) {
      console.error('Failed to create seller:', err);
      showToast(`Failed to create seller: ${err.message || 'Unknown error'}`, 'error');
      if (err.message?.includes('email')) {
        setFormErrors({ email: 'Email is already taken' });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const resetForm = () => {
    setNewSeller({
      fullName: '',
      email: '',
      phone: '',
      location: '',
      accountStatus: 'active',
      sellerVerificationStatus: 'pending',
      password: '',
    });
    setFormErrors({});
  };

  const handleResetPassword = (sellerId: string) => {
    // TODO: Implement reset password functionality
    console.log('Reset password for seller:', sellerId);
    setOpenDropdownId(null);
    showToast(`Password reset link sent to seller ${sellerId}!`, 'success');
  };

  const handleSendWarning = (sellerId: string) => {
    // TODO: Implement send warning functionality
    console.log('Send warning to seller:', sellerId);
    setOpenDropdownId(null);
    showToast(`Warning sent to seller ${sellerId}!`, 'warning');
  };

  const getStatusBadge = (status: SellerStatus) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      rejected: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      banned: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
      warned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status] || styles.pending}`}>
        {status}
      </span>
    );
  };

  const getKycBadge = (kyc: KycStatus) => {
    const styles = {
      verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[kyc]}`}>
        {kyc}
      </span>
    );
  };

  // Helper function to get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Sellers • Management</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seller Store Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Approve, manage, and monitor seller stores across the platform
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSyncModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-emerald-400"
          >
            <Settings className="h-4 w-4" /> Sync Directory
          </button>
          <button
            onClick={() => {
              resetForm();
              setAddSellerOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-emerald-400"
          >
            <UserPlus className="h-4 w-4" /> Add Seller
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <section className="grid gap-4 lg:grid-cols-4">
        {statsLoading ? (
          <div className="col-span-4 flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading statistics...</span>
          </div>
        ) : sellerStats ? (
          <>
            <StatCard
              icon={Store}
              label="Total Sellers"
              value={sellerStats.totalSellers.toLocaleString()}
              helper={`${sellerStats.sellerChange >= 0 ? '+' : ''}${sellerStats.sellerChange.toFixed(1)}% vs last month`}
              tone={sellerStats.sellerChange >= 0 ? 'success' : 'danger'}
            />
            <StatCard
              icon={Package}
              label="Avg Products / Seller"
              value={sellerStats.avgProductsPerSeller.toFixed(1)}
              helper="Average across all sellers"
            />
            <StatCard
              icon={UserCheck}
              label="Pending Approval"
              value={sellerStats.pendingSellers.toLocaleString()}
              helper="Need review"
              tone={sellerStats.pendingSellers > 0 ? 'warning' : 'neutral'}
            />
            <StatCard
              icon={AlertTriangle}
              label="With Issues"
              value={sellerStats.sellersWithIssues.toLocaleString()}
              helper="Disputes or tickets"
              tone={sellerStats.sellersWithIssues > 0 ? 'warning' : 'neutral'}
            />
          </>
        ) : (
          <div className="col-span-4 text-center text-gray-500 dark:text-gray-400 py-8">
            Failed to load statistics.
          </div>
        )}
      </section>

      {/* Search and Filters */}
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Search by seller name, store, email, or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${
                statusFilter === 'all'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400 dark:text-emerald-300'
                  : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setStatusFilter('all')}
            >
              <Filter className="h-4 w-4" /> All Status
            </button>
            <button
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${
                statusFilter === 'active'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400 dark:text-emerald-300'
                  : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${
                statusFilter === 'pending'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:border-amber-400 dark:text-amber-300'
                  : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${
                verificationFilter === 'pending'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:border-amber-400 dark:text-amber-300'
                  : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setVerificationFilter('pending')}
            >
              Pending Approval
            </button>
            <button
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold ${
                statusFilter === 'inactive'
                  ? 'border-gray-500 bg-gray-500/10 text-gray-600 dark:border-gray-400 dark:text-gray-300'
                  : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setStatusFilter('inactive')}
            >
              Inactive
            </button>
          </div>
        </div>
      </section>

      {/* Main Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Store Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">KYC</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Earnings</th>
                <th className="px-4 py-3">Join Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading sellers...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                  </td>
                </tr>
              ) : filteredSellers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center">
                    <p className="text-gray-600 dark:text-gray-400">No sellers found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredSellers.map((seller) => (
                  <tr
                    key={seller.id}
                    className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60"
                  >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {seller.avatarUrl ? (
                        <img
                          src={resolveAvatarUrl(seller.avatarUrl) || ''}
                          alt={seller.sellerName}
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 ${
                          seller.avatarUrl ? 'hidden' : ''
                        }`}
                        style={{ display: seller.avatarUrl ? 'none' : 'flex' }}
                      >
                        {getInitials(seller.sellerName)}
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{seller.sellerName}</p>
                        <p className="text-xs text-gray-500">{seller.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{seller.storeName}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{seller.email}</td>
                  <td className="px-4 py-4">{getStatusBadge(seller.status)}</td>
                  <td className="px-4 py-4">{getKycBadge(seller.kycStatus)}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{seller.totalProducts}</td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{seller.totalOrders}</td>
                  <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                    ${seller.earnings.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(seller.joinDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewSeller(seller)}
                        disabled={actionLoading === seller.id}
                        className="rounded-full border border-gray-200 p-2 text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                        title="View seller"
                      >
                        {actionLoading === seller.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditSeller(seller)}
                        disabled={actionLoading === seller.id}
                        className="rounded-full border border-gray-200 p-2 text-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-400 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                        title="Edit seller"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {seller.kycStatus === 'pending' && (
                        <button
                          onClick={() => handleApproveSeller(seller)}
                          disabled={actionLoading === seller.id}
                          className="rounded-full border border-gray-200 p-2 text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                          title="Approve seller"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleWarnSeller(seller)}
                        disabled={actionLoading === seller.id}
                        className="rounded-full border border-gray-200 p-2 text-gray-600 hover:border-orange-400 hover:bg-orange-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-orange-400 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
                        title="Warn seller"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(seller)}
                        disabled={actionLoading === seller.id}
                        className="rounded-full border border-gray-200 p-2 text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        title={seller.status === 'active' ? 'Deactivate seller' : 'Activate seller'}
                      >
                        {seller.status === 'active' ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteSeller(seller)}
                        disabled={actionLoading === seller.id}
                        className="rounded-full border border-gray-200 p-2 text-gray-600 hover:border-red-400 hover:bg-red-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-400 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Delete seller"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-xl">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((currentPage - 1) * pageLimit) + 1} to {Math.min(currentPage * pageLimit, totalRecords)} of {totalRecords} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadSellers(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => loadSellers(pageNum)}
                      disabled={loading}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        currentPage === pageNum
                          ? 'bg-emerald-500 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => loadSellers(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Seller Modal */}
      {viewSellerModal.open && viewSellerModal.sellerData && (
        <Dialog open={viewSellerModal.open} onOpenChange={(open) => setViewSellerModal({ open, sellerData: null })}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Seller Profile & Verification</span>
                {viewSellerModal.sellerData.verificationStatus === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!viewSellerModal.sellerData.id) return;
                        try {
                          setActionLoading('approve-from-view');
                          await adminAPI.updateSellerStatus(viewSellerModal.sellerData.id, 'active', 'approved');
                          showToast('Seller approved successfully!', 'success');
                          setViewSellerModal({ open: false, sellerData: null });
                          loadSellers();
                          loadSellerStats();
                        } catch (err: any) {
                          showToast(`Failed to approve seller: ${err.message || 'Unknown error'}`, 'error');
                        } finally {
                          setActionLoading(null);
                        }
                      }}
                      disabled={actionLoading === 'approve-from-view'}
                      className="bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      {actionLoading === 'approve-from-view' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectReasonModal({ open: true, sellerId: viewSellerModal.sellerData.id });
                      }}
                      className="bg-red-500 text-white hover:bg-red-600"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </DialogTitle>
              <DialogDescription>Review seller profile and business documents for verification</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Seller Basic Info */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Basic Information</h4>
                <div className="flex items-center gap-4">
                  {viewSellerModal.sellerData.avatarUrl ? (
                    <img
                      src={resolveAvatarUrl(viewSellerModal.sellerData.avatarUrl) || ''}
                      alt={viewSellerModal.sellerData.sellerName}
                      className="h-20 w-20 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`h-20 w-20 rounded-full flex items-center justify-center text-lg font-semibold text-white bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 ${
                      viewSellerModal.sellerData.avatarUrl ? 'hidden' : ''
                    }`}
                    style={{ display: viewSellerModal.sellerData.avatarUrl ? 'none' : 'flex' }}
                  >
                    {getInitials(viewSellerModal.sellerData.sellerName)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {viewSellerModal.sellerData.sellerName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{viewSellerModal.sellerData.storeName}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Mail className="h-4 w-4" /> {viewSellerModal.sellerData.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {viewSellerModal.sellerData.location || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-sm">{getStatusBadge(viewSellerModal.sellerData.status)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Verification</p>
                    <p className="text-sm">{getKycBadge(viewSellerModal.sellerData.verificationStatus === 'approved' ? 'verified' : viewSellerModal.sellerData.verificationStatus === 'rejected' ? 'rejected' : 'pending')}</p>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              {(viewSellerModal.sellerData.businessName || viewSellerModal.sellerData.businessType || viewSellerModal.sellerData.taxId) && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                  <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Business Information</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {viewSellerModal.sellerData.businessName && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Business Name</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{viewSellerModal.sellerData.businessName}</p>
                      </div>
                    )}
                    {viewSellerModal.sellerData.businessType && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Business Type</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{viewSellerModal.sellerData.businessType}</p>
                      </div>
                    )}
                    {viewSellerModal.sellerData.taxId && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tax ID</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{viewSellerModal.sellerData.taxId}</p>
                      </div>
                    )}
                    {viewSellerModal.sellerData.registrationNumber && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Registration Number</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{viewSellerModal.sellerData.registrationNumber}</p>
                      </div>
                    )}
                    {viewSellerModal.sellerData.businessAddress && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Business Address</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {[
                            viewSellerModal.sellerData.businessAddress.street,
                            viewSellerModal.sellerData.businessAddress.city,
                            viewSellerModal.sellerData.businessAddress.state,
                            viewSellerModal.sellerData.businessAddress.zipCode,
                            viewSellerModal.sellerData.businessAddress.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verification Documents */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Business Documents</h4>
                {viewSellerModal.sellerData.verificationDocuments ? (
                  <div className="space-y-3">
                    {viewSellerModal.sellerData.verificationDocuments.businessLicense && (
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-emerald-500" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Business License</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {viewSellerModal.sellerData.verificationDocuments.uploadedAt
                                ? `Uploaded ${new Date(viewSellerModal.sellerData.verificationDocuments.uploadedAt).toLocaleDateString()}`
                                : 'No upload date'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.businessLicense) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                            onClick={(e) => {
                              // Prevent download, force view in new tab
                              e.preventDefault();
                              const url = resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.businessLicense);
                              if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </a>
                          <a
                            href={resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.businessLicense) || '#'}
                            download
                            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </div>
                      </div>
                    )}
                    {viewSellerModal.sellerData.verificationDocuments.isoCert && (
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-emerald-500" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">ISO Certification</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {viewSellerModal.sellerData.verificationDocuments.uploadedAt
                                ? `Uploaded ${new Date(viewSellerModal.sellerData.verificationDocuments.uploadedAt).toLocaleDateString()}`
                                : 'No upload date'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.isoCert) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                            onClick={(e) => {
                              // Prevent download, force view in new tab
                              e.preventDefault();
                              const url = resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.isoCert);
                              if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </a>
                          <a
                            href={resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.isoCert) || '#'}
                            download
                            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </div>
                      </div>
                    )}
                    {viewSellerModal.sellerData.verificationDocuments.auditReport && (
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-emerald-500" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Audit Report</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {viewSellerModal.sellerData.verificationDocuments.uploadedAt
                                ? `Uploaded ${new Date(viewSellerModal.sellerData.verificationDocuments.uploadedAt).toLocaleDateString()}`
                                : 'No upload date'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.auditReport) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                            onClick={(e) => {
                              // Prevent download, force view in new tab
                              e.preventDefault();
                              const url = resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.auditReport);
                              if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </a>
                          <a
                            href={resolveDocumentUrl(viewSellerModal.sellerData.verificationDocuments.auditReport) || '#'}
                            download
                            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </div>
                      </div>
                    )}
                    {!viewSellerModal.sellerData.verificationDocuments.businessLicense &&
                      !viewSellerModal.sellerData.verificationDocuments.isoCert &&
                      !viewSellerModal.sellerData.verificationDocuments.auditReport && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No business documents uploaded yet.
                        </p>
                      )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No business documents uploaded yet.
                  </p>
                )}
              </div>

              {/* Verification Status Details */}
              {viewSellerModal.sellerData.verificationStatusDetails && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                  <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Verification History</h4>
                  <div className="space-y-2 text-sm">
                    {viewSellerModal.sellerData.verificationStatusDetails.verifiedAt && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Verified At</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(viewSellerModal.sellerData.verificationStatusDetails.verifiedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {viewSellerModal.sellerData.verificationStatusDetails.rejectedAt && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Rejected At</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(viewSellerModal.sellerData.verificationStatusDetails.rejectedAt).toLocaleString()}
                        </p>
                        {viewSellerModal.sellerData.verificationStatusDetails.rejectionReason && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            Reason: {viewSellerModal.sellerData.verificationStatusDetails.rejectionReason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Statistics</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Join Date</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> {new Date(viewSellerModal.sellerData.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Products</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Package className="h-4 w-4" /> {viewSellerModal.sellerData.totalProducts}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" /> {viewSellerModal.sellerData.totalOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Earnings</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> ${viewSellerModal.sellerData.earnings.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Disputes</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{viewSellerModal.sellerData.disputes || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Support Tickets</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{viewSellerModal.sellerData.tickets || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Reason Modal */}
      {rejectReasonModal.open && (
        <Dialog open={rejectReasonModal.open} onOpenChange={(open) => setRejectReasonModal({ open, sellerId: null, reason: '' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Seller Verification</DialogTitle>
              <DialogDescription>Provide a reason for rejecting this seller's verification</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectReasonModal.reason}
                  onChange={(e) => setRejectReasonModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 focus:border-red-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  rows={4}
                  placeholder="Enter the reason for rejection..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRejectReasonModal({ open: false, sellerId: null, reason: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!rejectReasonModal.sellerId) return;
                  try {
                    setActionLoading('reject-from-view');
                    await adminAPI.updateSellerStatus(rejectReasonModal.sellerId, undefined, 'rejected', rejectReasonModal.reason);
                    showToast('Seller verification rejected.', 'success');
                    setRejectReasonModal({ open: false, sellerId: null, reason: '' });
                    setViewSellerModal({ open: false, sellerData: null });
                    loadSellers();
                    loadSellerStats();
                  } catch (err: any) {
                    showToast(`Failed to reject seller: ${err.message || 'Unknown error'}`, 'error');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                disabled={actionLoading === 'reject-from-view' || !rejectReasonModal.reason.trim()}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                {actionLoading === 'reject-from-view' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Verification'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Seller Modal */}
      {addSellerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => {
            setAddSellerOpen(false);
            resetForm();
          }}
          role="presentation"
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setAddSellerOpen(false);
                resetForm();
              }}
              className="absolute right-4 top-4 z-10 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-6 flex-shrink-0 px-6 pt-6">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Create</p>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Add seller profile</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create a new seller account on the platform.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full">
              <form id="add-seller-form" className="space-y-5 pb-4" onSubmit={handleAddSeller}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Full name"
                    value={newSeller.fullName}
                    onChange={(value) => setNewSeller((prev) => ({ ...prev, fullName: value }))}
                    placeholder="e.g. John Doe"
                    error={formErrors.fullName}
                  />
                  <InputField
                    label="Email address"
                    value={newSeller.email}
                    onChange={(value) => setNewSeller((prev) => ({ ...prev, email: value }))}
                    placeholder="seller@domain.com"
                    type="email"
                    error={formErrors.email}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Location"
                    value={newSeller.location}
                    onChange={(value) => setNewSeller((prev) => ({ ...prev, location: value }))}
                    placeholder="e.g. Kigali, Rwanda"
                  />
                  <InputField
                    label="Password"
                    value={newSeller.password}
                    onChange={(value) => setNewSeller((prev) => ({ ...prev, password: value }))}
                    type="password"
                    placeholder="Set initial password"
                    error={formErrors.password}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Account status"
                    value={newSeller.accountStatus}
                    onChange={(value) => setNewSeller((prev) => ({ ...prev, accountStatus: value as SellerStatus }))}
                    options={[
                      { label: 'Active', value: 'active' },
                      { label: 'Pending', value: 'pending' },
                      { label: 'Inactive', value: 'inactive' },
                    ]}
                  />
                  <SelectField
                    label="Verification status"
                    value={newSeller.sellerVerificationStatus}
                    onChange={(value) => setNewSeller((prev) => ({ ...prev, sellerVerificationStatus: value as 'pending' | 'approved' | 'rejected' }))}
                    options={[
                      { label: 'Pending', value: 'pending' },
                      { label: 'Approved', value: 'approved' },
                      { label: 'Rejected', value: 'rejected' },
                    ]}
                  />
                </div>
              </form>
            </div>
            <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This seller will appear immediately in the seller grid once saved.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAddSellerOpen(false);
                      resetForm();
                    }}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="add-seller-form"
                    disabled={actionLoading === 'add-seller'}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 disabled:opacity-50"
                  >
                    {actionLoading === 'add-seller' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        Creating...
                      </>
                    ) : (
                      'Save seller'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Seller Modal */}
      {editSellerModal.open && editSellerModal.seller && (
        <Dialog open={editSellerModal.open} onOpenChange={(open) => setEditSellerModal({ open, seller: null })}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Seller</DialogTitle>
              <DialogDescription>Update seller information</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateSeller} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Full name"
                  value={editFormData.fullName}
                  onChange={(value) => setEditFormData((prev) => ({ ...prev, fullName: value }))}
                  error={editFormErrors.fullName}
                />
                <InputField
                  label="Email"
                  value={editFormData.email}
                  onChange={(value) => setEditFormData((prev) => ({ ...prev, email: value }))}
                  type="email"
                  error={editFormErrors.email}
                />
                <InputField
                  label="Location"
                  value={editFormData.location}
                  onChange={(value) => setEditFormData((prev) => ({ ...prev, location: value }))}
                />
                <InputField
                  label="New Password (optional)"
                  value={editFormData.password}
                  onChange={(value) => setEditFormData((prev) => ({ ...prev, password: value }))}
                  type="password"
                  placeholder="Leave empty to keep current password"
                />
                <SelectField
                  label="Account status"
                  value={editFormData.accountStatus}
                  onChange={(value) => setEditFormData((prev) => ({ ...prev, accountStatus: value as SellerStatus }))}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Inactive', value: 'inactive' },
                    { label: 'Banned', value: 'banned' },
                    { label: 'Warned', value: 'warned' },
                    { label: 'Suspended', value: 'suspended' },
                  ]}
                />
                <SelectField
                  label="Verification status"
                  value={editFormData.sellerVerificationStatus}
                  onChange={(value) => setEditFormData((prev) => ({ ...prev, sellerVerificationStatus: value as 'pending' | 'approved' | 'rejected' }))}
                  options={[
                    { label: 'Pending', value: 'pending' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Rejected', value: 'rejected' },
                  ]}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditSellerModal({ open: false, seller: null })}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === editSellerModal.seller.id}>
                  {actionLoading === editSellerModal.seller.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Seller'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={warnConfirmModal.open}
        onClose={() => setWarnConfirmModal({ open: false, seller: null })}
        onConfirm={confirmWarnSeller}
        title="Warn Seller"
        message={`Are you sure you want to warn ${warnConfirmModal.seller?.sellerName}? This will increment their warning count.`}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={toggleActiveModal.open}
        onClose={() => setToggleActiveModal({ open: false, seller: null, action: 'activate' })}
        onConfirm={confirmToggleActive}
        title={toggleActiveModal.action === 'activate' ? 'Activate Seller' : 'Deactivate Seller'}
        message={`Are you sure you want to ${toggleActiveModal.action} ${toggleActiveModal.seller?.sellerName}?`}
        variant={toggleActiveModal.action === 'activate' ? 'info' : 'warning'}
      />

      <ConfirmDialog
        isOpen={approveConfirmModal.open}
        onClose={() => setApproveConfirmModal({ open: false, seller: null })}
        onConfirm={confirmApproveSeller}
        title="Approve Seller"
        message={`Are you sure you want to approve ${approveConfirmModal.seller?.sellerName}? This will verify their seller account.`}
        variant="success"
      />

      <ConfirmDialog
        isOpen={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false, seller: null })}
        onConfirm={confirmDeleteSeller}
        title="Delete Seller"
        message={`Are you sure you want to delete ${deleteConfirmModal.seller?.sellerName}? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}

