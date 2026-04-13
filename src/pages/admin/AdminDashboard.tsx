import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Layers, Trophy, Zap, CalendarDays, TrendingUp, Shield, ShieldCheck, BarChart3 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

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

interface PitySetting {
  id: string;
  campaign_id: string;
  threshold: number;
  guaranteed_tier: string;
  is_enabled: boolean;
}

const TIER_COLORS: Record<string, string> = {
  S: "hsl(var(--accent))",
  A: "hsl(280, 80%, 60%)",
  B: "hsl(210, 80%, 60%)",
  C: "hsl(150, 60%, 50%)",
};

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
  const [pitySettings, setPitySettings] = useState<PitySetting[]>([]);
  const [pityTriggerCount, setPityTriggerCount] = useState(0);

  useEffect(() => {
    const fetchAll = async () => {
      const [adminStats, popularCampaigns, tiers, prizes, pity, pityDraws] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.rpc("get_popular_campaigns", { lim: 5 }),
        supabase.from("campaign_tiers").select("id", { count: "exact", head: true }),
        supabase.from("tier_prizes").select("id", { count: "exact", head: true }),
        supabase.from("pity_settings").select("*"),
        supabase.from("draws").select("id", { count: "exact", head: true }).eq("is_pity", true),
      ]);

      if (adminStats.data) setStats(adminStats.data as unknown as AdminStats);
      if (popularCampaigns.data) setPopular(popularCampaigns.data as unknown as PopularCampaign[]);
      setExtraStats({
        tiers: tiers.count ?? 0,
        prizes: prizes.count ?? 0,
      });
      if (pity.data) setPitySettings(pity.data as unknown as PitySetting[]);
    };
    fetchAll();
  }, []);

  // Pity stats
  const totalPity = pitySettings.length;
  const enabledPity = pitySettings.filter((p) => p.is_enabled).length;
  const disabledPity = totalPity - enabledPity;

  // Tier distribution
  const tierCounts: Record<string, number> = {};
  pitySettings.forEach((p) => {
    if (p.is_enabled) {
      tierCounts[p.guaranteed_tier] = (tierCounts[p.guaranteed_tier] || 0) + 1;
    }
  });
  const tierDistribution = Object.entries(tierCounts)
    .map(([tier, count]) => ({ tier, count, fill: TIER_COLORS[tier] || "hsl(var(--muted-foreground))" }))
    .sort((a, b) => {
      const order = ["S", "A", "B", "C"];
      return order.indexOf(a.tier) - order.indexOf(b.tier);
    });

  // Threshold distribution
  const thresholdData = pitySettings
    .filter((p) => p.is_enabled)
    .reduce<Record<number, number>>((acc, p) => {
      acc[p.threshold] = (acc[p.threshold] || 0) + 1;
      return acc;
    }, {});
  const thresholdDistribution = Object.entries(thresholdData)
    .map(([threshold, count]) => ({ threshold: `${threshold} draws`, count }))
    .sort((a, b) => parseInt(a.threshold) - parseInt(b.threshold));

  const tierChartConfig = Object.fromEntries(
    tierDistribution.map((t) => [t.tier, { label: `Tier ${t.tier}`, color: t.fill }])
  );

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

      {/* Pity System Stats */}
      <h2 className="mb-4 mt-8 font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        Pity System Statistics
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Pity Rules</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPity}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pity Active</CardTitle>
            <ShieldCheck className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">{enabledPity}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pity Disabled</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{disabledPity}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Coverage</CardTitle>
            <BarChart3 className="h-4 w-4 text-neon-pink" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.total_campaigns > 0 ? Math.round((enabledPity / stats.total_campaigns) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">of campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {tierDistribution.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Guaranteed Tier Distribution */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Guaranteed Tier Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={tierChartConfig} className="mx-auto aspect-square max-h-[200px]">
                <PieChart>
                  <Pie data={tierDistribution} dataKey="count" nameKey="tier" cx="50%" cy="50%" outerRadius={70} label={({ tier, count }) => `${tier}: ${count}`}>
                    {tierDistribution.map((entry) => (
                      <Cell key={entry.tier} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Threshold Distribution */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Threshold Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ count: { label: "Campaigns", color: "hsl(var(--primary))" } }} className="max-h-[200px]">
                <BarChart data={thresholdDistribution}>
                  <XAxis dataKey="threshold" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

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
