import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GachaProvider } from "./context/GachaContext";
import { I18nProvider } from "./context/I18nContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminRouteErrorBoundary from "./components/AdminRouteErrorBoundary";
import Index from "./pages/Index.tsx";

import AnimatedRoutes from "./components/PageTransition";
import RouterReadyBridge from "./components/RouterReadyBridge";
import MaintenanceGate from "./components/MaintenanceGate";

// Defer non-critical headless components — they don't affect first paint of the home page
// and pull in realtime/trade hooks + framer-motion-adjacent code that we don't need eagerly.
const GlobalTransactionWatcher = lazy(() => import("./components/GlobalTransactionWatcher"));
const TradeNotifDebugPanel = lazy(() =>
  import("./components/TradeNotifDebugPanel").then((m) => ({ default: m.TradeNotifDebugPanel }))
);



/** Mounts children after the browser is idle (or after a short timeout) so they don't block FCP/LCP. */
const DeferIdle = ({ children, timeout = 2000 }: { children: React.ReactNode; timeout?: number }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      const id = ric(() => setReady(true), { timeout });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), timeout);
    return () => clearTimeout(t);
  }, [timeout]);
  if (!ready) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
};

// Lazy-loaded routes — code-split to reduce initial JS bundle size & parse/eval time on home.
const CampaignDetail = lazy(() => import("./pages/CampaignDetail.tsx"));
const Inventory = lazy(() => import("./pages/Inventory.tsx"));
const DrawHistory = lazy(() => import("./pages/DrawHistory.tsx"));
const ClaimHistory = lazy(() => import("./pages/ClaimHistory.tsx"));
const TopUp = lazy(() => import("./pages/TopUp.tsx"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory.tsx"));
const TransactionDetail = lazy(() => import("./pages/TransactionDetail.tsx"));
const Leaderboard = lazy(() => import("./pages/Leaderboard.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const Register = lazy(() => import("./pages/Register.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const AboutUs = lazy(() => import("./pages/AboutUs.tsx"));
const ContactUs = lazy(() => import("./pages/ContactUs.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const RedeemStore = lazy(() => import("./pages/RedeemStore.tsx"));
const GiftCoins = lazy(() => import("./pages/GiftCoins.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const TradeNew = lazy(() => import("./pages/TradeNew.tsx"));
const FAQ = lazy(() => import("./pages/FAQ.tsx"));
const TradeRequest = lazy(() => import("./pages/TradeRequest.tsx"));

// Admin routes — heavy & only used by admins, fully split out.
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminBannedUsers = lazy(() => import("./pages/admin/AdminBannedUsers.tsx"));
const AdminCampaigns = lazy(() => import("./pages/admin/AdminCampaigns.tsx"));
const AdminProbability = lazy(() => import("./pages/admin/AdminProbability.tsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.tsx"));
const AdminClaims = lazy(() => import("./pages/admin/AdminClaims.tsx"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages.tsx"));
const AdminPitySettings = lazy(() => import("./pages/admin/AdminPitySettings.tsx"));
const AdminRewards = lazy(() => import("./pages/admin/AdminRewards.tsx"));
const AdminCoinPackages = lazy(() => import("./pages/admin/AdminCoinPackages.tsx"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons.tsx"));
const AdminShipping = lazy(() => import("./pages/admin/AdminShipping.tsx"));
const AdminGachaLogs = lazy(() => import("./pages/admin/AdminGachaLogs.tsx"));
const AdminStockAudit = lazy(() => import("./pages/admin/AdminStockAudit.tsx"));
const AdminPaymentSettings = lazy(() => import("./pages/admin/AdminPaymentSettings.tsx"));
const AdminMaintenance = lazy(() => import("./pages/admin/AdminMaintenance.tsx"));
const AdminPromoBanners = lazy(() => import("./pages/admin/AdminPromoBanners.tsx"));
const AdminGiftAudit = lazy(() => import("./pages/admin/AdminGiftAudit.tsx"));

const queryClient = new QueryClient();



const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
    <TooltipProvider>
      <I18nProvider>
      <AuthProvider>
      <NotificationsProvider>
      <GachaProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouterReadyBridge />
          <DeferIdle>
            <GlobalTransactionWatcher />
            <TradeNotifDebugPanel />
          </DeferIdle>
          <MaintenanceGate>
          {/* Suspense + neon progress bar are handled inside AnimatedRoutes */}
            <AnimatedRoutes>
              <Route path="/" element={<Index />} />
              {/* SEO-friendly slug route. Old ID-based URLs are also accepted
                  here — CampaignDetail resolves either and 301-style redirects
                  to the canonical slug. */}
              <Route path="/campaign/:slug" element={<CampaignDetail />} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><DrawHistory /></ProtectedRoute>} />
              <Route path="/claims" element={<ProtectedRoute><ClaimHistory /></ProtectedRoute>} />
              <Route path="/topup" element={<ProtectedRoute><TopUp /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
              <Route path="/transactions/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
              <Route path="/redeem" element={<ProtectedRoute><RedeemStore /></ProtectedRoute>} />
              <Route path="/gift" element={<ProtectedRoute><GiftCoins /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/trade/new" element={<ProtectedRoute><TradeNew /></ProtectedRoute>} />
              <Route path="/trade/req/:token" element={<ProtectedRoute><TradeRequest /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminRouteErrorBoundary><AdminProtectedRoute><AdminLayout /></AdminProtectedRoute></AdminRouteErrorBoundary>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="banned-users" element={<AdminBannedUsers />} />
                <Route path="campaigns" element={<AdminCampaigns />} />
                <Route path="probability" element={<AdminProbability />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="claims" element={<AdminClaims />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="pity" element={<AdminPitySettings />} />
                <Route path="rewards" element={<AdminRewards />} />
                <Route path="coin-packages" element={<AdminCoinPackages />} />
                <Route path="coupons" element={<AdminCoupons />} />
                <Route path="shipping" element={<AdminShipping />} />
                <Route path="gacha-logs" element={<AdminGachaLogs />} />
                <Route path="stock-audit" element={<AdminStockAudit />} />
                <Route path="payment-settings" element={<AdminPaymentSettings />} />
                <Route path="maintenance" element={<AdminMaintenance />} />
                <Route path="promo-banners" element={<AdminPromoBanners />} />
                <Route path="gift-audit" element={<AdminGiftAudit />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </AnimatedRoutes>
          
          </MaintenanceGate>
        </BrowserRouter>
      </GachaProvider>
      </NotificationsProvider>
      </AuthProvider>
      </I18nProvider>
    </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
