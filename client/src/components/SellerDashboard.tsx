import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import DashboardOverview from '@/pages/seller/DashboardOverview';
import InventoryManagement from '@/pages/seller/InventoryManagement';
import OrdersPage from '@/pages/seller/OrdersPage';
import DisputeResolution from '@/pages/seller/DisputeResolution';
import ProductManagement from '@/pages/seller/ProductManagement';
import CollectionManagement from '@/pages/seller/CollectionManagement';
import Analytics from '@/pages/seller/Analytics';
import SubscriptionTiers from '@/pages/seller/SubscriptionTiers';
import ProfilePage from '@/pages/seller/ProfilePage';
import SupportCenter from '@/pages/seller/SupportCenter';
import NotificationsPage from '@/pages/seller/NotificationsPage';
import OrderDetailsPage from '@/pages/seller/OrderDetailsPage';
import SellerShippingSettings from '@/pages/seller/SellerShippingSettings';
import ReturnsCases from '@/pages/seller/ReturnsCases';
import Notifications from '@/components/dashboard/Notifications';
import { DeviceApprovalPopup } from './DeviceApprovalPopup';
import { useAuthStore } from '../stores/authStore';

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, initialized } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Extract the route segment after /seller/
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const sellerIndex = pathSegments.indexOf('seller');
  const activeTab = sellerIndex >= 0 && pathSegments.length > sellerIndex + 1 
    ? pathSegments[sellerIndex + 1] 
    : 'dashboard';
  
  // Ensure user is a seller and (optionally) approved.
  // Wait until auth store has finished initializing to avoid redirecting on page reload
  // while the user is still being restored from localStorage / backend.
  useEffect(() => {
    if (loading || !initialized) {
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'seller') {
      navigate('/');
      return;
    }

    // Optionally, you can block access entirely for non-approved sellers.
    // For now, we allow access but mark them as pending in the UI.
  }, [user, navigate, loading, initialized]);

  // Ensure we're on a valid route
  useEffect(() => {
    const validRoutes = ['dashboard', 'inventory', 'orders', 'disputes', 'returns', 'products', 'shipping', 'collections', 'analytics', 'subscription', 'settings', 'support', 'notifications'];
    if (pathSegments.length === sellerIndex + 1) {
      // We're on /seller, which is fine (index route)
      return;
    }
    const currentRoute = pathSegments[sellerIndex + 1];
    if (currentRoute && !validRoutes.includes(currentRoute)) {
      // Invalid route, redirect to dashboard
      navigate('/seller', { replace: true });
    }
  }, [location.pathname, navigate, pathSegments, sellerIndex, navigate]);

  const setActiveTab = (tabId: string) => {
    if (tabId === 'dashboard') {
      navigate('/seller');
    } else {
      navigate(`/seller/${tabId}`);
    }
  };

  // While auth is initializing, keep the seller on this page and show a lightweight loader
  if (loading && !initialized) {
    return (
      <div
        className="dashboard-app flex h-screen items-center justify-center transition-colors duration-300"
        style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Restoring your session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="dashboard-app flex h-screen overflow-hidden transition-colors duration-300"
      style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
    >
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        title="Seller Hub"
        tier="Premium Tier"
        accentVariant="orange"
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          setSidebarOpen={setSidebarOpen}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          userName={user?.full_name || user?.email || 'Seller'}
          userRole={
            user?.seller_status === 'approved'
              ? 'Verified Seller'
              : user?.seller_status === 'rejected'
              ? 'Seller (Verification Rejected)'
              : 'Seller (Pending Government & Admin Approval)'
          }
          accentVariant="orange"
        />
        
        <main className="dashboard-main flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-4 md:p-6 lg:p-8 transition-colors duration-300 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full">
          <Routes>
            <Route index element={<DashboardOverview />} />
            <Route path="dashboard" element={<DashboardOverview />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:orderId" element={<OrderDetailsPage />} />
            <Route path="disputes" element={<DisputeResolution />} />
            <Route path="returns" element={<ReturnsCases />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="shipping" element={<SellerShippingSettings />} />
            <Route path="collections" element={<CollectionManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="subscription" element={<SubscriptionTiers />} />
            <Route path="settings" element={<ProfilePage />} />
            <Route path="support" element={<SupportCenter />} />
            <Route path="notifications" element={<NotificationsPage />} />
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

export default SellerDashboard;

