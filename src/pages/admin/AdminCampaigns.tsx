import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload } from "lucide-react";
import { CampaignRow } from "@/components/admin/CampaignRow";
import { TierEditor, type CampaignTier } from "@/components/admin/TierEditor";
import type { Tables } from "@/integrations/supabase/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface SubcategoryOption {
  id: string;
  name: string;
  category_name: string;
}

const uploadCampaignImage = async (file: File, campaignId: string) => {
  const ext = file.name.split(".").pop();
  const path = `${campaignId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("campaign-images").upload(path, file, { upsert: true });
  if (error) throw error;
  return `${SUPABASE_URL}/storage/v1/object/public/campaign-images/${path}`;
};

type Campaign = Tables<"campaigns">;

const emptyTier = { label: "C", name: "", total: 1, remaining: 1, probability_weight: 1, sort_order: 0 };

const AdminCampaigns = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<CampaignTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ id: "", title: "", description: "", image_url: "", price: 5, subcategory_id: "" });
  const [subcategoryOptions, setSubcategoryOptions] = useState<SubcategoryOption[]>([]);

  const fetchSubcategoryOptions = async () => {
    const { data: cats } = await supabase.from("categories").select("id, name").order("sort_order");
    const { data: subs } = await supabase.from("subcategories").select("id, name, category_id").order("sort_order");
    if (cats && subs) {
      const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
      setSubcategoryOptions(subs.map((s) => ({ id: s.id, name: s.name, category_name: catMap[s.category_id] || "" })));
    }
  };

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

  useEffect(() => { fetchCampaigns(); fetchSubcategoryOptions(); }, []);

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); setTiers([]); }
    else { setExpandedId(id); fetchTiers(id); }
  };

  const createCampaign = async () => {
    if (!newCampaign.id || !newCampaign.title) {
      toast({ title: "ID and Title are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const payload = {
      id: newCampaign.id,
      title: newCampaign.title,
      description: newCampaign.description,
      image_url: newCampaign.image_url,
      price: newCampaign.price,
      ...(newCampaign.subcategory_id ? { subcategory_id: newCampaign.subcategory_id } : {}),
    };
    const { error } = await supabase.from("campaigns").insert(payload);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Campaign created!" }); setNewCampaign({ id: "", title: "", description: "", image_url: "", price: 5, subcategory_id: "" }); fetchCampaigns(); }
    setLoading(false);
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    const { error } = await supabase.from("campaigns").update(updates).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated!" }); fetchCampaigns(); }
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Campaign deleted" }); if (expandedId === id) { setExpandedId(null); setTiers([]); } fetchCampaigns(); }
  };

  const addTier = async (campaignId: string) => {
    const { error } = await supabase.from("campaign_tiers").insert({ campaign_id: campaignId, ...emptyTier, sort_order: tiers.length });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchTiers(campaignId);
  };

  const updateTier = async (tierId: string, updates: Record<string, unknown>) => {
    const { error } = await supabase.from("campaign_tiers").update(updates).eq("id", tierId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Tier updated!" });
    if (expandedId) fetchTiers(expandedId);
  };

  const deleteTier = async (tierId: string, campaignId: string) => {
    await supabase.from("campaign_tiers").delete().eq("id", tierId);
    fetchTiers(campaignId);
  };

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

      <Card className="mb-6 border-border/50">
        <CardHeader><CardTitle className="text-sm">Create New Campaign</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Campaign ID (slug)" value={newCampaign.id} onChange={(e) => setNewCampaign({ ...newCampaign, id: e.target.value })} />
            <Input placeholder="Title" value={newCampaign.title} onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })} />
          </div>
          <Input placeholder="Description" value={newCampaign.description} onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Image (upload or URL)</label>
              <div className="flex gap-2">
                <Input placeholder="Image URL" value={newCampaign.image_url} onChange={(e) => setNewCampaign({ ...newCampaign, image_url: e.target.value })} className="flex-1" />
                <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background hover:bg-accent">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !newCampaign.id) { toast({ title: "Set Campaign ID first", variant: "destructive" }); return; }
                    try {
                      const url = await uploadCampaignImage(file, newCampaign.id);
                      setNewCampaign({ ...newCampaign, image_url: url });
                      toast({ title: "Image uploaded!" });
                    } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
                  }} />
                </label>
              </div>
            </div>
            <Input type="number" placeholder="Price" value={newCampaign.price} onChange={(e) => setNewCampaign({ ...newCampaign, price: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Subkategori (opsional)</label>
            <Select value={newCampaign.subcategory_id || "none"} onValueChange={(v) => setNewCampaign({ ...newCampaign, subcategory_id: v === "none" ? "" : v })}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Pilih subkategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa kategori</SelectItem>
                {subcategoryOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.category_name} → {opt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {newCampaign.image_url && (
            <div className="flex items-center gap-2">
              <img src={newCampaign.image_url} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
              <span className="text-xs text-muted-foreground truncate flex-1">{newCampaign.image_url}</span>
            </div>
          )}
          <Button onClick={createCampaign} disabled={loading} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <Card key={c.id} className="border-border/50 group">
            <CampaignRow
              campaign={c}
              isExpanded={expandedId === c.id}
              onToggleExpand={() => toggleExpand(c.id)}
              onUpdate={updateCampaign}
              onDelete={deleteCampaign}
              subcategoryOptions={subcategoryOptions}
              onUploadImage={async (id, file) => {
                try {
                  const url = await uploadCampaignImage(file, id);
                  await updateCampaign(id, { image_url: url });
                  toast({ title: "Image updated!" });
                } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
              }}
            >
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
            </CampaignRow>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No campaigns yet. Create one above.</p>
        )}
      </div>
    </div>
  );
};

export default AdminCampaigns;
