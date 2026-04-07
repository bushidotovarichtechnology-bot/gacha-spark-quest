import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Layers, Trophy } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ campaigns: 0, tiers: 0, prizes: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [campaigns, tiers, prizes] = await Promise.all([
        supabase.from("campaigns").select("id", { count: "exact", head: true }),
        supabase.from("campaign_tiers").select("id", { count: "exact", head: true }),
        supabase.from("tier_prizes").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        campaigns: campaigns.count ?? 0,
        tiers: tiers.count ?? 0,
        prizes: prizes.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Campaigns", value: stats.campaigns, icon: Package, color: "text-primary" },
    { label: "Total Tiers", value: stats.tiers, icon: Layers, color: "text-accent" },
    { label: "Total Prizes", value: stats.prizes, icon: Trophy, color: "text-neon-pink" },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold tracking-wider">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
