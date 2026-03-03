import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ScrollToTop } from './components/ScrollToTop';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyOTP } from './pages/VerifyOTP';
import { GoogleCallback } from './pages/GoogleCallback';
import { SelectRole } from './pages/SelectRole';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import SellerDashboard from './components/SellerDashboard';
import AdminDashboard from './components/AdminDashboard';
import { useAuthStore } from './stores/authStore';
import { ToastNotification } from './components/ToastNotification';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';

// ── Buyer pages (lazy) ────────────────────────────────────────────────────────
const BuyerHome            = lazy(() => import('./pages/Home'));
const BuyerProductDetail   = lazy(() => import('./pages/ProductDetail'));
const SearchResults        = lazy(() => import('./pages/SearchResults'));
const Checkout             = lazy(() => import('./pages/Checkout'));
const OrderConfirmation    = lazy(() => import('./pages/OrderConfirmation'));
const OrderTracking        = lazy(() => import('./pages/OrderTracking'));
const BuyerDashboard       = lazy(() => import('./pages/BuyerDashboard'));
const Returns              = lazy(() => import('./pages/Returns'));
const Messages             = lazy(() => import('./pages/Messages'));
const BuyerNotifications   = lazy(() => import('./pages/BuyerNotifications'));

const PageLoader = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg,#f5f7fa,#e4e7eb)' }}
  >
    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
  </div>
);

function App() {
  const { initialize } = useAuthStore();
  useEffect(() => { initialize(); }, [initialize]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <ToastNotification />
        <CartDrawer />
        <AuthModal />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Buyer / Storefront ── */}
            <Route path="/"                            element={<BuyerHome />} />
            <Route path="/search"                      element={<SearchResults />} />
            <Route path="/products"                     element={<SearchResults />} />
            <Route path="/products/:id"                element={<BuyerProductDetail />} />
            <Route path="/checkout"                    element={<Checkout />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
            <Route path="/track/:orderId"              element={<OrderTracking />} />
            <Route path="/track"                       element={<OrderTracking />} />
            <Route path="/account"                     element={<BuyerDashboard />} />
            <Route path="/notifications"               element={<BuyerNotifications />} />
            <Route path="/returns"                     element={<Returns />} />
            <Route path="/messages"                    element={<Messages />} />
            <Route path="/cart"                        element={<Navigate to="/" replace />} />

            {/* ── Auth (full pages) ── */}
            <Route path="/login"           element={<Login />} />
            <Route path="/signup"          element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* ── Full-page auth flows ── */}
            <Route path="/reset-password"         element={<ResetPassword />} />
            <Route path="/verify-otp"             element={<VerifyOTP />} />
            <Route path="/auth/google/callback"   element={<GoogleCallback />} />
            <Route path="/auth/google/select-role" element={<SelectRole />} />

            {/* ── Dashboards ── */}
            <Route path="/seller/*" element={<SellerDashboard />} />
            <Route path="/admin/*"  element={<AdminDashboard />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
