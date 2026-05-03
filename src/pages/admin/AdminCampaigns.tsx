import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, GripVertical, Loader2 } from "lucide-react";
import { CampaignRow } from "@/components/admin/CampaignRow";
import { TierEditor, type CampaignTier } from "@/components/admin/TierEditor";
import { BulkTierPanel } from "@/components/admin/BulkTierPanel";
import type { Tables } from "@/integrations/supabase/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortableList } from "@/hooks/use-sortable-list";
import { useImageCrop } from "@/hooks/use-image-crop";

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

interface SortableCampaignProps {
  campaign: Campaign;
  index: number;
  children: React.ReactNode;
}

const SortableCampaign = ({ campaign, index, children }: SortableCampaignProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: campaign.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-2 mt-3 text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-center font-mono text-xs text-muted-foreground w-6 mt-4">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
};

const AdminCampaigns = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tiers, setTiers] = useState<CampaignTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ id: "", title: "", description: "", image_url: "", price: 5, subcategory_id: "" });
  const [subcategoryOptions, setSubcategoryOptions] = useState<SubcategoryOption[]>([]);
  const { sensors, collisionDetection, reorder } = useSortableList();

  const newCampaignCrop = useImageCrop(
    { defaultAspect: "1:1", title: "Crop gambar campaign baru" },
    async (cropped) => {
      if (!newCampaign.id) {
        toast({ title: "Set Campaign ID dulu", variant: "destructive" });
        return;
      }
      try {
        const url = await uploadCampaignImage(cropped, newCampaign.id);
        setNewCampaign((prev) => ({ ...prev, image_url: url }));
        toast({ title: "Image uploaded!" });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    },
  );

  const fetchSubcategoryOptions = async () => {
    const { data: cats } = await supabase.from("categories").select("id, name").order("sort_order");
    const { data: subs } = await supabase.from("subcategories").select("id, name, category_id").order("sort_order");
    if (cats && subs) {
      const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
      setSubcategoryOptions(subs.map((s) => ({ id: s.id, name: s.name, category_name: catMap[s.category_id] || "" })));
    }
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase.from("campaigns").select("*").order("sort_order").order("created_at");
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

  const persistOrder = async (ordered: Campaign[]) => {
    const updates = ordered.map((c, idx) =>
      supabase.from("campaigns").update({ sort_order: idx + 1 }).eq("id", c.id)
    );
    await Promise.all(updates);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const reordered = reorder(campaigns, event);
    if (!reordered) return;
    setCampaigns(reordered);
    setReordering(true);
    try {
      await persistOrder(reordered);
      toast({ title: "Urutan campaign diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal menyimpan urutan", description: err.message, variant: "destructive" });
      fetchCampaigns();
    } finally {
      setReordering(false);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.id || !newCampaign.title) {
      toast({ title: "ID and Title are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const nextOrder = campaigns.length > 0 ? Math.max(...campaigns.map(c => c.sort_order || 0)) + 1 : 1;
    const payload = {
      id: newCampaign.id,
      title: newCampaign.title,
      description: newCampaign.description,
      image_url: newCampaign.image_url,
      price: newCampaign.price,
      sort_order: nextOrder,
      slug: "", // auto-generated by DB trigger from title
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

  const addPrize = async (tierId: string, name: string, total: number = 1) => {
    if (!name.trim()) return;
    await supabase.from("tier_prizes").insert({ tier_id: tierId, name: name.trim(), total, remaining: total });
    if (expandedId) fetchTiers(expandedId);
  };

  const deletePrize = async (prizeId: string) => {
    await supabase.from("tier_prizes").delete().eq("id", prizeId);
    if (expandedId) fetchTiers(expandedId);
  };

  const tierSortable = useSortableList();

  const handleTierDragEnd = async (event: DragEndEvent, campaignId: string) => {
    const reordered = tierSortable.reorder(tiers, event);
    if (!reordered) return;
    setTiers(reordered);
    const updates = reordered.map((t, idx) =>
      supabase.from("campaign_tiers").update({ sort_order: idx }).eq("id", t.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast({ title: "Gagal menyimpan urutan tier", description: failed.error.message, variant: "destructive" });
      fetchTiers(campaignId);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider">Campaign Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Drag <GripVertical className="inline h-3 w-3" /> untuk mengubah urutan tampilan.
          </p>
        </div>
        {reordering && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

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
                <label className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-input bg-background hover:bg-accent" title="Upload gambar (Max 5MB · JPG/PNG/WebP)">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!newCampaign.id) {
                      toast({ title: "Set Campaign ID dulu", variant: "destructive" });
                      e.target.value = "";
                      return;
                    }
                    newCampaignCrop.pickFile(file);
                    e.target.value = "";
                  }} />
                </label>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Max 5MB, format JPG/PNG/WebP</p>
            </div>
            <NumberInput placeholder="Harga" suffix="koin" value={newCampaign.price} onValueChange={(val) => setNewCampaign({ ...newCampaign, price: val })} />
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
              <img src={newCampaign.image_url} alt="Preview" className="h-16 w-16 rounded-lg object-contain bg-secondary/40 p-1.5" />
              <span className="text-xs text-muted-foreground truncate flex-1">{newCampaign.image_url}</span>
            </div>
          )}
          <Button onClick={createCampaign} disabled={loading} className="gap-1.5">
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </CardContent>
      </Card>

      <BulkTierPanel campaignIds={campaigns.map((c) => c.id)} onDone={() => { fetchCampaigns(); if (expandedId) fetchTiers(expandedId); }} />

      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
        <SortableContext items={campaigns.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {campaigns.map((c, idx) => (
              <SortableCampaign key={c.id} campaign={c} index={idx}>
                <Card className="border-border/50 group">
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
                        <DndContext
                          sensors={tierSortable.sensors}
                          collisionDetection={tierSortable.collisionDetection}
                          onDragEnd={(e) => handleTierDragEnd(e, c.id)}
                        >
                          <SortableContext items={tiers.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-4">
                              {tiers.map((tier) => (
                                <TierEditor
                                  key={tier.id}
                                  tier={tier}
                                  onUpdate={(u) => updateTier(tier.id, u)}
                                  onDelete={() => deleteTier(tier.id, c.id)}
                                  onAddPrize={(name, total) => addPrize(tier.id, name, total)}
                                  onDeletePrize={deletePrize}
                                  onRefresh={() => fetchTiers(c.id)}
                                />
                              ))}
                              {tiers.length === 0 && <p className="text-sm text-muted-foreground">No tiers yet. Add one to get started.</p>}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </CardContent>
                    )}
                  </CampaignRow>
                </Card>
              </SortableCampaign>
            ))}
            {campaigns.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No campaigns yet. Create one above.</p>
            )}
          </div>
        </SortableContext>
      </DndContext>
      {newCampaignCrop.dialog}
    </div>
  );
};

export default AdminCampaigns;
