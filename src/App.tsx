import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GachaProvider } from "./context/GachaContext";
import { I18nProvider } from "./context/I18nContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import Index from "./pages/Index.tsx";
import GlobalTransactionWatcher from "./components/GlobalTransactionWatcher";

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
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const RedeemStore = lazy(() => import("./pages/RedeemStore.tsx"));
const GiftCoins = lazy(() => import("./pages/GiftCoins.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));

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
const AdminPaymentSettings = lazy(() => import("./pages/admin/AdminPaymentSettings.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
      <AuthProvider>
      <GachaProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalTransactionWatcher />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/campaign/:id" element={<CampaignDetail />} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><DrawHistory /></ProtectedRoute>} />
              <Route path="/claims" element={<ProtectedRoute><ClaimHistory /></ProtectedRoute>} />
              <Route path="/topup" element={<ProtectedRoute><TopUp /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
              <Route path="/transactions/:id" element={<ProtectedRoute><TransactionDetail /></ProtectedRoute>} />
              <Route path="/redeem" element={<ProtectedRoute><RedeemStore /></ProtectedRoute>} />
              <Route path="/gift" element={<ProtectedRoute><GiftCoins /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
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
                <Route path="payment-settings" element={<AdminPaymentSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </GachaProvider>
      </AuthProvider>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
