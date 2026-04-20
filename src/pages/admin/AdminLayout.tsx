import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Shield, LayoutDashboard, Users, Package, Settings, LogOut, Home, FolderTree, PackageCheck, Mail, Star, Gift, Coins, Ticket, Truck, ScrollText, Ban } from "lucide-react";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/campaigns", label: "Campaigns", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/claims", label: "Prize Claims", icon: PackageCheck },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/pity", label: "Pity System", icon: Star },
  { to: "/admin/probability", label: "Probability", icon: Settings },
  { to: "/admin/rewards", label: "Rewards", icon: Gift },
  { to: "/admin/coin-packages", label: "Coin Packages", icon: Coins },
  { to: "/admin/coupons", label: "Kupon", icon: Ticket },
  { to: "/admin/shipping", label: "Tarif Ongkir", icon: Truck },
  { to: "/admin/gacha-logs", label: "Audit Log", icon: ScrollText },
];

const AdminLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-full w-56 flex-col border-r border-border/50 bg-card/80 backdrop-blur-xl">
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
      <main className="ml-56 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
