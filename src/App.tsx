import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GachaProvider } from "./context/GachaContext";
import { I18nProvider } from "./context/I18nContext";
import Index from "./pages/Index.tsx";
import CampaignDetail from "./pages/CampaignDetail.tsx";
import Inventory from "./pages/Inventory.tsx";
import DrawHistory from "./pages/DrawHistory.tsx";
import TopUp from "./pages/TopUp.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
      <GachaProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/campaign/:id" element={<CampaignDetail />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/history" element={<DrawHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GachaProvider>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
