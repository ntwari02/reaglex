import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  ShoppingBag,
  CheckCircle,
  Mail,
  Phone,
  Settings,
  Shield,
  Zap,
  ChevronDown,
  Loader2,
  X,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Eye,
  ChevronLeft,
} from 'lucide-react';
import { resolveAssetUrl } from '@/lib/config';

type CustomerStatus = 'active' | 'banned' | 'pending' | 'warned' | 'inactive';
type KycStatus = 'verified' | 'pending' | 'rejected';
type StaffRole = 'Super Admin' | 'Operations' | 'Support' | 'Finance' | 'Catalog';

interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  status: CustomerStatus;
  kyc: KycStatus;
  orders: number;
  totalSpent: number;
  lastOrder: string;
  tickets: number;
  notes: string;
  userId?: string;
}

interface StaffRecord {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  lastActive: string;
  mfa: boolean;
  status: 'active' | 'locked';
}

interface SyncScope {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface SyncLog {
  timestamp: string;
  detail: string;
}

type NewCustomerForm = {
  name: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  kyc: KycStatus;
  orders: number;
  totalSpent: number;
  lastOrder: string;
  tickets: number;
  notes: string;
};


const staffMembers: StaffRecord[] = [
  {
    id: 'ADM-001',
    name: 'Brian Otieno',
    email: 'brian@reaglex.com',
    role: 'Operations',
    lastActive: '4m ago',
    mfa: true,
    status: 'active',
  },
  {
    id: 'ADM-008',
    name: 'Mei Chen',
    email: 'mei@reaglex.com',
    role: 'Finance',
    lastActive: 'Locked 1h ago',
    mfa: false,
    status: 'locked',
  },
  {
    id: 'ADM-014',
    name: 'Lamia Yusuf',
    email: 'lamia@reaglex.com',
    role: 'Support',
    lastActive: '19m ago',
    mfa: true,
    status: 'active',
  },
];

const permissionMatrix = [
  {
    module: 'Customers',
    permissions: { view: true, edit: true, delete: false, approve: false },
  },
  {
    module: 'Sellers',
    permissions: { view: true, edit: true, delete: true, approve: true },
  },
  {
    module: 'Products',
    permissions: { view: true, edit: true, delete: true, approve: true },
  },
  {
    module: 'Orders',
    permissions: { view: true, edit: true, delete: false, approve: true },
  },
  {
    module: 'Finance',
    permissions: { view: true, edit: false, delete: false, approve: true },
  },
  {
    module: 'Support',
    permissions: { view: true, edit: true, delete: false, approve: true },
  },
];

export default function UserManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'customers' | 'staff' | 'roles'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all');
  const [customerRows, setCustomerRows] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageLimit] = useState(10);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    kyc: 'pending',
    orders: 0,
    totalSpent: 0,
    lastOrder: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    tickets: 0,
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncScopes, setSyncScopes] = useState<SyncScope[]>([
    {
      id: 'customers',
      label: 'Customers',
      description: 'Status, orders, balances, and watch-lists',
      enabled: true,
    },
    {
      id: 'staff',
      label: 'Admins & staff',
      description: 'Accounts, MFA status, policy acknowledgements',
      enabled: true,
    },
    {
      id: 'roles',
      label: 'Roles & permissions',
      description: 'RBAC templates, overrides, escalations',
      enabled: true,
    },
  ]);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([
    { timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), detail: 'Ready to sync from MongoDB database' },
  ]);
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const tabMenuRef = useRef<HTMLDivElement | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewUserModal, setViewUserModal] = useState<{ open: boolean; userData: any | null }>({
    open: false,
    userData: null,
  });
  const [warnConfirmModal, setWarnConfirmModal] = useState<{ open: boolean; customer: CustomerRecord | null }>({
    open: false,
    customer: null,
  });
  const [toggleActiveModal, setToggleActiveModal] = useState<{ open: boolean; customer: CustomerRecord | null; action: 'activate' | 'deactivate' }>({
    open: false,
    customer: null,
    action: 'activate',
  });
  const [editUserModal, setEditUserModal] = useState<{ open: boolean; user: CustomerRecord | null }>({
    open: false,
    user: null,
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ open: boolean; customer: CustomerRecord | null }>({
    open: false,
    customer: null,
  });
  const [editFormData, setEditFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    role: 'buyer' | 'seller' | 'admin';
    location: string;
    accountStatus: CustomerStatus;
    password: string;
  }>({
    fullName: '',
    email: '',
    phone: '',
    role: 'buyer',
    location: '',
    accountStatus: 'active',
    password: '',
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [userStats, setUserStats] = useState<{
    totalCustomers: number;
    avgOrdersPerCustomer: number;
    riskAccounts: number;
    verifiedKYC: number;
    customerChange: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { showToast } = useToastStore();

  // Load user statistics
  const loadUserStats = async () => {
    try {
      setStatsLoading(true);
      const stats = await adminAPI.getUserStats();
      setUserStats(stats);
    } catch (err: any) {
      console.error('Failed to load user stats:', err);
      // Set default values on error
      setUserStats({
        totalCustomers: 0,
        avgOrdersPerCustomer: 0,
        riskAccounts: 0,
        verifiedKYC: 0,
        customerChange: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Load buyers data from API
  useEffect(() => {
    if (activeTab === 'customers') {
      setCurrentPage(1);
      loadBuyers(1);
      loadUserStats();
    }
  }, [activeTab]);

  // Reload when filters or search change
  useEffect(() => {
    if (activeTab === 'customers') {
      setCurrentPage(1);
      loadBuyers(1);
    }
  }, [statusFilter, searchQuery]);

  const loadBuyers = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getBuyers({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
        page: page,
        limit: pageLimit,
      });
      setCustomerRows(response.customers);
      setTotalPages(response.pagination.totalPages);
      setTotalRecords(response.pagination.total);
      setCurrentPage(response.pagination.page);
    } catch (err: any) {
      console.error('Failed to load buyers:', err);
      setError(err.message || 'Failed to load buyers');
      setCustomerRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (customer: CustomerRecord) => {
    if (!customer.userId) {
      showToast('User ID not available. Please refresh the page.', 'error');
      return;
    }
    try {
      setActionLoading(customer.id);
      const response = await adminAPI.getUserDetails(customer.userId);
      setViewUserModal({ open: true, userData: response.user });
    } catch (err: any) {
      console.error('Failed to load user details:', err);
      showToast(`Failed to load user details: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWarnUser = (customer: CustomerRecord) => {
    if (!customer.userId) {
      showToast('User ID not available. Please refresh the page.', 'error');
      return;
    }
    setWarnConfirmModal({ open: true, customer });
  };

  const confirmWarnUser = async () => {
    const customer = warnConfirmModal.customer;
    if (!customer || !customer.userId) return;

    try {
      setActionLoading(customer.id);
      await adminAPI.updateUserStatus(customer.userId, 'warned');
      showToast(`User ${customer.name} has been warned.`, 'success');
      setWarnConfirmModal({ open: false, customer: null });
      loadBuyers(); // Reload to update status
      loadUserStats(); // Refresh stats
    } catch (err: any) {
      console.error('Failed to warn user:', err);
      showToast(`Failed to warn user: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = (customer: CustomerRecord) => {
    if (!customer.userId) {
      showToast('User ID not available. Please refresh the page.', 'error');
      return;
    }
    const isCurrentlyActive = customer.status === 'active';
    setToggleActiveModal({ 
      open: true, 
      customer,
      action: isCurrentlyActive ? 'deactivate' : 'activate'
    });
  };

  const confirmToggleActive = async () => {
    const customer = toggleActiveModal.customer;
    if (!customer || !customer.userId) return;

    try {
      setActionLoading(customer.id);
      const newStatus = toggleActiveModal.action === 'activate' ? 'active' : 'inactive';
      await adminAPI.updateUserStatus(customer.userId, newStatus);
      showToast(
        `User ${customer.name} has been ${toggleActiveModal.action === 'activate' ? 'activated' : 'deactivated'}.`, 
        'success'
      );
      setToggleActiveModal({ open: false, customer: null, action: 'activate' });
      loadBuyers(); // Reload to update status
      loadUserStats(); // Refresh stats
    } catch (err: any) {
      console.error(`Failed to ${toggleActiveModal.action} user:`, err);
      showToast(`Failed to ${toggleActiveModal.action} user: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUser = async (customer: CustomerRecord) => {
    if (!customer.userId) {
      showToast('User ID not available. Please refresh the page.', 'error');
      return;
    }
    try {
      setActionLoading(customer.id);
      const response = await adminAPI.getUserDetails(customer.userId);
      setEditFormData({
        fullName: response.user.name,
        email: response.user.email,
        phone: response.user.phone || '',
        role: (response.user.role as 'buyer' | 'seller' | 'admin') || 'buyer',
        location: response.user.location || '',
        accountStatus: response.user.status as CustomerStatus,
        password: '', // Don't pre-fill password
      });
      setEditUserModal({ open: true, user: customer });
    } catch (err: any) {
      console.error('Failed to load user details:', err);
      showToast(`Failed to load user details: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const user = editUserModal.user;
    if (!user || !user.userId) return;

    const errors: Record<string, string> = {};
    if (!editFormData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!editFormData.email.trim()) errors.email = 'Email is required';
    if (!editFormData.email.includes('@')) errors.email = 'Invalid email format';

    if (Object.keys(errors).length) {
      setEditFormErrors(errors);
      return;
    }

    try {
      setActionLoading(user.id);
      const updateData: any = {
        fullName: editFormData.fullName.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim() || undefined,
        role: editFormData.role,
        location: editFormData.location.trim() || undefined,
        accountStatus: editFormData.accountStatus,
      };
      if (editFormData.password.trim()) {
        updateData.password = editFormData.password;
      }

      await adminAPI.updateUser(user.userId, updateData);
      showToast(`User ${editFormData.fullName} has been updated.`, 'success');
      setEditUserModal({ open: false, user: null });
      setEditFormErrors({});
      loadBuyers();
      loadUserStats(); // Refresh stats
    } catch (err: any) {
      console.error('Failed to update user:', err);
      showToast(`Failed to update user: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = (customer: CustomerRecord) => {
    if (!customer.userId) {
      showToast('User ID not available. Please refresh the page.', 'error');
      return;
    }
    setDeleteConfirmModal({ open: true, customer });
  };

  const confirmDeleteUser = async () => {
    const customer = deleteConfirmModal.customer;
    if (!customer || !customer.userId) return;

    try {
      setActionLoading(customer.id);
      await adminAPI.deleteUser(customer.userId);
      showToast(`User ${customer.name} has been deleted.`, 'success');
      setDeleteConfirmModal({ open: false, customer: null });
      loadBuyers();
      loadUserStats(); // Refresh stats
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      showToast(`Failed to delete user: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (tabMenuRef.current && !tabMenuRef.current.contains(event.target as Node)) {
        setTabMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!syncing) return;
    setSyncProgress(0);
    const intervalId = window.setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          window.clearInterval(intervalId);
          setSyncing(false);
          setSyncLogs((logs) => [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              detail: 'Directory sync completed without issues',
            },
            ...logs,
          ]);
          return 100;
        }
        return Math.min(prev + 8, 100);
      });
    }, 350);
    return () => window.clearInterval(intervalId);
  }, [syncing]);

  const toggleSyncScope = (scopeId: string) => {
    setSyncScopes((prev) =>
      prev.map((scope) => (scope.id === scopeId ? { ...scope, enabled: !scope.enabled } : scope)),
    );
  };

  const handleStartSync = async () => {
    if (!syncScopes.some((scope) => scope.enabled)) {
      setSyncError('Select at least one module to sync');
      return;
    }
    const enabledCount = syncScopes.filter((scope) => scope.enabled).length;
    setSyncError(null);
    setSyncProgress(0);
    setSyncing(true);
    
    const startTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSyncLogs((logs) => [
      {
        timestamp: startTime,
        detail: `Sync started for ${enabledCount} module${enabledCount > 1 ? 's' : ''}`,
      },
      ...logs,
    ]);

    try {
      // Simulate progress updates while syncing
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return Math.min(prev + 10, 90);
        });
      }, 200);

      // Sync based on enabled scopes
      const syncPromises: Promise<void>[] = [];
      
      if (syncScopes.find(s => s.id === 'customers' && s.enabled)) {
        syncPromises.push(loadBuyers());
        syncPromises.push(loadUserStats());
      }
      
      // Wait for all sync operations to complete
      await Promise.all(syncPromises);
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      
      const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncLogs((logs) => [
        {
          timestamp: endTime,
          detail: `Database sync completed successfully (${enabledCount} module${enabledCount > 1 ? 's' : ''})`,
        },
        ...logs,
      ]);
      
      showToast(`Successfully synced ${enabledCount} module${enabledCount > 1 ? 's' : ''} from MongoDB`, 'success');
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Failed to sync data from MongoDB');
      const errorTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncLogs((logs) => [
        {
          timestamp: errorTime,
          detail: `Sync failed: ${error.message || 'Unknown error'}`,
        },
        ...logs,
      ]);
    } finally {
      setSyncing(false);
    }
  };

  const closeSyncModal = () => {
    setSyncModalOpen(false);
    setSyncError(null);
    setSyncing(false);
    setSyncProgress(0);
  };

  const closeAddUserModal = () => {
    setAddUserOpen(false);
    resetForm();
  };

  // Reload buyers when search or status filter changes (with debounce for search)
  useEffect(() => {
    if (activeTab === 'customers') {
      const timeoutId = setTimeout(() => {
        loadBuyers();
      }, searchQuery ? 500 : 0); // Debounce search by 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, statusFilter, activeTab]);

  const filteredCustomers = useMemo(() => {
    // Client-side filtering for additional refinement if needed
    // The API already filters by search and status, but we keep this for any additional client-side filtering
    return customerRows.filter((customer) => {
      const matchesQuery =
        !searchQuery ||
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [searchQuery, statusFilter, customerRows]);

  const resetForm = () => {
    setNewCustomer({
      name: '',
      email: '',
      phone: '',
      status: 'active',
      kyc: 'pending',
      orders: 0,
      totalSpent: 0,
      lastOrder: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      tickets: 0,
      notes: '',
    });
    setFormErrors({});
  };

  const handleAddUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!newCustomer.name.trim()) errors.name = 'Full name is required';
    if (!newCustomer.email.trim()) errors.email = 'Email is required';
    if (!newCustomer.email.includes('@')) errors.email = 'Invalid email format';
    if (!newCustomer.phone.trim()) errors.phone = 'Phone is required';
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    try {
      setLoading(true);
      await adminAPI.createUser({
        fullName: newCustomer.name.trim(),
        email: newCustomer.email.trim(),
        phone: newCustomer.phone.trim(),
        role: 'buyer',
        location: newCustomer.notes.trim() || undefined,
      });
      showToast(`User ${newCustomer.name} has been created successfully.`, 'success');
      setAddUserOpen(false);
      resetForm();
      loadBuyers(); // Reload to show the new user
      loadUserStats(); // Refresh stats
    } catch (err: any) {
      console.error('Failed to create user:', err);
      showToast(`Failed to create user: ${err.message || 'Unknown error'}`, 'error');
      if (err.message?.includes('email')) {
        setFormErrors({ email: 'Email is already taken' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Users • Intelligence</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management Hub</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Control buyers, staff, and authorization policies across the Reaglex platform.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setSyncModalOpen(true);
              setSyncError(null);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-emerald-400"
          >
            <Settings className="h-4 w-4" /> Sync Directory
          </button>
          <button
            onClick={() => {
              resetForm();
              setAddUserOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-200 dark:hover:border-emerald-400"
          >
            <UserPlus className="h-4 w-4" /> Add User
          </button>
          <div className="flex flex-1 items-center justify-end">
            <div ref={tabMenuRef} className="relative">
              <button
                onClick={() => setTabMenuOpen((state) => !state)}
                className="flex items-center gap-2 rounded-xl border border-transparent bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-white dark:border-gray-700"
              >
                {activeTab === 'customers' ? 'Customers' : activeTab === 'staff' ? 'Admins & Staff' : 'Roles & Permissions'}
                <ChevronDown className="h-4 w-4" />
              </button>
              {tabMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 text-sm shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                  {[
                    { id: 'customers', label: 'Customers' },
                    { id: 'staff', label: 'Admins & Staff' },
                    { id: 'roles', label: 'Roles & Permissions' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as typeof activeTab);
                        setTabMenuOpen(false);
                      }}
                      className={`flex w-full items-center px-4 py-2 text-left ${
                        activeTab === tab.id
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {activeTab === 'customers' && (
        <>
          <section className="grid gap-4 lg:grid-cols-4">
            <StatCard 
              icon={Users} 
              label="Total Customers" 
              value={statsLoading ? '...' : userStats?.totalCustomers.toLocaleString() || '0'} 
              helper={userStats?.customerChange !== undefined ? `${userStats.customerChange >= 0 ? '+' : ''}${userStats.customerChange.toFixed(1)}% vs last month` : 'Loading...'} 
            />
            <StatCard 
              icon={ShoppingBag} 
              label="Avg Orders / Customer" 
              value={statsLoading ? '...' : userStats?.avgOrdersPerCustomer.toFixed(1) || '0.0'} 
              helper="Average orders per customer" 
            />
            <StatCard 
              icon={AlertTriangle} 
              label="Risk Accounts" 
              value={statsLoading ? '...' : userStats?.riskAccounts.toString() || '0'} 
              helper="Need manual review" 
              tone="warning" 
            />
            <StatCard 
              icon={ShieldCheck} 
              label="Verified KYC" 
              value={statsLoading ? '...' : `${userStats?.verifiedKYC || 0}%`} 
              helper="Active accounts" 
              tone="success" 
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:w-96">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="Search by name, email, phone or ID"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
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
                {(['active', 'pending', 'inactive', 'warned'] as const).map((status) => (
                  <button
                    key={status}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize ${
                      statusFilter === status
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400 dark:text-emerald-300'
                        : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                    }`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <span className="ml-3 text-gray-600 dark:text-gray-300">Loading buyers...</span>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden scroll-smooth rounded-xl border border-gray-100 dark:border-gray-800 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">KYC</th>
                      <th className="px-4 py-3">Orders</th>
                      <th className="px-4 py-3">Total spent</th>
                      <th className="px-4 py-3">Last order</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No buyers found
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {customer.avatarUrl ? (
                            <img
                              src={customer.avatarUrl?.startsWith('http') ? customer.avatarUrl : resolveAssetUrl(customer.avatarUrl || '')}
                              alt={customer.name}
                              className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                              onError={(e) => {
                                // Fallback to initials if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector('.avatar-fallback')) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'avatar-fallback h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-200 dark:border-gray-700';
                                  fallback.textContent = customer.name.charAt(0).toUpperCase();
                                  parent.insertBefore(fallback, target);
                                }
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-200 dark:border-gray-700">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900 dark:text-white">{customer.name}</p>
                            <p className="text-xs text-gray-500">{customer.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" /> {customer.email}
                          </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" /> {customer.phone}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={statusTone(customer.status)}>{customer.status}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={customer.kyc === 'verified' ? 'success' : customer.kyc === 'pending' ? 'warning' : 'danger'}>
                          {customer.kyc}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-800 dark:text-gray-100">{customer.orders}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
                        ${customer.totalSpent.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-300">{customer.lastOrder}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewUser(customer)}
                            disabled={actionLoading === customer.id}
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-400 dark:hover:border-emerald-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                            title="View user details"
                          >
                            {actionLoading === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleEditUser(customer)}
                            disabled={actionLoading === customer.id}
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                            title="Edit user"
                          >
                            {actionLoading === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleWarnUser(customer)}
                            disabled={actionLoading === customer.id || customer.status === 'inactive'}
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-400 dark:hover:border-amber-400 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-colors"
                            title="Warn user"
                          >
                            {actionLoading === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleToggleActive(customer)}
                            disabled={actionLoading === customer.id}
                            className={`rounded-lg border p-1.5 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 transition-colors ${
                              customer.status === 'active'
                                ? 'border-orange-300 text-orange-600 hover:border-orange-400 hover:bg-orange-50 dark:text-orange-400 dark:hover:border-orange-500 dark:hover:bg-orange-900/20'
                                : 'border-emerald-300 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20'
                            }`}
                            title={customer.status === 'active' ? 'Deactivate user' : 'Activate user'}
                          >
                            {actionLoading === customer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : customer.status === 'active' ? (
                              <PowerOff className="h-4 w-4" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(customer)}
                            disabled={actionLoading === customer.id}
                            className="rounded-lg border border-gray-200 p-1.5 text-red-600 hover:border-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete user"
                          >
                            {actionLoading === customer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-xl">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * pageLimit) + 1} to {Math.min(currentPage * pageLimit, totalRecords)} of {totalRecords} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadBuyers(currentPage - 1)}
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
                          onClick={() => loadBuyers(pageNum)}
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
                    onClick={() => loadBuyers(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
      {activeTab === 'staff' && (
        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="Staff Accounts" value="24" helper="Licensed seats" />
            <StatCard icon={Shield} label="MFA Coverage" value="78%" helper="Target 100%" tone="warning" />
            <StatCard icon={AlertTriangle} label="Locked Accounts" value="2" helper="Security review" tone="danger" />
            <StatCard icon={Zap} label="Active Sessions" value="14" helper="Realtime usage" tone="success" />
            </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Admins & Staff</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Role-based access control • audit-ready</p>
              </div>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                Invite staff
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">MFA</th>
                    <th className="px-4 py-3 text-right">Last active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {staffMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900 dark:text-white">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.id}</p>
                </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{member.email}</td>
                      <td className="px-4 py-4">
                        <Badge tone="neutral">{member.role}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={member.status === 'active' ? 'success' : 'danger'}>{member.status}</Badge>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {member.mfa ? (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <CheckCircle className="h-4 w-4" /> Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-500">
                            <AlertTriangle className="h-4 w-4" /> Missing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-500">{member.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'roles' && (
        <section className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <RoleCard title="Super Admin" members={2} description="Full platform access" />
            <RoleCard title="Operations" members={6} description="Sellers, logistics, orders" />
            <RoleCard title="Support" members={5} description="Tickets & disputes" />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Permission Matrix</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Module-level control</p>
              </div>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">
                New role
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">Module</th>
                    <th className="px-4 py-3">View</th>
                    <th className="px-4 py-3">Create</th>
                    <th className="px-4 py-3">Edit</th>
                    <th className="px-4 py-3">Delete</th>
                    <th className="px-4 py-3">Approve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {permissionMatrix.map((row) => (
                    <tr key={row.module} className="text-center">
                      <td className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">{row.module}</td>
                      {['view', 'create', 'edit', 'delete', 'approve'].map((perm) => (
                        <td key={perm} className="px-4 py-3">
                          <input
                            type="checkbox"
                            readOnly
                            checked={row.permissions[perm as keyof typeof row.permissions]}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Policy Highlights</h3>
              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <li>• Dual approval required for Finance role changes.</li>
                <li>• Temporary access auto-expires after 14 days.</li>
                <li>• All staff must re-acknowledge policy every quarter.</li>
                <li>• Exported logs stored securely for 12 months.</li>
              </ul>
              <button className="text-xs font-semibold text-emerald-500">Download policy PDF</button>
          </div>

            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Access Exception Queue</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Emergency finance edit</p>
                    <p className="text-xs text-gray-500">Approved · expires in 3 days</p>
                  </div>
                  <button className="text-xs text-emerald-500">Review</button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Support cross-region access</p>
                    <p className="text-xs text-gray-500">Pending security approval</p>
                  </div>
                  <button className="text-xs text-emerald-500">Approve</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {syncModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={closeSyncModal}
          role="presentation"
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeSyncModal}
              className="absolute right-4 top-4 rounded-full border border-gray-200 p-1.5 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
              aria-label="Close sync modal"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Database Sync</p>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">MongoDB database sync</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Refresh customer, staff, and authorization data from MongoDB database.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Scopes to include</p>
                <div className="space-y-3">
                  {syncScopes.map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => toggleSyncScope(scope.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        scope.enabled
                          ? 'border-emerald-400 bg-emerald-50/60 dark:border-emerald-500/80 dark:bg-emerald-500/10'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                            scope.enabled
                              ? 'border-emerald-500 bg-white text-emerald-600 dark:bg-gray-900'
                              : 'border-gray-300 text-gray-400 dark:border-gray-600'
                          }`}
                        >
                          {scope.enabled ? <CheckCircle className="h-4 w-4" /> : '•'}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{scope.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{scope.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
                    <span>
                      {syncing ? 'Syncing live data' : syncProgress === 100 ? 'Last sync complete' : 'Ready to sync'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{syncProgress}%</span>
                  </div>
                  <div className="mt-3 h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                  {syncing ? (
                    <p className="mt-3 flex items-center gap-2 text-xs text-emerald-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Syncing data from MongoDB database
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Select scopes then tap run sync to refresh data from MongoDB.
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Recent activity</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto overflow-x-hidden scroll-smooth rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {syncLogs.map((log, index) => (
                      <div key={`${log.timestamp}-${index}`} className="flex items-start gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{log.timestamp}</span>
                        <p className="flex-1 text-gray-800 dark:text-gray-200">{log.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {syncError && <p className="mt-4 text-sm text-red-500">{syncError}</p>}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last recorded sync: {syncLogs[0]?.timestamp ?? 'a few moments ago'}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={closeSyncModal}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={syncing}
                  onClick={handleStartSync}
                  className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 ${
                    syncing ? 'opacity-70' : ''
                  }`}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Syncing…
                    </>
                  ) : (
                    'Run sync now'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addUserOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={closeAddUserModal}
          role="presentation"
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeAddUserModal}
              className="absolute right-4 top-4 z-10 rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white"
              aria-label="Close add user form"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-6 flex-shrink-0 px-6 pt-6">
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-500">Create</p>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Add customer profile</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Capture the essentials so the ops team can start onboarding immediately.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full">
              <form id="add-user-form" className="space-y-5 pb-4" onSubmit={handleAddUser}>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Full name"
                  value={newCustomer.name}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, name: value }))}
                  placeholder="e.g. Jane Doe"
                  error={formErrors.name}
                />
                <InputField
                  label="Phone"
                  value={newCustomer.phone}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, phone: value }))}
                  placeholder="+1 555 123 4567"
                  error={formErrors.phone}
                />
                <InputField
                  label="Email address"
                  value={newCustomer.email}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, email: value }))}
                  placeholder="customer@domain.com"
                  type="email"
                  className="sm:col-span-2"
                  error={formErrors.email}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Account status"
                  value={newCustomer.status}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, status: value as CustomerStatus }))}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Banned', value: 'banned' },
                  ]}
                />
                <SelectField
                  label="KYC status"
                  value={newCustomer.kyc}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, kyc: value as KycStatus }))}
                  options={[
                    { label: 'Verified', value: 'verified' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Rejected', value: 'rejected' },
                  ]}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Orders to migrate"
                  value={newCustomer.orders.toString()}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, orders: Number(value) || 0 }))}
                  type="number"
                  min={0}
                />
                <InputField
                  label="Lifetime value ($)"
                  value={newCustomer.totalSpent.toString()}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, totalSpent: Number(value) || 0 }))}
                  type="number"
                  min={0}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Open tickets"
                  value={newCustomer.tickets.toString()}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, tickets: Number(value) || 0 }))}
                  type="number"
                  min={0}
                />
                <InputField
                  label="Last order date"
                  value={newCustomer.lastOrder}
                  onChange={(value) => setNewCustomer((prev) => ({ ...prev, lastOrder: value }))}
                  placeholder="Mar 18, 2024"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">Internal notes</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(event) => setNewCustomer((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Risk profile, region, funnel, etc."
                />
              </div>
              </form>
            </div>
            <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This profile will appear immediately in the customer grid once saved.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAddUserOpen(false);
                      resetForm();
                    }}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const form = document.getElementById('add-user-form') as HTMLFormElement;
                      if (form) {
                        form.requestSubmit();
                      }
                    }}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40"
                  >
                    Save customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View User Details Modal */}
      <Dialog open={viewUserModal.open} onOpenChange={(open) => setViewUserModal({ open, userData: null })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Complete information about this user account</DialogDescription>
          </DialogHeader>
          {viewUserModal.userData && (
            <div className="space-y-6">
              {/* User Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                {viewUserModal.userData.avatarUrl ? (
                  <img
                    src={viewUserModal.userData.avatarUrl?.startsWith('http') ? viewUserModal.userData.avatarUrl : resolveAssetUrl(viewUserModal.userData.avatarUrl || '')}
                    alt={viewUserModal.userData.name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.avatar-fallback')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'avatar-fallback h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-xl border-2 border-gray-200 dark:border-gray-700';
                        fallback.textContent = viewUserModal.userData.name.charAt(0).toUpperCase();
                        parent.insertBefore(fallback, target);
                      }
                    }}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-xl border-2 border-gray-200 dark:border-gray-700">
                    {viewUserModal.userData.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{viewUserModal.userData.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{viewUserModal.userData.email}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge tone={statusTone(viewUserModal.userData.status)}>{viewUserModal.userData.status}</Badge>
                    <Badge tone="neutral">{viewUserModal.userData.role}</Badge>
                  </div>
                </div>
              </div>

              {/* User Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{viewUserModal.userData.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{viewUserModal.userData.phone || 'N/A'}</p>
                  </div>
                </div>
                {viewUserModal.userData.location && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{viewUserModal.userData.location}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(viewUserModal.userData.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Package className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{viewUserModal.userData.orders}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">${viewUserModal.userData.totalSpent.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Account Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{viewUserModal.userData.orders}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Orders</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{viewUserModal.userData.warningCount}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Warnings</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      ${viewUserModal.userData.totalSpent > 0 ? (viewUserModal.userData.totalSpent / viewUserModal.userData.orders).toFixed(2) : '0.00'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Avg Order</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Warn User Confirmation Modal */}
      <ConfirmDialog
        isOpen={warnConfirmModal.open}
        onClose={() => setWarnConfirmModal({ open: false, customer: null })}
        onConfirm={confirmWarnUser}
        title="Warn User"
        message={`Are you sure you want to warn ${warnConfirmModal.customer?.name}? This will increment their warning count.`}
        confirmText="Warn User"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Toggle Active/Inactive Confirmation Modal */}
      <ConfirmDialog
        isOpen={toggleActiveModal.open}
        onClose={() => setToggleActiveModal({ open: false, customer: null, action: 'activate' })}
        onConfirm={confirmToggleActive}
        title={toggleActiveModal.action === 'activate' ? 'Activate User' : 'Deactivate User'}
        message={
          toggleActiveModal.action === 'activate'
            ? `Are you sure you want to activate ${toggleActiveModal.customer?.name}? They will be able to access their account again.`
            : `Are you sure you want to deactivate ${toggleActiveModal.customer?.name}? They will temporarily lose access to their account. You can reactivate them later.`
        }
        confirmText={toggleActiveModal.action === 'activate' ? 'Activate User' : 'Deactivate User'}
        cancelText="Cancel"
        variant={toggleActiveModal.action === 'activate' ? 'success' : 'warning'}
      />

      {/* Edit User Modal */}
      <Dialog open={editUserModal.open} onOpenChange={(open) => !open && setEditUserModal({ open: false, user: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings</DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleSaveEdit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Full name"
                value={editFormData.fullName}
                onChange={(value) => setEditFormData((prev) => ({ ...prev, fullName: value }))}
                placeholder="e.g. Jane Doe"
                error={editFormErrors.fullName}
              />
              <InputField
                label="Email address"
                value={editFormData.email}
                onChange={(value) => setEditFormData((prev) => ({ ...prev, email: value }))}
                placeholder="user@example.com"
                type="email"
                error={editFormErrors.email}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Phone"
                value={editFormData.phone}
                onChange={(value) => setEditFormData((prev) => ({ ...prev, phone: value }))}
                placeholder="+1 555 123 4567"
                error={editFormErrors.phone}
              />
              <InputField
                label="Location"
                value={editFormData.location}
                onChange={(value) => setEditFormData((prev) => ({ ...prev, location: value }))}
                placeholder="City, Country"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Role"
                value={editFormData.role}
                onChange={(value) => setEditFormData((prev) => ({ ...prev, role: value as 'buyer' | 'seller' | 'admin' }))}
                options={[
                  { label: 'Buyer', value: 'buyer' },
                  { label: 'Seller', value: 'seller' },
                  { label: 'Admin', value: 'admin' },
                ]}
              />
              <SelectField
                label="Account status"
                value={editFormData.accountStatus}
                onChange={(value) => setEditFormData((prev) => ({ ...prev, accountStatus: value as CustomerStatus }))}
                options={[
                  { label: 'Active', value: 'active' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Warned', value: 'warned' },
                  { label: 'Inactive', value: 'inactive' },
                  { label: 'Banned', value: 'banned' },
                ]}
              />
            </div>
            <div>
              <InputField
                label="New Password (leave empty to keep current)"
                value={editFormData.password}
                onChange={(value) => setEditFormData((prev) => ({ ...prev, password: value }))}
                type="password"
                placeholder="Enter new password"
                error={editFormErrors.password}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only fill this if you want to change the user's password
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setEditUserModal({ open: false, user: null });
                  setEditFormErrors({});
                }}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === editUserModal.user?.id}
                className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 disabled:opacity-50"
              >
                {actionLoading === editUserModal.user?.id ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirmModal.open}
        onClose={() => setDeleteConfirmModal({ open: false, customer: null })}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={`Are you sure you want to DELETE ${deleteConfirmModal.customer?.name}? This action is permanent and cannot be undone. All user data will be removed from the system.`}
        confirmText="Delete User"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  error,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  error?: string;
  min?: number;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:text-gray-200 ${
          error ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-500/10' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  helper: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const colors: Record<'neutral' | 'success' | 'warning' | 'danger', string> = {
    neutral: 'from-slate-600 to-slate-800',
    success: 'from-emerald-500 to-teal-500',
    warning: 'from-emerald-500 via-teal-500 to-cyan-500',
    danger: 'from-red-500 to-rose-500',
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow dark:border-gray-800 dark:bg-gray-900">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${colors[tone]} text-white`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{helper}</p>
    </div>
  );
}

function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warning' | 'danger'; children: React.ReactNode }) {
  const colors: Record<'neutral' | 'success' | 'warning' | 'danger', string> = {
    neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[tone]}`}>{children}</span>;
}

function RoleCard({ title, members, description }: { title: string; members: number; description: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow dark:border-gray-800 dark:bg-gray-900">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{members} members</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      <div className="mt-3 flex gap-2">
        <button className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Edit
        </button>
        <button className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Duplicate
          </button>
      </div>
    </div>
  );
}

function statusTone(status: CustomerStatus): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'banned') return 'danger';
  if (status === 'warned') return 'warning';
  if (status === 'inactive') return 'neutral';
  return 'neutral';
}

