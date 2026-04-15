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
import CampaignDetail from "./pages/CampaignDetail.tsx";
import Inventory from "./pages/Inventory.tsx";
import DrawHistory from "./pages/DrawHistory.tsx";
import ClaimHistory from "./pages/ClaimHistory.tsx";
import TopUp from "./pages/TopUp.tsx";
import TransactionHistory from "./pages/TransactionHistory.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AboutUs from "./pages/AboutUs.tsx";
import ContactUs from "./pages/ContactUs.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminCampaigns from "./pages/admin/AdminCampaigns.tsx";
import AdminProbability from "./pages/admin/AdminProbability.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminClaims from "./pages/admin/AdminClaims.tsx";
import AdminMessages from "./pages/admin/AdminMessages.tsx";
import AdminPitySettings from "./pages/admin/AdminPitySettings.tsx";
import AdminRewards from "./pages/admin/AdminRewards.tsx";
import AdminCoinPackages from "./pages/admin/AdminCoinPackages.tsx";
import AdminCoupons from "./pages/admin/AdminCoupons.tsx";
import RedeemStore from "./pages/RedeemStore.tsx";
import GiftCoins from "./pages/GiftCoins.tsx";
import Profile from "./pages/Profile.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
      <AuthProvider>
      <GachaProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/campaign/:id" element={<CampaignDetail />} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><DrawHistory /></ProtectedRoute>} />
            <Route path="/claims" element={<ProtectedRoute><ClaimHistory /></ProtectedRoute>} />
            <Route path="/topup" element={<ProtectedRoute><TopUp /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><TransactionHistory /></ProtectedRoute>} />
            <Route path="/redeem" element={<ProtectedRoute><RedeemStore /></ProtectedRoute>} />
            <Route path="/gift" element={<ProtectedRoute><GiftCoins /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
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
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="probability" element={<AdminProbability />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="claims" element={<AdminClaims />} />
              <Route path="messages" element={<AdminMessages />} />
              <Route path="pity" element={<AdminPitySettings />} />
              <Route path="rewards" element={<AdminRewards />} />
              <Route path="coin-packages" element={<AdminCoinPackages />} />
              <Route path="coupons" element={<AdminCoupons />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GachaProvider>
      </AuthProvider>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
