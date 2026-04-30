import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ScrollToTop } from './components/ScrollToTop';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyOTP } from './pages/VerifyOTP';
import { VerifyEmail } from './pages/VerifyEmail';
import { VerifyEmailPending } from './pages/VerifyEmailPending';
import { GoogleCallback } from './pages/GoogleCallback';
import { SelectRole } from './pages/SelectRole';
import { ApproveDeviceSuccess } from './pages/ApproveDeviceSuccess';
import AuthPage from './pages/AuthPage';
import { ForgotPassword } from './pages/ForgotPassword';
import SellerDashboard from './components/SellerDashboard';
import SellerRoute from './components/SellerRoute';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './components/AdminDashboard';
import { useAuthStore } from './stores/authStore';
import { ToastNotification } from './components/ToastNotification';
import { SecurityTelemetryProbe } from './components/SecurityTelemetryProbe';
// @ts-ignore JSX module without TS typings
import CartDrawer from './components/CartDrawer';
// @ts-ignore JSX module without TS typings
import Navbar from './components/Navbar';
// @ts-ignore JSX module without TS typings
import MobileBottomNav from './components/MobileBottomNav';
import AssistantChat from './components/AssistantChat';
import { websocketService } from './services/websocketService';
// @ts-ignore Zustand JS store without TS types
import { useBuyerCart } from './stores/buyerCartStore';

/*
 * Paths where the buyer Navbar should NOT be rendered.
 * Auth pages, seller, and admin dashboards use their own chrome.
 */
const NO_NAV_PREFIXES = [
  '/auth', '/login', '/signup', '/forgot-password', '/reset-password',
  '/verify-email', '/verify-otp', '/select-role', '/auth/google',
  '/approve-device-success', '/seller', '/admin', '/dashboard',
];

/**
 * Renders the buyer Navbar OUTSIDE the cart-push motion.div so that
 * `position: fixed` is always relative to the real viewport, never to a
 * CSS-transformed ancestor.  Without this, the nav would disappear as soon
 * as the user starts scrolling (the transformed parent scrolls up with the
 * page, dragging the "fixed" nav along).
 */
function GlobalNavbar() {
  const { pathname } = useLocation();
  const isSellerPending = pathname === '/seller/pending';
  const hidden = NO_NAV_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p),
  );
  if (isSellerPending) return <Navbar />;
  if (hidden) return null;
  return <Navbar />;
}

// ── Buyer pages (lazy) ────────────────────────────────────────────────────────
// @ts-ignore JSX modules without TS typings
const BuyerHome            = lazy(() => import('./pages/Home'));
// @ts-ignore JSX modules without TS typings
const BuyerProductDetail   = lazy(() => import('./pages/ProductDetail'));
// @ts-ignore JSX modules without TS typings
const SearchResults        = lazy(() => import('./pages/SearchResults'));
// @ts-ignore JSX modules without TS typings
const Checkout             = lazy(() => import('./pages/Checkout'));
// @ts-ignore JSX module without TS typings
const MomoPaymentWait      = lazy(() => import('./pages/MomoPaymentWait'));
const StripeReturn         = lazy(() => import('./pages/StripeReturn'));
const PayPalReturn         = lazy(() => import('./pages/PayPalReturn'));
// @ts-ignore JSX modules without TS typings
const OrderConfirmation    = lazy(() => import('./pages/OrderConfirmation'));
// @ts-ignore JSX modules without TS typings
const OrderTracking        = lazy(() => import('./pages/OrderTracking'));
// @ts-ignore JSX modules without TS typings
const BuyerDashboard       = lazy(() => import('./pages/BuyerDashboard'));
// @ts-ignore JSX modules without TS typings
const Returns              = lazy(() => import('./pages/Returns'));
// @ts-ignore JSX modules without TS typings
const Messages             = lazy(() => import('./pages/Messages'));
// @ts-ignore JSX modules without TS typings
const BuyerNotifications   = lazy(() => import('./pages/BuyerNotifications'));
// @ts-ignore JSX modules without TS typings
const Contact              = lazy(() => import('./pages/Contact'));
const ReportProblem        = lazy(() => import('./pages/ReportProblem'));
const SellerFees           = lazy(() => import('./pages/SellerFees'));
const BuyerProtection      = lazy(() => import('./pages/BuyerProtection'));
const CookieSettings       = lazy(() => import('./pages/CookieSettings'));
const Terms                = lazy(() => import('./pages/Terms'));
const BecomeSeller         = lazy(() => import('./pages/BecomeSeller'));
const SellerProtection     = lazy(() => import('./pages/seller/SellerProtection'));
const SellerGuidelines     = lazy(() => import('./pages/seller/SellerGuidelines'));
const SellerAdvertise      = lazy(() => import('./pages/seller/AdvertiseWithUs'));
const SellerPending        = lazy(() => import('./pages/seller/SellerPending'));

/** Redirects /login and /signup to /auth?tab=... while preserving query (e.g. redirect=) */
function RedirectToAuth({ tab }: { tab: 'login' | 'signup' }) {
  const location = useLocation();
  const search = location.search ? `tab=${tab}&${location.search.slice(1)}` : `tab=${tab}`;
  return <Navigate to={`/auth?${search}`} replace />;
}

function DashboardRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.email_verified !== true) {
    return (
      <Navigate
        to={`/verify-otp?email=${encodeURIComponent(user.email)}`}
        replace
      />
    );
  }
  if (user.role === 'seller') return <Navigate to="/seller" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/account" replace />;
}

function HomeRouteGuard() {
  const { user, loading, initialized } = useAuthStore();
  if (!initialized || loading) return <PageLoader />;
  if (user && user.email_verified !== true) {
    return (
      <Navigate
        to={`/verify-otp?email=${encodeURIComponent(user.email)}`}
        replace
      />
    );
  }
  return <BuyerHome />;
}

function AccountRouteGuard() {
  const { user, loading, initialized } = useAuthStore();
  if (!initialized || loading) return <PageLoader />;
  if (user && user.email_verified !== true) {
    return (
      <Navigate
        to={`/verify-otp?email=${encodeURIComponent(user.email)}`}
        replace
      />
    );
  }
  return <BuyerDashboard />;
}

const PageLoader = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg,#f5f7fa,#e4e7eb)' }}
  >
    <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
  </div>
);

/** Keeps Socket.IO connected for signed-in users so system inbox updates reach the bell in real time. */
function GlobalRealtimeBridge() {
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!user?.id || !localStorage.getItem('auth_token')) {
      websocketService.onSystemInboxNotification = undefined;
      websocketService.disconnect();
      return;
    }
    websocketService.connect();
    websocketService.onSystemInboxNotification = () => {
      window.dispatchEvent(new Event('systemInboxUnreadRefresh'));
    };
    return () => {
      websocketService.onSystemInboxNotification = undefined;
    };
  }, [user?.id]);
  return null;
}

function App() {
  const { initialize } = useAuthStore();
  const cartOpen = useBuyerCart((s: any) => s.cartOpen);
  useEffect(() => { initialize(); }, [initialize]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <GlobalRealtimeBridge />
        <SecurityTelemetryProbe />
        <ToastNotification />
        {/* CartDrawer, GlobalNavbar and MobileBottomNav stay fixed to the real viewport. */}
        <CartDrawer />
        <GlobalNavbar />
        <MobileBottomNav />

        {/*
          The cart drawer used to push the page with transform: translateX(...).
          That created a transformed ancestor around the GSAP-pinned hero and made
          ScrollTrigger vibrate while scrolling.  This keeps the same right-docked
          cart behavior by reserving drawer space with layout width instead of a
          transform, so pinned sections remain anchored to the viewport cleanly.
        */}
        <div style={{ overflowX: 'clip', minHeight: '100vh' }}>
          <div
            style={{
              minHeight: '100vh',
              width: cartOpen ? 'calc(100% - min(100vw, 480px))' : '100%',
              minWidth: 0,
              transition: 'width 420ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
          <AssistantChat />
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* ── Buyer / Storefront ── */}
            <Route path="/"                            element={<HomeRouteGuard />} />
            <Route path="/search"                      element={<SearchResults />} />
            <Route path="/products"                     element={<SearchResults />} />
            <Route path="/products/:id"                element={<BuyerProductDetail />} />
            <Route path="/checkout"                    element={<Checkout />} />
            <Route path="/checkout/momo-wait"          element={<MomoPaymentWait />} />
            <Route path="/payment/stripe-return"       element={<StripeReturn />} />
            <Route path="/payment/paypal-return"       element={<PayPalReturn />} />
            <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
            <Route path="/track/:orderId"              element={<OrderTracking />} />
            <Route path="/track"                       element={<OrderTracking />} />
            <Route path="/account"                     element={<AccountRouteGuard />} />
            <Route path="/notifications"               element={<BuyerNotifications />} />
            <Route path="/returns"                     element={<Returns />} />
            <Route path="/messages"                    element={<Messages />} />
            <Route path="/help"                        element={<BuyerHome />} />
            <Route path="/contact"                     element={<Contact />} />
            <Route path="/report-problem"              element={<ReportProblem />} />
            <Route path="/report-problem/:ticketId"    element={<ReportProblem />} />
            <Route path="/seller/fees"                 element={<SellerFees />} />
            <Route path="/buyer-protection"            element={<BuyerProtection />} />
            <Route path="/cookie-settings"             element={<CookieSettings />} />
            <Route path="/terms"                       element={<Terms />} />
            <Route path="/seller/protection"           element={(
              <SellerRoute>
                <SellerProtection />
              </SellerRoute>
            )}
            />
            <Route path="/seller/guidelines"           element={<SellerGuidelines />} />
            <Route path="/seller/advertise"            element={<SellerAdvertise />} />
            <Route path="/seller/pending"              element={<SellerPending />} />
            <Route path="/become-seller"               element={<BecomeSeller />} />
            <Route path="/cart"                        element={<Navigate to="/" replace />} />

            {/* ── Auth (single page: login / signup / forgot) ── */}
            <Route path="/auth"            element={<AuthPage />} />
            <Route path="/login"          element={<RedirectToAuth tab="login" />} />
            <Route path="/signup"          element={<RedirectToAuth tab="signup" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* ── Full-page auth flows ── */}
            <Route path="/reset-password"         element={<ResetPassword />} />
            <Route path="/verify-email"           element={<VerifyEmail />} />
            <Route path="/verify-email-pending"   element={<VerifyEmailPending />} />
            <Route path="/verify-otp"             element={<VerifyOTP />} />
            <Route path="/auth/google/callback"   element={<GoogleCallback />} />
            <Route path="/auth/google/select-role" element={<SelectRole />} />
            <Route path="/auth/approve-device-success" element={<ApproveDeviceSuccess />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* ── Dashboards ── */}
            <Route
              path="/seller/*"
              element={(
                <SellerRoute>
                  <SellerDashboard />
                </SellerRoute>
              )}
            />
            <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
