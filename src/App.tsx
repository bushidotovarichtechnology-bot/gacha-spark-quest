import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GachaProvider } from "./context/GachaContext";
import { I18nProvider } from "./context/I18nContext";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index.tsx";
import CampaignDetail from "./pages/CampaignDetail.tsx";
import Inventory from "./pages/Inventory.tsx";
import DrawHistory from "./pages/DrawHistory.tsx";
import TopUp from "./pages/TopUp.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import NotFound from "./pages/NotFound.tsx";

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
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/history" element={<DrawHistory />} />
            <Route path="/topup" element={<TopUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
