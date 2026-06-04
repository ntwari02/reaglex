import { useEffect, lazy, Suspense } from 'react';
import { LayoutGroup } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryProvider } from './providers/QueryProvider';
import StreamProvider from './providers/StreamProvider';
import { ScrollToTop } from './components/ScrollToTop';
import SpaBuyerShell from './spa/SpaBuyerShell';
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
import { useSystemFeatures } from './hooks/useSystemFeatures';
import LiveCommerceRouteGuard from './components/platform/LiveCommerceRouteGuard';
import BuyerShellGuard from './components/BuyerShellGuard';
import NotFoundRedirect from './components/NotFoundRedirect';
import { canAccessBuyerUi, getDashboardPathForRole } from './lib/authRouting';
import { ToastNotification } from './components/ToastNotification';
import { SecurityTelemetryProbe } from './components/SecurityTelemetryProbe';
// @ts-ignore JSX module without TS typings
import CartDrawer from './components/CartDrawer';
// @ts-ignore JSX module without TS typings
import Navbar from './components/Navbar';
// @ts-ignore JSX module without TS typings
import MobileBottomNav from './components/MobileBottomNav';
// @ts-ignore JSX module without TS typings
import MobileMenuOverlay from './components/menu/MobileMenuOverlay';
// @ts-ignore JSX module without TS typings
import ImmersiveSearchLayer from './components/search/ImmersiveSearchLayer';
// @ts-ignore JSX modules without TS typings
import VisualSearchLayer from './components/search/VisualSearchLayer';
// @ts-ignore JSX modules without TS typings
import ProductQuickPreviewSheet from './components/product/ProductQuickPreviewSheet';
// @ts-ignore JSX modules without TS typings
import ArTryOnLayer from './components/ar/ArTryOnLayer';
// @ts-ignore JSX modules without TS typings
import FlyToCartBurst from './components/motion/FlyToCartBurst';
// @ts-ignore JSX modules without TS typings
import BuyerGestureShell from './components/motion/BuyerGestureShell';
import AssistantChat from './components/AssistantChat';
import { PwaRoot, ShareTargetHandler, DeepLinkHandler } from './pwa';
import { websocketService } from './services/websocketService';
// @ts-ignore Zustand JS store without TS types
import { useBuyerCart } from './stores/buyerCartStore';
import CartCloudSyncBridge from './components/cart/CartCloudSyncBridge';
// @ts-ignore JS module without TS typings
import { isBuyerChromeHidden, isBuyerHeaderHidden } from './config/buyerNavVisibility';
import { SiteWideSchemas } from './components/seo/SiteWideSchemas';
import { ClientOnly } from './components/ClientOnly';

/**
 * Renders the buyer Navbar OUTSIDE the cart-push motion.div so that
 * `position: fixed` is always relative to the real viewport, never to a
 * CSS-transformed ancestor.  Without this, the nav would disappear as soon
 * as the user starts scrolling (the transformed parent scrolls up with the
 * page, dragging the "fixed" nav along).
 */
function GlobalNavbar() {
  const { pathname, search } = useLocation();
  const user = useAuthStore((s) => s.user);
  const isSellerPending = pathname === '/seller/pending';
  if (isSellerPending) return <Navbar />;
  if (user && !canAccessBuyerUi(user)) return null;
  if (isBuyerChromeHidden(pathname, search)) return null;
  if (isBuyerHeaderHidden(pathname)) return null;
  return <Navbar />;
}

function GlobalMobileBottomNav() {
  const user = useAuthStore((s) => s.user);
  const { pathname, search } = useLocation();
  if (user && !canAccessBuyerUi(user)) return null;
  if (isBuyerChromeHidden(pathname, search)) return null;
  return <MobileBottomNav />;
}

function GlobalMobileMenuOverlay() {
  const user = useAuthStore((s) => s.user);
  const { pathname, search } = useLocation();
  if (user && !canAccessBuyerUi(user)) return null;
  if (isBuyerChromeHidden(pathname, search)) return null;
  return <MobileMenuOverlay />;
}

function GlobalAssistantChat() {
  const user = useAuthStore((s) => s.user);
  const { isEnabled, loading } = useSystemFeatures();
  if (user && !canAccessBuyerUi(user)) return null;
  if (!loading && !isEnabled('buyer_assistant_chat')) return null;
  return <AssistantChat />;
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
// @ts-ignore JSX module without TS typings
const StripeReturn         = lazy(() => import('./pages/StripeReturn'));
// @ts-ignore JSX module without TS typings
const PayPalReturn         = lazy(() => import('./pages/PayPalReturn'));
// @ts-ignore JSX module without TS typings
const PaymentVerify        = lazy(() => import('./pages/PaymentVerify'));
// @ts-ignore JSX modules without TS typings
const OrderConfirmation    = lazy(() => import('./pages/OrderConfirmation'));
// @ts-ignore JSX modules without TS typings
const OrderTracking        = lazy(() => import('./pages/OrderTracking'));
// @ts-ignore JSX modules without TS typings
const BuyerDashboard       = lazy(() => import('./pages/BuyerDashboard'));
// @ts-ignore JSX modules without TS typings
const Returns              = lazy(() => import('./pages/Returns'));
// @ts-ignore JSX modules without TS typings
// @ts-ignore JSX modules without TS typings
const BuyerNotifications   = lazy(() => import('./pages/BuyerNotifications'));
// @ts-ignore JSX modules without TS typings
const Contact              = lazy(() => import('./pages/Contact'));
const ReportProblem        = lazy(() => import('./pages/ReportProblem'));
const SellerFees           = lazy(() => import('./pages/SellerFees'));
const BuyerProtection      = lazy(() => import('./pages/BuyerProtection'));
const CookieSettings       = lazy(() => import('./pages/CookieSettings'));
const Privacy              = lazy(() => import('./pages/Privacy'));
const CookiesPolicy        = lazy(() => import('./pages/CookiesPolicy'));
const SitemapPage          = lazy(() => import('./pages/Sitemap'));
const Faq                  = lazy(() => import('./pages/Faq'));
const Terms                = lazy(() => import('./pages/Terms'));
const BecomeSeller         = lazy(() => import('./pages/BecomeSeller'));
const SellerProtection     = lazy(() => import('./pages/seller/SellerProtection'));
const SellerGuidelines     = lazy(() => import('./pages/seller/SellerGuidelines'));
const SellerAdvertise      = lazy(() => import('./pages/seller/AdvertiseWithUs'));
const SellerPending        = lazy(() => import('./pages/seller/SellerPending'));
const About                = lazy(() => import('./pages/About'));
const CategoryBrowse       = lazy(() => import('./pages/CategoryBrowse'));
// @ts-ignore JSX module without TS typings
const ExploreAll           = lazy(() => import('./pages/ExploreAll'));
// @ts-ignore JSX module without TS typings
const LiveDiscover         = lazy(() => import('./pages/LiveDiscover'));
// @ts-ignore JSX module without TS typings
const LiveSession          = lazy(() => import('./pages/LiveSession'));
const HelpCenter           = lazy(() => import('./pages/HelpCenter'));
const HelpSearch           = lazy(() => import('./pages/HelpSearch'));
const HelpCategory         = lazy(() => import('./pages/HelpCategory'));
const HelpArticle          = lazy(() => import('./pages/HelpArticle'));

/** Redirects /login and /signup to /auth?tab=... while preserving query (e.g. redirect=) */
function RedirectToAuth({ tab }: { tab: 'login' | 'signup' }) {
  const location = useLocation();
  const search = location.search ? `tab=${tab}&${location.search.slice(1)}` : `tab=${tab}`;
  return <Navigate to={`/auth?${search}`} replace />;
}

function DashboardRedirect() {
  const { user, loading, initialized } = useAuthStore();
  if (!initialized || loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.email_verified !== true) {
    return (
      <Navigate
        to={`/verify-otp?email=${encodeURIComponent(user.email)}`}
        replace
      />
    );
  }
  return <Navigate to={getDashboardPathForRole(user.role)} replace />;
}

function HomeRouteGuard() {
  const { user, loading, initialized } = useAuthStore();
  if (!initialized || loading) return <PageLoader />;
  if (user && user.role !== 'buyer') {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }
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
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'buyer') {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }
  if (user.email_verified !== true) {
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
    className="min-h-screen flex flex-col items-center justify-center gap-3"
    style={{ background: 'var(--buyer-page-loader-bg)' }}
  >
    <div
      className="w-12 h-12 rounded-full border-4 animate-spin"
      style={{
        borderColor: 'var(--loading-spinner-track)',
        borderTopColor: 'var(--loading-spinner)',
      }}
      aria-hidden
    />
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
    websocketService.onInventoryUpdated = (payload) => {
      window.dispatchEvent(new CustomEvent('inventoryUpdated', { detail: payload }));
    };
    websocketService.onSellerKycUpdated = (payload) => {
      window.dispatchEvent(new CustomEvent('sellerKycUpdated', { detail: payload }));
    };
    return () => {
      websocketService.onSystemInboxNotification = undefined;
      websocketService.onInventoryUpdated = undefined;
      websocketService.onSellerKycUpdated = undefined;
    };
  }, [user?.id]);
  return null;
}

function App() {
  const { initialize } = useAuthStore();
  const cartOpen = useBuyerCart((s: any) => s.cartOpen);
  useEffect(() => { initialize(); }, [initialize]);

  return (
    <HelmetProvider>
    <ThemeProvider>
    <QueryProvider>
      <BrowserRouter>
        <StreamProvider>
        <SiteWideSchemas />
        <ScrollToTop />
        <GlobalRealtimeBridge />
        <CartCloudSyncBridge />
        <SecurityTelemetryProbe />
        <ToastNotification />
        <PwaRoot />
        {/* CartDrawer, GlobalNavbar and MobileBottomNav stay fixed to the real viewport. */}
        <CartDrawer />
        <GlobalNavbar />
        <GlobalMobileBottomNav />
        <GlobalMobileMenuOverlay />
        <ImmersiveSearchLayer />
        <ClientOnly>
          <VisualSearchLayer />
          <ArTryOnLayer />
        </ClientOnly>
        <ProductQuickPreviewSheet />
        <FlyToCartBurst />

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
          <GlobalAssistantChat />
          <BuyerGestureShell>
          <LayoutGroup id="buyer-product-transitions">
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* ── Buyer / Storefront (SPA keep-alive + scroll cache) ── */}
            <Route element={<BuyerShellGuard />}>
            <Route element={<SpaBuyerShell />}>
              <Route path="/" element={<HomeRouteGuard />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/products" element={<SearchResults />} />
              <Route path="/category/all" element={<SearchResults />} />
              <Route path="/explore" element={<ExploreAll />} />
              <Route path="/live" element={<LiveCommerceRouteGuard><LiveDiscover /></LiveCommerceRouteGuard>} />
              <Route path="/live/:sessionId" element={<LiveCommerceRouteGuard><LiveSession /></LiveCommerceRouteGuard>} />
              <Route path="/category" element={<CategoryBrowse />} />
              <Route path="/category/:slug" element={<CategoryBrowse />} />
              <Route path="/product/:slug" element={<BuyerProductDetail />} />
              <Route path="/products/:id" element={<BuyerProductDetail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/momo-wait" element={<MomoPaymentWait />} />
              <Route path="/payment/stripe-return" element={<StripeReturn />} />
              <Route path="/payment/paypal-return" element={<PayPalReturn />} />
              <Route path="/payment/verify" element={<PaymentVerify />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
              <Route path="/track/:orderId" element={<OrderTracking />} />
              <Route path="/track" element={<OrderTracking />} />
              <Route path="/account" element={<AccountRouteGuard />} />
              <Route path="/notifications" element={<BuyerNotifications />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/help/search" element={<HelpSearch />} />
              <Route path="/help/:category/:article" element={<HelpArticle />} />
              <Route path="/help/:category" element={<HelpCategory />} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/profile" element={<Navigate to="/account" replace />} />
              <Route path="/report-problem" element={<ReportProblem />} />
              <Route path="/report-problem/:ticketId" element={<ReportProblem />} />
              <Route path="/seller/fees" element={<SellerFees />} />
              <Route path="/buyer-protection" element={<BuyerProtection />} />
              <Route path="/cookie-settings" element={<CookieSettings />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/cookies" element={<CookiesPolicy />} />
              <Route path="/sitemap" element={<SitemapPage />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/seller/protection" element={(
                <SellerRoute>
                  <SellerProtection />
                </SellerRoute>
              )}
              />
              <Route path="/seller/guidelines" element={<SellerGuidelines />} />
              <Route path="/seller/advertise" element={<SellerAdvertise />} />
              <Route path="/seller/pending" element={<SellerPending />} />
              <Route path="/become-seller" element={<BecomeSeller />} />
              <Route path="/cart" element={<Navigate to="/" replace />} />
            </Route>
            </Route>

            {/* ── PWA system routes ── */}
            <Route path="/share"                       element={<ShareTargetHandler />} />
            <Route path="/deep"                        element={<DeepLinkHandler />} />

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

            <Route path="*" element={<NotFoundRedirect />} />
            </Routes>
          </Suspense>
          </LayoutGroup>
          </BuyerGestureShell>
          </div>
        </div>
        </StreamProvider>
      </BrowserRouter>
    </QueryProvider>
    </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
