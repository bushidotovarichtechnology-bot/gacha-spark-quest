import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Plus, Upload } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type CampaignTier = Tables<"campaign_tiers"> & { tier_prizes: Tables<"tier_prizes">[] };

const uploadImage = async (file: File, folder: string) => {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("campaign-images").upload(path, file, { upsert: true });
  if (error) throw error;
  return `${SUPABASE_URL}/storage/v1/object/public/campaign-images/${path}`;
};

export function TierEditor({
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
  onAddPrize: (name: string, total: number, imageUrl?: string) => void;
  onDeletePrize: (id: string) => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [label, setLabel] = useState(tier.label);
  const [name, setName] = useState(tier.name);
  const [total, setTotal] = useState(tier.total);
  const [remaining, setRemaining] = useState(tier.remaining);
  const [weight, setWeight] = useState(tier.probability_weight);
  const [newPrize, setNewPrize] = useState("");
  const [newPrizeTotal, setNewPrizeTotal] = useState(1);
  const [tierImageUrl, setTierImageUrl] = useState(tier.image_url);

  const save = () => {
    onUpdate({ label, name, total, remaining, probability_weight: weight, image_url: tierImageUrl });
    onRefresh();
  };

  const handleTierImageUpload = async (file: File) => {
    try {
      const url = await uploadImage(file, `tiers/${tier.id}`);
      setTierImageUrl(url);
      onUpdate({ image_url: url });
      onRefresh();
      toast({ title: "Gambar tier diupload!" });
    } catch (err: any) {
      toast({ title: "Upload gagal", description: err.message, variant: "destructive" });
    }
  };

  const handlePrizeImageUpload = async (prizeId: string, file: File) => {
    try {
      const url = await uploadImage(file, `prizes/${prizeId}`);
      await supabase.from("tier_prizes").update({ image_url: url }).eq("id", prizeId);
      onRefresh();
      toast({ title: "Gambar hadiah diupload!" });
    } catch (err: any) {
      toast({ title: "Upload gagal", description: err.message, variant: "destructive" });
    }
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
        <ConfirmDelete title="Hapus Tier?" description={`Tier "${name}" beserta semua hadiahnya akan dihapus.`} onConfirm={onDelete}>
          <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
        </ConfirmDelete>
      </div>

      {/* Tier image */}
      <div className="flex items-center gap-2 mb-2">
        {tierImageUrl && <img src={tierImageUrl} alt={name} className="h-12 w-12 rounded-lg object-cover" />}
        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2 text-xs hover:bg-accent">
          <Upload className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{tierImageUrl ? "Ganti gambar tier" : "Upload gambar tier"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleTierImageUpload(file);
          }} />
        </label>
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
          <div key={p.id} className="flex items-center gap-2 rounded bg-secondary/50 px-2 py-1">
            {p.image_url && <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />}
            <span className="text-xs flex-1">{p.name}</span>
            <div className="flex items-center gap-1">
              <label className="text-[10px] text-muted-foreground">Rem</label>
              <Input type="number" className="h-6 w-14 text-xs" value={p.remaining} onChange={async (e) => {
                await supabase.from("tier_prizes").update({ remaining: Number(e.target.value) }).eq("id", p.id);
                onRefresh();
              }} />
              <span className="text-[10px] text-muted-foreground">/</span>
              <Input type="number" className="h-6 w-14 text-xs" value={p.total} onChange={async (e) => {
                await supabase.from("tier_prizes").update({ total: Number(e.target.value) }).eq("id", p.id);
                onRefresh();
              }} />
            </div>
            <label className="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-accent" title="Upload gambar hadiah">
              <Upload className="h-3 w-3 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePrizeImageUpload(p.id, file);
              }} />
            </label>
            <ConfirmDelete title="Hapus Hadiah?" description={`Hadiah "${p.name}" akan dihapus dari tier ini.`} onConfirm={() => onDeletePrize(p.id)}>
              <button className="text-destructive hover:text-destructive/80">
                <Trash2 className="h-3 w-3" />
              </button>
            </ConfirmDelete>
          </div>
        ))}
        <div className="flex gap-1">
          <Input value={newPrize} onChange={(e) => setNewPrize(e.target.value)} placeholder="New prize name" className="h-7 text-xs flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") { onAddPrize(newPrize, newPrizeTotal); setNewPrize(""); setNewPrizeTotal(1); } }} />
          <Input type="number" value={newPrizeTotal} onChange={(e) => setNewPrizeTotal(Number(e.target.value))} placeholder="Qty" className="h-7 w-14 text-xs" />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { onAddPrize(newPrize, newPrizeTotal); setNewPrize(""); setNewPrizeTotal(1); }}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { CampaignTier };
