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
  Bell,
  Megaphone,
  Star,
  FolderKanban,
  Settings,
  Activity,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import Notifications from '@/components/dashboard/Notifications';
import AdminOverview from '@/pages/admin/AdminOverview';
import UserManagement from '@/pages/admin/UserManagement';
import SellerStoreManagement from '@/pages/admin/SellerStoreManagement';
import ProductManagementAdmin from '@/pages/admin/ProductManagementAdmin';
import OrderManagementAdmin from '@/pages/admin/OrderManagementAdmin';
import PaymentsFinancial from '@/pages/admin/PaymentsFinancial';
import SellerSubscriptionsAdmin from '@/pages/admin/SellerSubscriptionsAdmin';
import SupportCenter from '@/pages/admin/support/SupportCenter';
import LogisticsCenter from '@/pages/admin/logistics/LogisticsCenter';
import NotificationsCenter from '@/pages/admin/notifications/NotificationsCenter';
import MarketingCenter from '@/pages/admin/marketing/MarketingCenter';
import ReviewsCenter from '@/pages/admin/reviews/ReviewsCenter';
import CollectionsCenter from '@/pages/admin/collections/CollectionsCenter';
import { AdminProfile } from '@/pages/admin/AdminProfile';
import SystemAnalysisPage from '@/pages/admin/SystemAnalysisPage';
import SecurityAnalysisPage from '@/pages/admin/SecurityAnalysisPage';
import { DeviceApprovalPopup } from './DeviceApprovalPopup';
import type { MenuItem } from '@/components/dashboard/Sidebar';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
      'products',
      'orders',
      'finance',
      'seller-subscriptions',
      'support',
      'logistics',
      'notifications',
      'marketing',
      'reviews',
      'collections',
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-black dark:to-gray-900 transition-colors duration-300">
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
          { id: 'products', label: 'Products', icon: Package },
          { id: 'orders', label: 'Orders', icon: ShoppingCart },
          { id: 'finance', label: 'Finance', icon: DollarSign },
          { id: 'seller-subscriptions', label: 'Seller subscriptions', icon: Crown },
          { id: 'support', label: 'Support', icon: AlertTriangle },
          { id: 'logistics', label: 'Logistics', icon: Truck },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'marketing', label: 'Marketing', icon: Megaphone },
          { id: 'reviews', label: 'Reviews', icon: Star },
          { id: 'collections', label: 'Collections', icon: FolderKanban },
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
        />
        
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scroll-smooth bg-gray-50/50 dark:bg-black/30 p-4 md:p-6 lg:p-8 transition-colors duration-300 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="dashboard" element={<AdminOverview />} />
            <Route path="system-analysis" element={<SystemAnalysisPage />} />
            <Route path="security-analysis" element={<SecurityAnalysisPage />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="sellers" element={<SellerStoreManagement />} />
            <Route path="products" element={<ProductManagementAdmin />} />
            <Route path="orders" element={<OrderManagementAdmin />} />
            <Route path="finance" element={<PaymentsFinancial />} />
            <Route path="seller-subscriptions" element={<SellerSubscriptionsAdmin />} />
            <Route path="support" element={<SupportCenter />} />
            <Route path="logistics" element={<LogisticsCenter />} />
            <Route path="notifications" element={<NotificationsCenter />} />
            <Route path="marketing" element={<MarketingCenter />} />
            <Route path="reviews" element={<ReviewsCenter />} />
            <Route path="collections" element={<CollectionsCenter />} />
            <Route path="settings" element={<AdminProfile />} />
          </Routes>
        </main>
      </div>

      <Notifications 
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <DeviceApprovalPopup />
    </div>
  );
};

export default AdminDashboard;

