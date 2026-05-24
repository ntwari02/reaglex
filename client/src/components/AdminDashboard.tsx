import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store as StoreIcon,
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Truck,
  Megaphone,
  Star,
  FolderKanban,
  Settings,
  Activity,
  ShieldCheck,
  BadgePercent,
  Crown,
  RotateCcw,
  Bell,
  Radio,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import Notifications from '@/components/dashboard/Notifications';
import AdminOverview from '@/pages/admin/AdminOverview';
import UserManagement from '@/pages/admin/UserManagement';
import SellerStoreManagement from '@/pages/admin/SellerStoreManagement';
import ProductManagementAdmin from '@/pages/admin/ProductManagementAdmin';
import ProductMetadataEditor from '@/pages/admin/products/ProductMetadataEditor';
import OrderManagementAdmin from '@/pages/admin/OrderManagementAdmin';
import PaymentsFinancial from '@/pages/admin/PaymentsFinancial';
import SellerSubscriptionsAdmin from '@/pages/admin/SellerSubscriptionsAdmin';
import SupportCenter from '@/pages/admin/support/SupportCenter';
import LogisticsCenter from '@/pages/admin/logistics/LogisticsCenter';
import MarketingCenter from '@/pages/admin/marketing/MarketingCenter';
import ReviewsCenter from '@/pages/admin/reviews/ReviewsCenter';
import CollectionsCenter from '@/pages/admin/collections/CollectionsCenter';
import ComplianceCenter from '@/pages/admin/compliance/ComplianceCenter';
import ReturnsControlCenter from '@/pages/admin/support/ReturnsControlCenter';
import { AdminProfile } from '@/pages/admin/AdminProfile';
import SystemAnalysisPage from '@/pages/admin/SystemAnalysisPage';
import SecurityAnalysisPage from '@/pages/admin/SecurityAnalysisPage';
import NotificationStudio from '@/pages/admin/notifications/NotificationStudio';
import LiveCommerceControl from '@/pages/admin/LiveCommerceControl';
import KycVerificationQueues from '@/pages/admin/kyc/KycVerificationQueues';
import { DeviceApprovalPopup } from './DeviceApprovalPopup';
import AdminIntelligenceSearch from '@/components/admin/intelligence/AdminIntelligenceSearch';
import { useAdminIntelligenceSearchStore } from '@/stores/adminIntelligenceSearchStore';
import { useAdminIntelligenceLive } from '@/hooks/useAdminIntelligenceLive';
import type { MenuItem } from '@/components/dashboard/Sidebar';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setIntelSearchOpen = useAdminIntelligenceSearchStore((s) => s.setOpen);
  useAdminIntelligenceLive(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [systemBadge, setSystemBadge] = useState<{ text: string; tone: MenuItem['badgeTone'] }>({
    text: '…',
    tone: 'neutral',
  });
  const [securityBadge, setSecurityBadge] = useState<{ text: string; tone: MenuItem['badgeTone'] }>({
    text: '…',
    tone: 'neutral',
  });
  
  // Extract the route segment after /admin/
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const adminIndex = pathSegments.indexOf('admin');
  const activeTab = adminIndex >= 0 && pathSegments.length > adminIndex + 1 
    ? pathSegments[adminIndex + 1] 
    : 'dashboard';
  
  // Ensure we're on a valid route
  useEffect(() => {
    const validRoutes = [
      'dashboard',
      'system-analysis',
      'security-analysis',
      'users',
      'sellers',
      'kyc-queues',
      'products',
      'product-metadata',
      'orders',
      'finance',
      'seller-subscriptions',
      'support',
      'returns',
      'logistics',
      'notifications',
      'live-commerce',
      'marketing',
      'reviews',
      'collections',
      'compliance',
      'settings',
    ];
    if (pathSegments.length === adminIndex + 1) {
      // We're on /admin, which is fine (index route)
      return;
    }
    const currentRoute = pathSegments[adminIndex + 1];
    if (currentRoute && !validRoutes.includes(currentRoute)) {
      // Invalid route, redirect to dashboard
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, navigate, pathSegments, adminIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIntelSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setIntelSearchOpen]);

  useEffect(() => {
    const t = localStorage.getItem('auth_token');
    if (!t) return;
    const h = { Authorization: `Bearer ${t}` };
    fetch(`${API_BASE_URL}/system/health`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.status) return;
        const st = String(d.status);
        if (st === 'OK') setSystemBadge({ text: 'OK', tone: 'ok' });
        else if (st === 'WARN') setSystemBadge({ text: 'WARN', tone: 'warn' });
        else setSystemBadge({ text: 'CRIT', tone: 'critical' });
      })
      .catch(() => {});
    fetch(`${API_BASE_URL}/security-analysis/overview`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (typeof d?.score !== 'number') return;
        if (d.score >= 75) setSecurityBadge({ text: 'OK', tone: 'ok' });
        else if (d.score >= 45) setSecurityBadge({ text: 'WARN', tone: 'warn' });
        else setSecurityBadge({ text: 'RISK', tone: 'critical' });
      })
      .catch(() => {});
  }, [location.pathname]);

  const setActiveTab = (tabId: string) => {
    if (tabId === 'dashboard') {
      navigate('/admin');
    } else {
      navigate(`/admin/${tabId}`);
    }
  };

  return (
    <div
      data-hub="admin"
      className="dashboard-app flex h-screen overflow-hidden transition-colors duration-300"
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        title="Admin Panel"
        tier="Super Admin"
        accentVariant="emerald"
        menuItems={[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          {
            id: 'system-analysis',
            label: 'System Analysis',
            icon: Activity,
            badge: systemBadge.text,
            badgeTone: systemBadge.tone,
          },
          {
            id: 'security-analysis',
            label: 'Security Analysis',
            icon: ShieldCheck,
            badge: securityBadge.text,
            badgeTone: securityBadge.tone,
          },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'sellers', label: 'Sellers', icon: StoreIcon },
          { id: 'kyc-queues', label: 'KYC queues', icon: ShieldCheck },
          { id: 'products', label: 'Products', icon: Package },
          { id: 'product-metadata', label: 'Product metadata', icon: BadgePercent },
          { id: 'orders', label: 'Orders', icon: ShoppingCart },
          { id: 'finance', label: 'Finance', icon: DollarSign },
          { id: 'seller-subscriptions', label: 'Seller subscriptions', icon: Crown },
          { id: 'support', label: 'Support', icon: AlertTriangle },
          { id: 'returns', label: 'Returns', icon: RotateCcw },
          { id: 'logistics', label: 'Logistics', icon: Truck },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'live-commerce', label: 'Live Commerce', icon: Radio },
          { id: 'marketing', label: 'Marketing', icon: Megaphone },
          { id: 'reviews', label: 'Reviews', icon: Star },
          { id: 'collections', label: 'Collections', icon: FolderKanban },
          { id: 'compliance', label: 'Data Compliance', icon: ShieldCheck },
          { id: 'settings', label: 'Profile & Settings', icon: Settings },
        ]}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          setSidebarOpen={setSidebarOpen}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          userName="Admin User"
          userRole="Super Admin"
          accentVariant="emerald"
          showIntelligenceSearch
          onOpenIntelligenceSearch={() => setIntelSearchOpen(true)}
        />
        
        <main className="dashboard-main flex-1 min-w-0 overflow-y-auto overflow-x-hidden scroll-smooth p-3 sm:p-4 md:p-6 lg:p-8 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 transition-colors duration-300 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="dashboard" element={<AdminOverview />} />
            <Route path="system-analysis" element={<SystemAnalysisPage />} />
            <Route path="security-analysis" element={<SecurityAnalysisPage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="sellers" element={<SellerStoreManagement />} />
            <Route path="kyc-queues" element={<KycVerificationQueues />} />
            <Route path="products" element={<ProductManagementAdmin />} />
            <Route path="product-metadata" element={<ProductMetadataEditor />} />
            <Route path="orders" element={<OrderManagementAdmin />} />
            <Route path="finance" element={<PaymentsFinancial />} />
            <Route path="seller-subscriptions" element={<SellerSubscriptionsAdmin />} />
            <Route path="support" element={<SupportCenter />} />
            <Route path="returns" element={<ReturnsControlCenter />} />
            <Route path="logistics" element={<LogisticsCenter />} />
            <Route path="notifications" element={<NotificationStudio />} />
            <Route path="live-commerce" element={<LiveCommerceControl />} />
            <Route path="marketing" element={<MarketingCenter />} />
            <Route path="reviews" element={<ReviewsCenter />} />
            <Route path="collections" element={<CollectionsCenter />} />
            <Route path="compliance" element={<ComplianceCenter />} />
            <Route path="settings" element={<AdminProfile />} />
          </Routes>
        </main>
      </div>

      <Notifications 
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <DeviceApprovalPopup />
      <AdminIntelligenceSearch />
    </div>
  );
};

export default AdminDashboard;

