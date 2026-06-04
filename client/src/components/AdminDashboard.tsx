import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  adminRoleLabel,
  canAccessAdminRoute,
  canUseAdminIntelligenceSearch,
  getDefaultAdminPath,
  hasAdminScope,
  isSuperAdmin,
} from '@/lib/adminPermissions';
import { getDashboardPathForRole } from '@/lib/authRouting';
import { buildAdminMenuItems, buildAdminMenuSections, getAllAdminRouteIds } from '@/lib/adminNavCatalog';
import AdminScopeGuard from '@/components/admin/AdminScopeGuard';
import AdminTeamManagement from '@/pages/admin/AdminTeamManagement';
import { API_BASE_URL } from '@/lib/config';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import Notifications from '@/components/dashboard/Notifications';
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminScopedWorkspace from '@/pages/admin/AdminScopedWorkspace';
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
import SystemFeatureControl from '@/pages/admin/SystemFeatureControl';
import KycVerificationQueues from '@/pages/admin/kyc/KycVerificationQueues';
import { DeviceApprovalPopup } from './DeviceApprovalPopup';
import { useAdminIntelligenceSearchStore } from '@/stores/adminIntelligenceSearchStore';
import { useAdminIntelligenceLive } from '@/hooks/useAdminIntelligenceLive';

const AdminIntelligenceSearch = lazy(
  () => import('@/components/admin/intelligence/AdminIntelligenceSearch'),
);
import type { MenuItem } from '@/components/dashboard/Sidebar';

function AdminHome() {
  const user = useAuthStore((s) => s.user);
  if (isSuperAdmin(user)) {
    return <AdminOverview />;
  }
  return <AdminScopedWorkspace />;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const authInitialized = useAuthStore((s) => s.initialized);
  const setIntelSearchOpen = useAdminIntelligenceSearchStore((s) => s.setOpen);
  const intelSearchOpen = useAdminIntelligenceSearchStore((s) => s.open);
  const intelSearchEnabled = canUseAdminIntelligenceSearch(authUser);
  useAdminIntelligenceLive(intelSearchEnabled);
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
  
  useEffect(() => {
    if (authLoading || !authInitialized) return;
    if (!authUser) {
      navigate('/login', { replace: true });
      return;
    }
    if (authUser.role !== 'admin') {
      navigate(getDashboardPathForRole(authUser.role), { replace: true });
    }
  }, [authUser, authLoading, authInitialized, navigate]);

  // Ensure we're on a valid route the staff member may access
  useEffect(() => {
    const validRoutes = getAllAdminRouteIds();
    const onIndex = pathSegments.length === adminIndex + 1;
    const currentRoute = onIndex ? 'dashboard' : pathSegments[adminIndex + 1]?.split('/')[0];

    if (!onIndex && currentRoute && !validRoutes.includes(currentRoute)) {
      navigate(getDefaultAdminPath(authUser), { replace: true });
      return;
    }

    if (currentRoute && !canAccessAdminRoute(authUser, currentRoute)) {
      navigate(getDefaultAdminPath(authUser), { replace: true });
      return;
    }

    if (onIndex && !canAccessAdminRoute(authUser, 'dashboard')) {
      navigate(getDefaultAdminPath(authUser), { replace: true });
    }
  }, [location.pathname, navigate, pathSegments, adminIndex, authUser]);

  useEffect(() => {
    if (!intelSearchEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIntelSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setIntelSearchOpen, intelSearchEnabled]);

  useEffect(() => {
    const t = localStorage.getItem('auth_token');
    if (!t) return;
    const h = { Authorization: `Bearer ${t}` };
    if (hasAdminScope(authUser, 'system')) {
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
    }
    if (hasAdminScope(authUser, 'security')) {
    fetch(`${API_BASE_URL}/security-analysis/overview`, { headers: h })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (typeof d?.score !== 'number') return;
        if (d.score >= 75) setSecurityBadge({ text: 'OK', tone: 'ok' });
        else if (d.score >= 45) setSecurityBadge({ text: 'WARN', tone: 'warn' });
        else setSecurityBadge({ text: 'RISK', tone: 'critical' });
      })
      .catch(() => {});
    }
  }, [location.pathname, authUser]);

  const setActiveTab = (tabId: string) => {
    if (tabId === 'dashboard') {
      navigate('/admin');
    } else {
      navigate(`/admin/${tabId}`);
    }
  };

  const navBadges = {
    'system-analysis': systemBadge,
    'security-analysis': securityBadge,
  };
  const superAdmin = isSuperAdmin(authUser);
  const menuItems = superAdmin ? buildAdminMenuItems(authUser, navBadges) : undefined;
  const menuSections = superAdmin
    ? undefined
    : buildAdminMenuSections(authUser, navBadges).map((s) => ({
        id: s.category.id,
        label: s.category.label,
        items: s.items,
      }));

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
        tier={adminRoleLabel(authUser)}
        accentVariant="emerald"
        hub="admin"
        menuItems={menuItems}
        menuSections={menuSections}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          setSidebarOpen={setSidebarOpen}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          userName={authUser?.full_name || 'Admin'}
          userRole={adminRoleLabel(authUser)}
          accentVariant="emerald"
          showIntelligenceSearch={intelSearchEnabled}
          onOpenIntelligenceSearch={() => setIntelSearchOpen(true)}
        />
        
        <main className="dashboard-main flex-1 min-w-0 overflow-y-auto overflow-x-hidden scroll-smooth p-3 sm:p-4 md:p-6 lg:p-8 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8 transition-colors duration-300 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full">
          <Routes>
            <Route index element={<AdminScopeGuard routeId="dashboard"><AdminHome /></AdminScopeGuard>} />
            <Route path="dashboard" element={<AdminScopeGuard routeId="dashboard"><AdminHome /></AdminScopeGuard>} />
            <Route path="system-analysis" element={<AdminScopeGuard routeId="system-analysis"><SystemAnalysisPage /></AdminScopeGuard>} />
            <Route path="security-analysis" element={<AdminScopeGuard routeId="security-analysis"><SecurityAnalysisPage /></AdminScopeGuard>} />
            <Route path="team" element={<AdminScopeGuard routeId="team"><AdminTeamManagement /></AdminScopeGuard>} />
            <Route path="system-controls" element={<AdminScopeGuard routeId="system-controls"><SystemFeatureControl /></AdminScopeGuard>} />
            <Route path="users" element={<AdminScopeGuard routeId="users"><UserManagement /></AdminScopeGuard>} />
            <Route path="sellers" element={<AdminScopeGuard routeId="sellers"><SellerStoreManagement /></AdminScopeGuard>} />
            <Route path="kyc-queues" element={<AdminScopeGuard routeId="kyc-queues"><KycVerificationQueues /></AdminScopeGuard>} />
            <Route path="products" element={<AdminScopeGuard routeId="products"><ProductManagementAdmin /></AdminScopeGuard>} />
            <Route path="product-metadata" element={<AdminScopeGuard routeId="product-metadata"><ProductMetadataEditor /></AdminScopeGuard>} />
            <Route path="orders" element={<AdminScopeGuard routeId="orders"><OrderManagementAdmin /></AdminScopeGuard>} />
            <Route path="finance" element={<AdminScopeGuard routeId="finance"><PaymentsFinancial /></AdminScopeGuard>} />
            <Route path="seller-subscriptions" element={<AdminScopeGuard routeId="seller-subscriptions"><SellerSubscriptionsAdmin /></AdminScopeGuard>} />
            <Route path="support/*" element={<AdminScopeGuard routeId="support"><SupportCenter /></AdminScopeGuard>} />
            <Route path="returns" element={<AdminScopeGuard routeId="returns"><ReturnsControlCenter /></AdminScopeGuard>} />
            <Route path="logistics/*" element={<AdminScopeGuard routeId="logistics"><LogisticsCenter /></AdminScopeGuard>} />
            <Route path="notifications" element={<AdminScopeGuard routeId="notifications"><NotificationStudio /></AdminScopeGuard>} />
            <Route path="live-commerce" element={<AdminScopeGuard routeId="live-commerce"><LiveCommerceControl /></AdminScopeGuard>} />
            <Route path="marketing/*" element={<AdminScopeGuard routeId="marketing"><MarketingCenter /></AdminScopeGuard>} />
            <Route path="reviews/*" element={<AdminScopeGuard routeId="reviews"><ReviewsCenter /></AdminScopeGuard>} />
            <Route path="collections/*" element={<AdminScopeGuard routeId="collections"><CollectionsCenter /></AdminScopeGuard>} />
            <Route path="compliance/*" element={<AdminScopeGuard routeId="compliance"><ComplianceCenter /></AdminScopeGuard>} />
            <Route path="settings" element={<AdminScopeGuard routeId="settings"><AdminProfile /></AdminScopeGuard>} />
          </Routes>
        </main>
      </div>

      <Notifications 
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <DeviceApprovalPopup />
      {intelSearchEnabled && intelSearchOpen ? (
        <Suspense fallback={null}>
          <AdminIntelligenceSearch />
        </Suspense>
      ) : null}
    </div>
  );
};

export default AdminDashboard;

