import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, ChevronDown, ChevronRight } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Tier = Tables<"campaign_tiers">;
type Prize = Tables<"tier_prizes">;
type TierWithPrizes = Tier & { tier_prizes: Prize[] };

const AdminProbability = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tiersByCampaign, setTiersByCampaign] = useState<Record<string, TierWithPrizes[]>>({});
  const [editedTierWeights, setEditedTierWeights] = useState<Record<string, number>>({});
  const [editedPrizeWeights, setEditedPrizeWeights] = useState<Record<string, number>>({});
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase.from("campaigns").select("*").order("title");
      if (!c) return;
      setCampaigns(c);

      const { data: t } = await supabase
        .from("campaign_tiers")
        .select("*, tier_prizes(*)")
        .order("sort_order");
      if (!t) return;

      const grouped: Record<string, TierWithPrizes[]> = {};
      const tw: Record<string, number> = {};
      const pw: Record<string, number> = {};

      (t as TierWithPrizes[]).forEach((tier) => {
        if (!grouped[tier.campaign_id]) grouped[tier.campaign_id] = [];
        grouped[tier.campaign_id].push(tier);
        tw[tier.id] = tier.probability_weight;
        tier.tier_prizes.forEach((p) => {
          pw[p.id] = p.probability_weight;
        });
      });

      setTiersByCampaign(grouped);
      setEditedTierWeights(tw);
      setEditedPrizeWeights(pw);
    };
    load();
  }, []);

  const totalTierWeight = (campaignId: string) => {
    const tiers = tiersByCampaign[campaignId] || [];
    return tiers.reduce((sum, t) => sum + (editedTierWeights[t.id] ?? t.probability_weight), 0);
  };

  const getTierPct = (tierId: string, campaignId: string) => {
    const tw = totalTierWeight(campaignId);
    if (tw === 0) return "0.0";
    return ((editedTierWeights[tierId] ?? 0) / tw * 100).toFixed(1);
  };

  const totalPrizeWeight = (tier: TierWithPrizes) => {
    return tier.tier_prizes.reduce((sum, p) => sum + (editedPrizeWeights[p.id] ?? p.probability_weight), 0);
  };

  const getPrizePct = (prizeId: string, tier: TierWithPrizes) => {
    const tw = totalPrizeWeight(tier);
    if (tw === 0) return "0.0";
    return ((editedPrizeWeights[prizeId] ?? 0) / tw * 100).toFixed(1);
  };

  const saveCampaignWeights = async (campaignId: string) => {
    const tiers = tiersByCampaign[campaignId] || [];
    const updates: Promise<any>[] = [];

    tiers.forEach((tier) => {
      updates.push(
        supabase.from("campaign_tiers").update({ probability_weight: editedTierWeights[tier.id] ?? tier.probability_weight }).eq("id", tier.id)
      );
      tier.tier_prizes.forEach((p) => {
        updates.push(
          supabase.from("tier_prizes").update({ probability_weight: editedPrizeWeights[p.id] ?? p.probability_weight }).eq("id", p.id)
        );
      });
    });

    await Promise.all(updates);
    toast({ title: "Semua probabilitas tersimpan!" });
  };

  const tierColorMap: Record<string, string> = {
    S: "bg-accent/10 text-accent border-accent/30",
    A: "bg-primary/10 text-primary border-primary/30",
    B: "bg-neon-pink/10 text-neon-pink border-neon-pink/30",
    C: "bg-secondary text-muted-foreground border-border",
  };

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold tracking-wider">Probability Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Atur weight probabilitas untuk setiap tier dan hadiah. Weight lebih tinggi = peluang lebih besar.
      </p>

      {campaigns.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Belum ada campaign.</p>
      )}

      <div className="space-y-6">
        {campaigns.map((c) => {
          const cTiers = tiersByCampaign[c.id] || [];
          if (cTiers.length === 0) return null;

          return (
            <Card key={c.id} className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">{c.title}</CardTitle>
                <Button size="sm" onClick={() => saveCampaignWeights(c.id)} className="gap-1">
                  <Save className="h-3.5 w-3.5" /> Simpan
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cTiers.map((tier) => {
                    const pct = getTierPct(tier.id, c.id);
                    const isExpanded = expandedTiers[tier.id] ?? false;
                    const hasPrizes = tier.tier_prizes.length > 0;

                    return (
                      <div key={tier.id}>
                        <div className={`flex items-center gap-3 rounded-lg border p-3 ${tierColorMap[tier.label] || ""}`}>
                          {hasPrizes && (
                            <button
                              onClick={() => setExpandedTiers((prev) => ({ ...prev, [tier.id]: !prev[tier.id] }))}
                              className="shrink-0"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          )}
                          <span className="font-display text-lg font-black w-8 text-center">{tier.label}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{tier.name}</p>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-background/50">
                              <div
                                className="h-full rounded-full bg-current transition-all"
                                style={{ width: `${Math.min(Number(pct), 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={editedTierWeights[tier.id] ?? tier.probability_weight}
                              onChange={(e) => setEditedTierWeights({ ...editedTierWeights, [tier.id]: Number(e.target.value) })}
                              className="h-8 w-20 text-sm text-center"
                            />
                            <span className="w-14 text-right text-sm font-semibold">{pct}%</span>
                          </div>
                        </div>

                        {/* Prize-level weights */}
                        {isExpanded && hasPrizes && (
                          <div className="ml-12 mt-1 space-y-1 border-l-2 border-border/30 pl-3">
                            <p className="text-xs text-muted-foreground font-medium py-1">Probabilitas hadiah dalam tier {tier.label}:</p>
                            {tier.tier_prizes.map((prize) => {
                              const prizePct = getPrizePct(prize.id, tier);
                              return (
                                <div key={prize.id} className="flex items-center gap-2 rounded-md bg-secondary/30 px-3 py-2">
                                  {prize.image_url && (
                                    <img src={prize.image_url} alt={prize.name} className="h-6 w-6 rounded object-cover shrink-0" />
                                  )}
                                  <span className="text-xs flex-1 truncate">{prize.name}</span>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={editedPrizeWeights[prize.id] ?? prize.probability_weight}
                                    onChange={(e) => setEditedPrizeWeights({ ...editedPrizeWeights, [prize.id]: Number(e.target.value) })}
                                    className="h-7 w-16 text-xs text-center"
                                  />
                                  <span className="w-12 text-right text-xs font-semibold">{prizePct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminProbability;
