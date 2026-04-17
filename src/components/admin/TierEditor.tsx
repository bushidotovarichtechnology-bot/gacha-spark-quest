import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Plus, Upload, GripVertical, Coins } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type CampaignTier = Tables<"campaign_tiers"> & { tier_prizes: Tables<"tier_prizes">[] };

const uploadImage = async (file: File, folder: string) => {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("campaign-images").upload(path, file, { upsert: true });
  if (error) throw error;
  return `${SUPABASE_URL}/storage/v1/object/public/campaign-images/${path}`;
};

function SortablePrizeRow({
  p,
  onRefresh,
  onDeletePrize,
  handlePrizeImageUpload,
}: {
  p: Tables<"tier_prizes">;
  onRefresh: () => void;
  onDeletePrize: (id: string) => void;
  handlePrizeImageUpload: (prizeId: string, file: File) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded bg-secondary/50 px-2 py-1">
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {p.image_url && <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover" />}
      <div className="flex-1 space-y-1">
        <Input
          className="h-6 text-xs"
          value={p.name}
          onChange={async (e) => {
            await supabase.from("tier_prizes").update({ name: e.target.value }).eq("id", p.id);
            onRefresh();
          }}
          placeholder="Nama prize"
        />
        <Input
          className="h-6 text-xs"
          value={p.description ?? ""}
          onChange={async (e) => {
            await supabase.from("tier_prizes").update({ description: e.target.value }).eq("id", p.id);
            onRefresh();
          }}
          placeholder="Deskripsi/spesifikasi prize"
        />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-muted-foreground">Koin</label>
        <Input type="number" className="h-6 w-16 text-xs" value={(p as any).coin_value ?? 0} onChange={async (e) => {
          await supabase.from("tier_prizes").update({ coin_value: Number(e.target.value) } as any).eq("id", p.id);
          onRefresh();
        }} placeholder="0" title="Nilai daur ulang (koin)" />
      </div>
      <div className="flex items-center gap-1">
        <label className="text-[10px] text-muted-foreground">Berat (g)</label>
        <Input
          type="number"
          min={1}
          className="h-6 w-16 text-xs"
          value={(p as any).weight_grams ?? 1000}
          onChange={async (e) => {
            await supabase.from("tier_prizes").update({ weight_grams: Number(e.target.value) } as any).eq("id", p.id);
            onRefresh();
          }}
          placeholder="1000"
          title="Berat paket dalam gram untuk perhitungan ongkir Biteship"
        />
      </div>
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
      <label className="flex items-center gap-1 cursor-pointer" title="Auto Refill: stok otomatis terisi ulang saat habis">
        <input
          type="checkbox"
          checked={p.auto_refill}
          onChange={async (e) => {
            await supabase.from("tier_prizes").update({ auto_refill: e.target.checked }).eq("id", p.id);
            onRefresh();
          }}
          className="h-3 w-3 rounded border-input accent-primary"
        />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Refill</span>
      </label>
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
  );
}

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
  const [bulkCoinValue, setBulkCoinValue] = useState("");
  const [newPrize, setNewPrize] = useState("");
  const [newPrizeTotal, setNewPrizeTotal] = useState(1);
  const [tierImageUrl, setTierImageUrl] = useState(tier.image_url);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedPrizes = [...tier.tier_prizes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const prizeIds = sortedPrizes.map((p) => p.id);

  const save = () => {
    onUpdate({ label, name, image_url: tierImageUrl });
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = prizeIds.indexOf(active.id as string);
    const newIndex = prizeIds.indexOf(over.id as string);
    const reordered = arrayMove(sortedPrizes, oldIndex, newIndex);

    // Update sort_order in DB
    const updates = reordered.map((p, i) =>
      supabase.from("tier_prizes").update({ sort_order: i }).eq("id", p.id)
    );
    await Promise.all(updates);
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



      {/* Bulk coin value edit */}
      <div className="flex items-center gap-2 mb-2">
        <Coins className="h-4 w-4 text-accent shrink-0" />
        <Input
          type="number"
          min={0}
          value={bulkCoinValue}
          onChange={(e) => setBulkCoinValue(e.target.value)}
          placeholder="Nilai daur ulang untuk semua prize"
          className="h-7 text-sm flex-1"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs whitespace-nowrap"
          disabled={!bulkCoinValue}
          onClick={async () => {
            const val = Number(bulkCoinValue);
            if (isNaN(val) || val < 0) return;
            const updates = tier.tier_prizes.map((p) =>
              supabase.from("tier_prizes").update({ coin_value: val } as any).eq("id", p.id)
            );
            await Promise.all(updates);
            setBulkCoinValue("");
            onRefresh();
            toast({ title: "Berhasil", description: `Semua prize di tier ${label} diatur ke ${val} koin` });
          }}
        >
          Terapkan Semua
        </Button>
      </div>

      {/* Prizes with drag-and-drop */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Prizes (drag to reorder):</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={prizeIds} strategy={verticalListSortingStrategy}>
            {sortedPrizes.map((p) => (
              <SortablePrizeRow
                key={p.id}
                p={p}
                onRefresh={onRefresh}
                onDeletePrize={onDeletePrize}
                handlePrizeImageUpload={handlePrizeImageUpload}
              />
            ))}
          </SortableContext>
        </DndContext>
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
