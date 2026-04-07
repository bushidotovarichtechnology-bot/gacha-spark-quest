import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type Tier = Tables<"campaign_tiers">;

const AdminProbability = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tiersByCampaign, setTiersByCampaign] = useState<Record<string, Tier[]>>({});
  const [editedWeights, setEditedWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data: c } = await supabase.from("campaigns").select("*").order("title");
      if (!c) return;
      setCampaigns(c);

      const { data: t } = await supabase.from("campaign_tiers").select("*").order("sort_order");
      if (!t) return;

      const grouped: Record<string, Tier[]> = {};
      t.forEach((tier) => {
        if (!grouped[tier.campaign_id]) grouped[tier.campaign_id] = [];
        grouped[tier.campaign_id].push(tier);
      });
      setTiersByCampaign(grouped);

      const initial: Record<string, number> = {};
      t.forEach((tier) => { initial[tier.id] = tier.probability_weight; });
      setEditedWeights(initial);
    };
    fetch();
  }, []);

  const totalWeight = (campaignId: string) => {
    const t = tiersByCampaign[campaignId] || [];
    return t.reduce((sum, tier) => sum + (editedWeights[tier.id] ?? tier.probability_weight), 0);
  };

  const getPercentage = (tierId: string, campaignId: string) => {
    const tw = totalWeight(campaignId);
    if (tw === 0) return 0;
    return ((editedWeights[tierId] ?? 0) / tw * 100).toFixed(1);
  };

  const saveCampaignWeights = async (campaignId: string) => {
    const t = tiersByCampaign[campaignId] || [];
    const updates = t.map((tier) =>
      supabase.from("campaign_tiers").update({ probability_weight: editedWeights[tier.id] ?? tier.probability_weight }).eq("id", tier.id)
    );
    await Promise.all(updates);
    toast({ title: "Probability weights saved!" });
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
        Adjust the probability weight for each tier. Higher weight = higher chance of being drawn.
      </p>

      {campaigns.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No campaigns yet.</p>
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
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cTiers.map((tier) => {
                    const pct = getPercentage(tier.id, c.id);
                    return (
                      <div key={tier.id} className={`flex items-center gap-3 rounded-lg border p-3 ${tierColorMap[tier.label] || ""}`}>
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
                            value={editedWeights[tier.id] ?? tier.probability_weight}
                            onChange={(e) => setEditedWeights({ ...editedWeights, [tier.id]: Number(e.target.value) })}
                            className="h-8 w-20 text-sm text-center"
                          />
                          <span className="w-14 text-right text-sm font-semibold">{pct}%</span>
                        </div>
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
