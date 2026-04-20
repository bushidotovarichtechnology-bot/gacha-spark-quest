import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Wand2, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { supabaseImg } from "@/lib/imageTransform";
import { FairnessAudit } from "@/components/admin/FairnessAudit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Tier = Tables<"campaign_tiers">;
type Prize = Tables<"tier_prizes">;
type TierWithPrizes = Tier & { tier_prizes: Prize[] };

// Presisi 2 desimal: simpan dalam basis 100 (5.25% -> 5.25)
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => n.toFixed(2);
const TIER_RANK: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };

// "1 dari N" untuk persen 0..100. Mengembalikan string ringkas: "1 dari 2.000", "1 dari 1,2 jt".
const oneInN = (pct: number): string => {
  if (!Number.isFinite(pct) || pct <= 0) return "—";
  if (pct >= 100) return "1 dari 1";
  const n = 100 / pct;
  const fmtID = (v: number, digits = 0) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(v);
  if (n >= 1_000_000) return `1 dari ${fmtID(n / 1_000_000, 1)} jt`;
  if (n >= 10_000) return `1 dari ${fmtID(Math.round(n / 100) * 100)}`;
  if (n >= 100) return `1 dari ${fmtID(Math.round(n))}`;
  if (n >= 10) return `1 dari ${fmtID(n, 1)}`;
  return `1 dari ${fmtID(n, 2)}`;
};

const tierColorMap: Record<string, string> = {
  S: "bg-accent/10 text-accent border-accent/30",
  A: "bg-primary/10 text-primary border-primary/30",
  B: "bg-neon-pink/10 text-neon-pink border-neon-pink/30",
  C: "bg-secondary text-muted-foreground border-border",
};

const AdminProbability = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tiersByCampaign, setTiersByCampaign] = useState<Record<string, TierWithPrizes[]>>({});
  // % per prize (basis 0..100), sumber kebenaran tunggal di UI
  const [prizePct, setPrizePct] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [presetTarget, setPresetTarget] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: c }, { data: t }] = await Promise.all([
        supabase.from("campaigns").select("*").order("title"),
        supabase.from("campaign_tiers").select("*, tier_prizes(*)").order("sort_order"),
      ]);
      if (!c || !t) return;
      setCampaigns(c);

      const grouped: Record<string, TierWithPrizes[]> = {};
      const initialPct: Record<string, number> = {};

      // Konversi bobot eksisting ke %.
      // Asumsi sebelumnya: P(prize) = (tier.weight / Σtier.weight) × (prize.weight / Σprize.weight in tier)
      const tiersByCamp: Record<string, TierWithPrizes[]> = {};
      (t as TierWithPrizes[]).forEach((tier) => {
        if (!tiersByCamp[tier.campaign_id]) tiersByCamp[tier.campaign_id] = [];
        tiersByCamp[tier.campaign_id].push(tier);
      });

      Object.entries(tiersByCamp).forEach(([cid, tiers]) => {
        grouped[cid] = tiers;
        const sumTierW = tiers.reduce((s, x) => s + Number(x.probability_weight || 0), 0) || 1;
        tiers.forEach((tier) => {
          const tierShare = Number(tier.probability_weight || 0) / sumTierW; // 0..1
          const sumPrizeW = tier.tier_prizes.reduce((s, p) => s + Number(p.probability_weight || 0), 0) || 1;
          tier.tier_prizes.forEach((p) => {
            const prizeShare = Number(p.probability_weight || 0) / sumPrizeW; // 0..1
            initialPct[p.id] = round2(tierShare * prizeShare * 100);
          });
        });
      });

      setTiersByCampaign(grouped);
      setPrizePct(initialPct);
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const out: Record<string, { total: number; perTier: Record<string, number> }> = {};
    Object.entries(tiersByCampaign).forEach(([cid, tiers]) => {
      let total = 0;
      const perTier: Record<string, number> = {};
      tiers.forEach((tier) => {
        const sum = tier.tier_prizes.reduce((s, p) => s + (prizePct[p.id] ?? 0), 0);
        perTier[tier.id] = round2(sum);
        total += sum;
      });
      out[cid] = { total: round2(total), perTier };
    });
    return out;
  }, [tiersByCampaign, prizePct]);

  const setOne = (prizeId: string, raw: string) => {
    let v = parseFloat(raw);
    if (!Number.isFinite(v) || v < 0) v = 0;
    if (v > 100) v = 100;
    setPrizePct((prev) => ({ ...prev, [prizeId]: round2(v) }));
  };

  // Auto-distribusi sisa ke tier terendah (C → B → A → S)
  const autoFillRemainder = (campaignId: string) => {
    const tiers = tiersByCampaign[campaignId] || [];
    const sum = totals[campaignId]?.total ?? 0;
    const remaining = round2(100 - sum);
    if (remaining <= 0) {
      toast({ title: "Total sudah ≥ 100%", description: "Tidak ada sisa untuk didistribusikan.", variant: "destructive" });
      return;
    }
    // Cari tier terendah yang punya prize
    const sorted = [...tiers].sort((a, b) => (TIER_RANK[b.label] ?? 99) - (TIER_RANK[a.label] ?? 99));
    const target = sorted.find((t) => t.tier_prizes.length > 0);
    if (!target) {
      toast({ title: "Tidak ada prize", description: "Tambah prize dulu.", variant: "destructive" });
      return;
    }
    const prizes = target.tier_prizes;
    const per = round2(remaining / prizes.length);
    setPrizePct((prev) => {
      const next = { ...prev };
      let acc = 0;
      prizes.forEach((p, i) => {
        const add = i === prizes.length - 1 ? round2(remaining - acc) : per;
        next[p.id] = round2((next[p.id] ?? 0) + add);
        acc = round2(acc + per);
      });
      return next;
    });
    toast({ title: `Sisa ${fmt(remaining)}% dialokasikan`, description: `Ke tier ${target.label} (${prizes.length} hadiah)` });
  };

  // Preset distribusi default: S=1%, A=9%, B=30%, C=60%
  const applyDefaultPreset = (campaignId: string) => {
    const tiers = tiersByCampaign[campaignId] || [];
    const TIER_PRESET: Record<string, number> = { S: 1, A: 9, B: 30, C: 60 };
    const next: Record<string, number> = { ...prizePct };
    let applied = 0;
    const skipped: string[] = [];

    tiers.forEach((tier) => {
      const tierPct = TIER_PRESET[tier.label];
      if (tierPct === undefined) {
        tier.tier_prizes.forEach((p) => { next[p.id] = 0; });
        return;
      }
      const prizes = tier.tier_prizes;
      if (prizes.length === 0) { skipped.push(tier.label); return; }
      const per = round2(tierPct / prizes.length);
      let acc = 0;
      prizes.forEach((p, i) => {
        const v = i === prizes.length - 1 ? round2(tierPct - acc) : per;
        next[p.id] = v;
        acc = round2(acc + per);
      });
      applied++;
    });

    if (applied === 0) {
      toast({ title: "Tidak bisa terapkan preset", description: "Tier S/A/B/C belum punya hadiah.", variant: "destructive" });
      return;
    }
    setPrizePct(next);
    toast({
      title: "Preset default diterapkan",
      description: skipped.length > 0
        ? `S 1% · A 9% · B 30% · C 60%. Tier kosong: ${skipped.join(", ")}`
        : "S 1% · A 9% · B 30% · C 60%. Klik Simpan untuk persist.",
    });
  };

  // Cek apakah ada nilai % yang sudah diisi (>0) → perlu konfirmasi
  const hasExistingValues = (campaignId: string): boolean => {
    const tiers = tiersByCampaign[campaignId] || [];
    return tiers.some((t) => t.tier_prizes.some((p) => (prizePct[p.id] ?? 0) > 0));
  };

  const handlePresetClick = (campaignId: string) => {
    if (hasExistingValues(campaignId)) {
      setPresetTarget(campaignId);
    } else {
      applyDefaultPreset(campaignId);
    }
  };

  const saveCampaign = async (campaignId: string) => {
    const tiers = tiersByCampaign[campaignId] || [];
    const sum = totals[campaignId]?.total ?? 0;
    if (sum > 100.01) {
      toast({ title: `Total ${fmt(sum)}% melebihi 100%`, description: "Turunkan beberapa nilai.", variant: "destructive" });
      return;
    }
    setSavingId(campaignId);

    // Tier weight = jumlah % prize dalam tier; Prize weight = % prize.
    // Engine 2-tahap: P = (tierW / ΣtierW) × (prizeW / ΣprizeW_in_tier) = prizePct / 100 ✓
    const updates: PromiseLike<any>[] = [];
    tiers.forEach((tier) => {
      const tierW = totals[campaignId].perTier[tier.id] ?? 0;
      // Bila tier 0%, beri weight 0 → tier tidak akan terpilih
      updates.push(
        supabase.from("campaign_tiers").update({ probability_weight: tierW }).eq("id", tier.id),
      );
      tier.tier_prizes.forEach((p) => {
        // Bila semua prize tier 0, set weight 1 supaya tidak division-by-zero (tier weight 0 sudah blok pemilihan)
        const w = prizePct[p.id] ?? 0;
        updates.push(
          supabase.from("tier_prizes").update({ probability_weight: w === 0 ? 0.0001 : w }).eq("id", p.id),
        );
      });
    });

    const results = await Promise.all(updates);
    const err = results.find((r: any) => r?.error);
    setSavingId(null);
    if (err && (err as any).error) {
      toast({ title: "Gagal menyimpan", description: (err as any).error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Probabilitas tersimpan ✓", description: `Total ${fmt(sum)}%` });
  };

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold tracking-wider">Probability Settings</h1>
      <p className="mb-2 text-sm text-muted-foreground">
        Atur peluang <strong>per hadiah</strong> langsung dalam %. Contoh: Apple Watch 0.05% berarti 0.05% dari setiap draw.
      </p>
      <p className="mb-6 text-xs text-muted-foreground">
        Total semua hadiah dalam 1 campaign idealnya = 100%. Bila kurang, klik <em>Auto-isi sisa</em> untuk mengalokasikan ke tier terendah.
      </p>

      {campaigns.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Belum ada campaign.</p>
      )}

      <div className="space-y-6">
        {campaigns.map((c) => {
          const cTiers = tiersByCampaign[c.id] || [];
          if (cTiers.length === 0) return null;
          const sum = totals[c.id]?.total ?? 0;
          const isFull = Math.abs(sum - 100) < 0.01;
          const isOver = sum > 100.01;

          return (
            <Card key={c.id} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <CardTitle className="text-sm truncate">{c.title}</CardTitle>
                  <Badge
                    variant={isOver ? "destructive" : isFull ? "default" : "secondary"}
                    className="gap-1 shrink-0"
                  >
                    {isOver ? <AlertTriangle className="h-3 w-3" /> : isFull ? <CheckCircle2 className="h-3 w-3" /> : null}
                    Total: {fmt(sum)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => handlePresetClick(c.id)} className="gap-1" title="S 1% · A 9% · B 30% · C 60%">
                    <RotateCcw className="h-3.5 w-3.5" /> Preset default
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => autoFillRemainder(c.id)} className="gap-1" disabled={sum >= 100}>
                    <Wand2 className="h-3.5 w-3.5" /> Auto-isi sisa
                  </Button>
                  <Button size="sm" onClick={() => saveCampaign(c.id)} className="gap-1" disabled={isOver || savingId === c.id}>
                    <Save className="h-3.5 w-3.5" /> {savingId === c.id ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cTiers.map((tier) => {
                    const tierTotal = totals[c.id]?.perTier[tier.id] ?? 0;
                    return (
                      <div key={tier.id} className={`rounded-lg border p-3 ${tierColorMap[tier.label] || ""}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-display text-lg font-black w-8 text-center">{tier.label}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tier.name}</p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/50">
                              <div
                                className="h-full rounded-full bg-current transition-all"
                                style={{ width: `${Math.min(tierTotal, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col items-end whitespace-nowrap">
                            <span className="text-sm font-semibold">{fmt(tierTotal)}%</span>
                            <span className="text-[10px] font-mono text-current/70 tabular-nums">{oneInN(tierTotal)}</span>
                          </div>
                        </div>

                        {tier.tier_prizes.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-11">Belum ada hadiah di tier ini.</p>
                        ) : (
                          <div className="space-y-1.5 pl-11">
                            {tier.tier_prizes.map((prize) => {
                              const pVal = prizePct[prize.id] ?? 0;
                              return (
                              <div key={prize.id} className="flex items-center gap-2 rounded-md bg-background/40 px-3 py-2">
                                {prize.image_url ? (
                                  <img
                                    src={supabaseImg(prize.image_url, 64)}
                                    alt={prize.name}
                                    loading="lazy"
                                    className="h-7 w-7 rounded object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="h-7 w-7 rounded bg-secondary shrink-0" />
                                )}
                                <span className="text-xs flex-1 truncate text-foreground">{prize.name}</span>
                                <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground tabular-nums whitespace-nowrap w-24 text-right">
                                  {oneInN(pVal)}
                                </span>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={100}
                                    inputMode="decimal"
                                    value={pVal}
                                    onChange={(e) => setOne(prize.id, e.target.value)}
                                    className="h-8 w-24 text-sm text-right pr-7"
                                  />
                                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                                    %
                                  </span>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <FairnessAudit
                  campaignId={c.id}
                  targetByTier={cTiers.reduce<Record<string, number>>((acc, t) => {
                    acc[t.label] = (acc[t.label] ?? 0) + (totals[c.id]?.perTier[t.id] ?? 0);
                    return acc;
                  }, {})}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={presetTarget !== null} onOpenChange={(o) => !o && setPresetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terapkan preset default?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan <strong>menimpa semua nilai %</strong> yang sudah Anda atur untuk campaign ini dengan distribusi default:
              <span className="mt-2 block font-mono text-xs">
                S 1% · A 9% · B 30% · C 60%
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">
                Persentase tier akan dibagi merata ke semua hadiah dalam tier. Perubahan belum disimpan sampai Anda klik <strong>Simpan</strong>.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (presetTarget) applyDefaultPreset(presetTarget);
                setPresetTarget(null);
              }}
            >
              Ya, timpa nilai
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProbability;
