import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type CampaignTier = Tables<"campaign_tiers"> & { tier_prizes: Tables<"tier_prizes">[] };

const emptyTier = { label: "C", name: "", total: 1, remaining: 1, probability_weight: 1, sort_order: 0 };

const AdminCampaigns = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<CampaignTier[]>([]);
  const [loading, setLoading] = useState(false);

  // New campaign form
  const [newCampaign, setNewCampaign] = useState({ id: "", title: "", description: "", image_url: "", price: 5 });

  const fetchCampaigns = async () => {
    const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false });
    if (data) setCampaigns(data);
  };

  const fetchTiers = async (campaignId: string) => {
    const { data } = await supabase
      .from("campaign_tiers")
      .select("*, tier_prizes(*)")
      .eq("campaign_id", campaignId)
      .order("sort_order");
    if (data) setTiers(data as CampaignTier[]);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setTiers([]);
    } else {
      setExpandedId(id);
      fetchTiers(id);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.id || !newCampaign.title) {
      toast({ title: "ID and Title are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("campaigns").insert(newCampaign);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campaign created!" });
      setNewCampaign({ id: "", title: "", description: "", image_url: "", price: 5 });
      fetchCampaigns();
    }
    setLoading(false);
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated!" });
      fetchCampaigns();
    }
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campaign deleted" });
      if (expandedId === id) { setExpandedId(null); setTiers([]); }
      fetchCampaigns();
    }
  };

  // Tier management
  const addTier = async (campaignId: string) => {
    const { error } = await supabase.from("campaign_tiers").insert({
      campaign_id: campaignId,
      ...emptyTier,
      sort_order: tiers.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchTiers(campaignId);
    }
  };

  const updateTier = async (tierId: string, updates: Record<string, unknown>) => {
    const { error } = await supabase.from("campaign_tiers").update(updates).eq("id", tierId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteTier = async (tierId: string, campaignId: string) => {
    await supabase.from("campaign_tiers").delete().eq("id", tierId);
    fetchTiers(campaignId);
  };

  // Prize management
  const addPrize = async (tierId: string, name: string) => {
    if (!name.trim()) return;
    await supabase.from("tier_prizes").insert({ tier_id: tierId, name: name.trim() });
    if (expandedId) fetchTiers(expandedId);
  };

  const deletePrize = async (prizeId: string) => {
    await supabase.from("tier_prizes").delete().eq("id", prizeId);
    if (expandedId) fetchTiers(expandedId);
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold tracking-wider">Campaign Management</h1>

      {/* Create new campaign */}
      <Card className="mb-6 border-border/50">
        <CardHeader><CardTitle className="text-sm">Create New Campaign</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Campaign ID (slug)" value={newCampaign.id} onChange={(e) => setNewCampaign({ ...newCampaign, id: e.target.value })} />
            <Input placeholder="Title" value={newCampaign.title} onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })} />
          </div>
          <Input placeholder="Description" value={newCampaign.description} onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Image URL" value={newCampaign.image_url} onChange={(e) => setNewCampaign({ ...newCampaign, image_url: e.target.value })} />
            <Input type="number" placeholder="Price" value={newCampaign.price} onChange={(e) => setNewCampaign({ ...newCampaign, price: Number(e.target.value) })} />
          </div>
          <Button onClick={createCampaign} disabled={loading} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </CardContent>
      </Card>

      {/* Campaign list */}
      <div className="space-y-3">
        {campaigns.map((c) => (
          <Card key={c.id} className="border-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {c.image_url && <img src={c.image_url} alt={c.title} className="h-10 w-10 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">ID: {c.id} • ${c.price}/ticket</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Active</span>
                  <Switch checked={c.is_active} onCheckedChange={(v) => updateCampaign(c.id, { is_active: v })} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Hot</span>
                  <Switch checked={c.is_hot} onCheckedChange={(v) => updateCampaign(c.id, { is_hot: v })} />
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleExpand(c.id)}>
                  {expandedId === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteCampaign(c.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Expanded: Tiers & Prizes */}
            {expandedId === c.id && (
              <CardContent className="border-t border-border/50 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Tiers & Prizes</h3>
                  <Button size="sm" variant="outline" onClick={() => addTier(c.id)} className="gap-1">
                    <Plus className="h-3 w-3" /> Add Tier
                  </Button>
                </div>
                <div className="space-y-4">
                  {tiers.map((tier) => (
                    <TierEditor
                      key={tier.id}
                      tier={tier}
                      onUpdate={(u) => updateTier(tier.id, u)}
                      onDelete={() => deleteTier(tier.id, c.id)}
                      onAddPrize={(name) => addPrize(tier.id, name)}
                      onDeletePrize={deletePrize}
                      onRefresh={() => fetchTiers(c.id)}
                    />
                  ))}
                  {tiers.length === 0 && <p className="text-sm text-muted-foreground">No tiers yet. Add one to get started.</p>}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        {campaigns.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No campaigns yet. Create one above.</p>
        )}
      </div>
    </div>
  );
};

// Tier editor sub-component
function TierEditor({
  tier,
  onUpdate,
  onDelete,
  onAddPrize,
  onDeletePrize,
  onRefresh,
}: {
  tier: CampaignTier;
  onUpdate: (u: Record<string, unknown>) => void;
  onDelete: () => void;
  onAddPrize: (name: string) => void;
  onDeletePrize: (id: string) => void;
  onRefresh: () => void;
}) {
  const [label, setLabel] = useState(tier.label);
  const [name, setName] = useState(tier.name);
  const [total, setTotal] = useState(tier.total);
  const [remaining, setRemaining] = useState(tier.remaining);
  const [weight, setWeight] = useState(tier.probability_weight);
  const [newPrize, setNewPrize] = useState("");

  const save = () => {
    onUpdate({ label, name, total, remaining, probability_weight: weight });
    onRefresh();
  };

  const tierColors: Record<string, string> = { S: "border-accent/50", A: "border-primary/50", B: "border-neon-pink/50", C: "border-border" };

  return (
    <div className={`rounded-lg border p-3 ${tierColors[label] || "border-border"}`}>
      <div className="flex items-center gap-2 mb-2">
        <select value={label} onChange={(e) => setLabel(e.target.value)} className="rounded bg-secondary px-2 py-1 text-sm font-bold">
          <option value="S">S</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tier name" className="h-8 text-sm flex-1" />
        <Button size="sm" variant="ghost" onClick={save}><Save className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <label className="text-xs text-muted-foreground">Total</label>
          <Input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} className="h-7 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Remaining</label>
          <Input type="number" value={remaining} onChange={(e) => setRemaining(Number(e.target.value))} className="h-7 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Weight</label>
          <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="h-7 text-sm" />
        </div>
      </div>
      {/* Prizes */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Prizes:</p>
        {tier.tier_prizes.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded bg-secondary/50 px-2 py-1">
            <span className="text-xs">{p.name}</span>
            <button onClick={() => onDeletePrize(p.id)} className="text-destructive hover:text-destructive/80">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-1">
          <Input value={newPrize} onChange={(e) => setNewPrize(e.target.value)} placeholder="New prize name" className="h-7 text-xs flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") { onAddPrize(newPrize); setNewPrize(""); } }} />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { onAddPrize(newPrize); setNewPrize(""); }}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

type CampaignTier = Tables<"campaign_tiers"> & { tier_prizes: Tables<"tier_prizes">[] };

export default AdminCampaigns;
