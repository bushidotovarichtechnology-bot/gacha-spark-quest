import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText, Package, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import AdminOnlyGuard from "@/components/AdminOnlyGuard";

type TierPrizeRow = {
  id: string;
  name: string;
  remaining: number;
  total: number;
  probability_weight: number;
  auto_refill: boolean;
  coin_value: number;
  tier_id: string;
  campaign_tiers: {
    label: string;
    name: string;
    campaign_id: string;
    campaigns: { title: string } | null;
  } | null;
};

const tierBadge: Record<string, string> = {
  S: "bg-yellow-500/20 text-yellow-500 border-yellow-500/40",
  A: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  C: "bg-zinc-500/20 text-zinc-400 border-zinc-500/40",
};

const AdminStockAudit = () => {
  const { data: prizes = [], isLoading: loadingPrizes } = useQuery({
    queryKey: ["admin-stock-audit-prizes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_prizes")
        .select(
          "id, name, remaining, total, probability_weight, auto_refill, coin_value, tier_id, campaign_tiers!inner(label, name, campaign_id, campaigns(title))",
        )
        .order("remaining", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TierPrizeRow[];
    },
    refetchInterval: 15_000,
  });

  const { data: recentDraws = [], isLoading: loadingDraws } = useQuery({
    queryKey: ["admin-stock-audit-draws"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("draws")
        .select("id, user_id, campaign_id, tier_label, prize_name, coin_value, is_pity, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10_000,
  });

  const { data: recentLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["admin-stock-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gacha_logs")
        .select("id, user_id, campaign_id, draw_count, status, error_message, ip_address, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10_000,
  });

  const totalPrizes = prizes.length;
  const lowStock = prizes.filter((p) => p.remaining > 0 && p.remaining <= 3).length;
  const outOfStock = prizes.filter((p) => p.remaining <= 0 && !p.auto_refill).length;
  const totalRemaining = prizes.reduce((s, p) => s + p.remaining, 0);

  return (
    <AdminOnlyGuard
      title="Admin only — Stock & Draw Audit"
      message="Exact prize stock counts and raw draw logs are restricted to administrators. Sign in with an admin account to continue."
    >
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wider">Stock & Draw Audit</h1>
        <p className="text-sm text-muted-foreground">
          Exact tier prize counts and recent draw activity. Admin-only — counts here are not
          obfuscated.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Prize SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{totalPrizes}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Remaining Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{totalRemaining}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Low Stock (≤3)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold text-amber-500">{lowStock}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sold Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{outOfStock}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Tier Prize Stock (live)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Prize</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Coin Value</TableHead>
                  <TableHead>Refill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPrizes && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!loadingPrizes && prizes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      No prizes configured.
                    </TableCell>
                  </TableRow>
                )}
                {prizes.map((p) => {
                  const tier = p.campaign_tiers;
                  const isLow = p.remaining > 0 && p.remaining <= 3;
                  const isOut = p.remaining <= 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {tier?.campaigns?.title ?? tier?.campaign_id ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tier ? tierBadge[tier.label] : ""}>
                          {tier?.label ?? "?"}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-bold ${
                          isOut ? "text-destructive" : isLow ? "text-amber-500" : "text-foreground"
                        }`}
                      >
                        {p.remaining}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.total}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {Number(p.probability_weight).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.coin_value}
                      </TableCell>
                      <TableCell>
                        {p.auto_refill ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent draws */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> Recent Draws (50)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Prize</TableHead>
                  <TableHead className="text-right">Coin Value</TableHead>
                  <TableHead>Pity?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDraws && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {recentDraws.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{String(d.user_id).slice(0, 8)}…</TableCell>
                    <TableCell className="text-xs">{d.campaign_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tierBadge[d.tier_label]}>
                        {d.tier_label}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.prize_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.coin_value}</TableCell>
                    <TableCell>
                      {d.is_pity ? (
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40" variant="outline">
                          Pity
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent gacha logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <ScrollText className="h-4 w-4" /> Recent Gacha Logs (50)
            </span>
            <Link to="/admin/gacha-logs" className="text-xs font-normal text-primary hover:underline">
              View full log →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Draws</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingLogs && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {recentLogs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{String(l.user_id).slice(0, 8)}…</TableCell>
                    <TableCell className="text-xs">{l.campaign_id}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.draw_count}</TableCell>
                    <TableCell>
                      {l.status === "success" ? (
                        <Badge variant="outline" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/40">
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/40">
                          {l.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {l.ip_address ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[240px] truncate" title={l.error_message ?? ""}>
                      {l.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStockAudit;
