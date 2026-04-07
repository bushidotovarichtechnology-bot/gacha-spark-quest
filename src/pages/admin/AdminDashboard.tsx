import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Layers, Trophy, Zap, CalendarDays, TrendingUp } from "lucide-react";

interface AdminStats {
  total_users: number;
  total_draws: number;
  total_campaigns: number;
  draws_today: number;
  draws_this_week: number;
}

interface PopularCampaign {
  campaign_id: string;
  campaign_title: string;
  draw_count: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    total_draws: 0,
    total_campaigns: 0,
    draws_today: 0,
    draws_this_week: 0,
  });
  const [popular, setPopular] = useState<PopularCampaign[]>([]);
  const [extraStats, setExtraStats] = useState({ tiers: 0, prizes: 0 });

  useEffect(() => {
    const fetchAll = async () => {
      const [adminStats, popularCampaigns, tiers, prizes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("get_popular_campaigns", { lim: 5 }),
        supabase.from("campaign_tiers").select("id", { count: "exact", head: true }),
        supabase.from("tier_prizes").select("id", { count: "exact", head: true }),
      ]);

      if (adminStats.data) setStats(adminStats.data as unknown as AdminStats);
      if (popularCampaigns.data) setPopular(popularCampaigns.data as unknown as PopularCampaign[]);
      setExtraStats({
        tiers: tiers.count ?? 0,
        prizes: prizes.count ?? 0,
      });
    };
    fetchAll();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.total_users, icon: Users, color: "text-primary" },
    { label: "Total Draws", value: stats.total_draws, icon: Zap, color: "text-accent" },
    { label: "Active Campaigns", value: stats.total_campaigns, icon: Package, color: "text-neon-pink" },
    { label: "Draws Today", value: stats.draws_today, icon: CalendarDays, color: "text-primary" },
    { label: "Draws This Week", value: stats.draws_this_week, icon: TrendingUp, color: "text-accent" },
    { label: "Total Tiers", value: extraStats.tiers, icon: Layers, color: "text-muted-foreground" },
    { label: "Total Prizes", value: extraStats.prizes, icon: Trophy, color: "text-neon-pink" },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold tracking-wider">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Popular Campaigns */}
      <h2 className="mb-4 mt-8 font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        Most Popular Campaigns
      </h2>
      {popular.length === 0 ? (
        <p className="text-sm text-muted-foreground">No draws recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {popular.map((p, i) => (
            <Card key={p.campaign_id} className="border-border/50">
              <CardContent className="flex items-center gap-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 font-display text-sm font-black text-accent">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{p.campaign_title}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent">{p.draw_count}</p>
                  <p className="text-xs text-muted-foreground">draws</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
