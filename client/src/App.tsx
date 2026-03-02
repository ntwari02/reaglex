import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ScrollToTop } from './components/ScrollToTop';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyOTP } from './pages/VerifyOTP';
import { GoogleCallback } from './pages/GoogleCallback';
import { SelectRole } from './pages/SelectRole';
import SellerDashboard from './components/SellerDashboard';
import AdminDashboard from './components/AdminDashboard';
import { useAuthStore } from './stores/authStore';
import { useAuthModal } from './stores/authModalStore';
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
  <div className="min-h-screen flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg,#f5f7fa,#e4e7eb)' }}>
    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
  </div>
);

// Opens auth modal then redirects home
function OpenModal({ tab }: { tab: 'login' | 'signup' | 'forgot' }) {
  const navigate = useNavigate();
  const open = useAuthModal((s) => s.open);
  useEffect(() => { open(tab); navigate('/', { replace: true }); }, []);
  return null;
}

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

            {/* ── Auth (open modal) ── */}
            <Route path="/login"          element={<OpenModal tab="login" />} />
            <Route path="/signup"         element={<OpenModal tab="signup" />} />
            <Route path="/forgot-password" element={<OpenModal tab="forgot" />} />

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
