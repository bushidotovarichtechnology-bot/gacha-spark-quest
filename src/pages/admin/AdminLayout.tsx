import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LayoutDashboard, Users, Package, Settings, LogOut, Home, FolderTree, PackageCheck, Mail, Star, Gift, Coins, Ticket, Truck, ScrollText, Ban, CreditCard, Zap, FlaskConical, Wrench, Boxes, Megaphone } from "lucide-react";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/banned-users", label: "Banned Users", icon: Ban },
  { to: "/admin/campaigns", label: "Campaigns", icon: Package },
  { to: "/admin/promo-banners", label: "Promo Banners", icon: Megaphone },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/claims", label: "Prize Claims", icon: PackageCheck },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/pity", label: "Pity System", icon: Star },
  { to: "/admin/probability", label: "Probability", icon: Settings },
  { to: "/admin/rewards", label: "Rewards", icon: Gift },
  { to: "/admin/coin-packages", label: "Coin Packages", icon: Coins },
  { to: "/admin/coupons", label: "Kupon", icon: Ticket },
  { to: "/admin/shipping", label: "Tarif Ongkir", icon: Truck },
  { to: "/admin/payment-settings", label: "Pembayaran", icon: CreditCard },
  { to: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/admin/stock-audit", label: "Stock Audit", icon: Boxes },
  { to: "/admin/gift-audit", label: "Gift Audit", icon: Gift },
  { to: "/admin/gacha-logs", label: "Audit Log", icon: ScrollText },
];

const AdminLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [midtransMode, setMidtransMode] = useState<"sandbox" | "production" | null>(null);
  const [ipaymuMode, setIpaymuMode] = useState<"sandbox" | "production">("sandbox");
  const [activeProvider, setActiveProvider] = useState<"midtrans" | "stripe" | "ipaymu">("midtrans");
  const [maintenanceOn, setMaintenanceOn] = useState(false);

  useEffect(() => {
    const fetchMode = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "midtrans_mode")
        .maybeSingle();
      const m = (data?.value as { mode?: string } | null)?.mode;
      setMidtransMode(m === "production" ? "production" : "sandbox");
    };
    const fetchProvider = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "payment_provider")
        .maybeSingle();
      const v = (data?.value as { provider?: string; active?: string; ipaymu_mode?: string } | null) || {};
      const p = v.active || v.provider;
      setActiveProvider(p === "stripe" ? "stripe" : p === "ipaymu" ? "ipaymu" : "midtrans");
      setIpaymuMode(v.ipaymu_mode === "production" ? "production" : "sandbox");
    };
    const fetchMaintenance = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      const v = (data?.value as { enabled?: boolean } | null) ?? {};
      setMaintenanceOn(!!v.enabled);
    };
    fetchMode();
    fetchProvider();
    fetchMaintenance();

    const channel = supabase
      .channel("admin-app-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.midtrans_mode" },
        () => fetchMode(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.payment_provider" },
        () => fetchProvider(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.maintenance_mode" },
        () => fetchMaintenance(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const badgeMode = activeProvider === "ipaymu" ? ipaymuMode : midtransMode;
  const badgeLabel = activeProvider === "stripe" ? "Stripe" : activeProvider === "ipaymu" ? "iPaymu" : "Midtrans";
  const isProd = badgeMode === "production";

  return (
    <div className="flex min-h-screen bg-secondary/20 text-foreground">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-border bg-card shadow-xl">
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-4">
          <Shield className="h-5 w-5 text-destructive" />
          <span className="font-display text-sm font-bold tracking-wider">ADMIN PANEL</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/50 p-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            Back to Site
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 min-h-screen flex-1 bg-background text-foreground">
        {/* Header bar */}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 border-b border-border bg-card px-6 shadow-sm">
          <div className="flex items-center gap-3">
            {maintenanceOn && (
              <Link
                to="/admin/maintenance"
                title="Klik untuk mengelola maintenance mode"
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-500/25 transition-colors dark:text-amber-400 animate-pulse"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span className="font-display tracking-wider uppercase">Maintenance Mode AKTIF</span>
                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
          {badgeMode && (
            <Link
              to="/admin/payment-settings"
              title="Klik untuk mengubah pengaturan pembayaran"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                isProd
                  ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400"
              }`}
            >
              {isProd ? <Zap className="h-3 w-3" /> : <FlaskConical className="h-3 w-3" />}
              {badgeLabel}: {isProd ? "PRODUCTION" : "SANDBOX"}
              <span className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${isProd ? "bg-destructive animate-pulse" : "bg-amber-500"}`} />
            </Link>
          )}
          </div>
        </header>
        <div className="min-h-[calc(100vh-3rem)] bg-secondary/20 p-6 text-foreground">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
