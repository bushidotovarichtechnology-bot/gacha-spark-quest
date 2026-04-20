import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, BarChart3, AlertTriangle, CheckCircle2, Minus } from "lucide-react";

interface FairnessAuditProps {
  campaignId: string;
  /** % target per tier (basis 0..100) */
  targetByTier: Record<string, number>;
  sampleSize?: number;
}

const TIER_ORDER = ["S", "A", "B", "C"];
const TIER_COLOR: Record<string, string> = {
  S: "text-accent",
  A: "text-primary",
  B: "text-neon-pink",
  C: "text-muted-foreground",
};

const fmt = (n: number) => n.toFixed(2);

/**
 * Threshold deviasi: bandingkan dengan margin Wald 95% (z=1.96)
 * agar audit "fair" untuk tier dengan probabilitas kecil & sample kecil.
 */
function classify(actualPct: number, targetPct: number, n: number) {
  if (n === 0) return "no-data" as const;
  const p = targetPct / 100;
  const margin = 1.96 * Math.sqrt((p * (1 - p)) / Math.max(n, 1)) * 100; // dalam %
  const diff = actualPct - targetPct;
  if (Math.abs(diff) <= Math.max(margin, 0.5)) return "ok" as const;
  return diff > 0 ? "high" as const : "low" as const;
}

export function FairnessAudit({ campaignId, targetByTier, sampleSize = 1000 }: FairnessAuditProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_tier_distribution", {
      _campaign_id: campaignId,
      _limit: sampleSize,
    });
    setLoading(false);
    if (error) return;
    const c: Record<string, number> = {};
    let t = 0;
    (data || []).forEach((row: any) => {
      c[row.tier_label] = Number(row.draw_count);
      t = Number(row.total_draws);
    });
    setCounts(c);
    setTotal(t);
    setFetchedAt(new Date());
  }, [campaignId, sampleSize]);

  useEffect(() => {
    if (open && total === 0) load();
  }, [open, load, total]);

  const rows = useMemo(() => {
    const tiers = Array.from(new Set([...TIER_ORDER, ...Object.keys(targetByTier), ...Object.keys(counts)]));
    return tiers
      .filter((t) => (targetByTier[t] ?? 0) > 0 || (counts[t] ?? 0) > 0)
      .sort((a, b) => (TIER_ORDER.indexOf(a) + 99) - (TIER_ORDER.indexOf(b) + 99))
      .map((tier) => {
        const target = targetByTier[tier] ?? 0;
        const cnt = counts[tier] ?? 0;
        const actual = total > 0 ? (cnt / total) * 100 : 0;
        const status = classify(actual, target, total);
        return { tier, target, cnt, actual, status };
      });
  }, [targetByTier, counts, total]);

  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-background/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Audit Fairness</span>
          <span className="text-[10px] text-muted-foreground">
            ({sampleSize.toLocaleString("id-ID")} draw terakhir)
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">{open ? "Tutup" : "Buka"}</span>
      </button>

      {open && (
        <div className="border-t border-border/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {total === 0 && !loading
                ? "Belum ada draw untuk campaign ini."
                : `Sample: ${total.toLocaleString("id-ID")} draw${fetchedAt ? ` · ${fetchedAt.toLocaleTimeString("id-ID")}` : ""}`}
            </p>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Tidak ada data tier.</p>
          ) : (
            <div className="space-y-1.5">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-medium uppercase text-muted-foreground">
                <div className="col-span-1">Tier</div>
                <div className="col-span-3 text-right">Target</div>
                <div className="col-span-3 text-right">Aktual</div>
                <div className="col-span-2 text-right">Selisih</div>
                <div className="col-span-3 text-right">Sample</div>
              </div>
              {rows.map((r) => {
                const diff = r.actual - r.target;
                const Icon =
                  r.status === "ok" ? CheckCircle2 :
                  r.status === "no-data" ? Minus :
                  AlertTriangle;
                const statusColor =
                  r.status === "ok" ? "text-emerald-500" :
                  r.status === "no-data" ? "text-muted-foreground" :
                  r.status === "high" ? "text-amber-500" :
                  "text-destructive";
                return (
                  <div key={r.tier} className="grid grid-cols-12 items-center gap-2 rounded-md bg-secondary/40 px-2 py-1.5 text-xs">
                    <div className={`col-span-1 font-display font-black ${TIER_COLOR[r.tier] || ""}`}>{r.tier}</div>
                    <div className="col-span-3 text-right font-mono tabular-nums">{fmt(r.target)}%</div>
                    <div className="col-span-3 text-right font-mono tabular-nums">{fmt(r.actual)}%</div>
                    <div className={`col-span-2 text-right font-mono tabular-nums ${statusColor}`}>
                      {diff >= 0 ? "+" : ""}{fmt(diff)}%
                    </div>
                    <div className="col-span-3 flex items-center justify-end gap-1.5 font-mono tabular-nums text-muted-foreground">
                      <Icon className={`h-3 w-3 ${statusColor}`} />
                      {r.cnt.toLocaleString("id-ID")}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 flex flex-wrap items-center gap-3 px-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> dalam toleransi (95% CI)</span>
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" /> melebihi target</span>
                <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> di bawah target</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
