import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, Plus, Pencil, Trash2, Save, X, Upload, Image as ImageIcon, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortableList } from "@/hooks/use-sortable-list";
import { useImageCrop } from "@/hooks/use-image-crop";

interface RewardForm {
  name: string;
  description: string;
  image_url: string;
  ticket_cost: number;
  ticket_type: string;
  stock: number;
  is_active: boolean;
}

const emptyForm: RewardForm = { name: "", description: "", image_url: "", ticket_cost: 10, ticket_type: "standard", stock: 0, is_active: true };

interface Reward {
  id: string;
  name: string;
  description: string;
  image_url: string;
  ticket_cost: number;
  ticket_type: string;
  stock: number;
  is_active: boolean;
  sort_order: number;
}

interface SortableRewardRowProps {
  reward: Reward;
  index: number;
  onEdit: (r: Reward) => void;
  onDelete: (id: string) => void;
}

const SortableRewardRow = ({ reward: r, index, onEdit, onDelete }: SortableRewardRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: r.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-1 text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Drag"
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs text-muted-foreground w-6 text-center">{index + 1}</span>
        {r.image_url ? (
          <img src={r.image_url} alt={r.name} className="h-12 w-12 rounded-lg border border-border object-contain bg-secondary/40 p-1" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <span className="text-sm font-semibold">{r.name}</span>
          {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span>🎫 {r.ticket_cost} tiket ({r.ticket_type})</span>
            <span>📦 Stok: {r.stock}</span>
            <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Aktif" : "Nonaktif"}</Badge>
          </div>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="icon" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

const AdminRewards = () => {
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sensors, collisionDetection, reorder } = useSortableList();

  const { data: rewards = [], isLoading } = useQuery<Reward[]>({
    queryKey: ["admin-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("redeem_rewards").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return (data as Reward[]) || [];
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["admin-redeem-claims"],
    queryFn: async () => {
      const { data, error } = await supabase.from("redeem_claims").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const uploadCroppedImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran file maksimal 5MB"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `reward-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("reward-images").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("reward-images").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success("Gambar berhasil diupload");
    } catch (err: any) {
      toast.error("Gagal upload: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const { pickFile, dialog: cropDialog } = useImageCrop(
    { defaultAspect: "1:1", title: "Crop gambar reward" },
    uploadCroppedImage,
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    pickFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("redeem_rewards").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const nextOrder = rewards.length > 0 ? Math.max(...rewards.map(r => r.sort_order || 0)) + 1 : 1;
        const { error } = await supabase.from("redeem_rewards").insert({ ...form, sort_order: nextOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Reward diperbarui" : "Reward ditambahkan");
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
      setEditId(null);
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("redeem_rewards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reward dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    },
  });

  const updateClaimStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("redeem_claims").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-redeem-claims"] });
    },
  });

  const startEdit = (reward: Reward) => {
    setEditId(reward.id);
    setForm({ name: reward.name, description: reward.description, image_url: reward.image_url, ticket_cost: reward.ticket_cost, ticket_type: reward.ticket_type, stock: reward.stock, is_active: reward.is_active });
    setShowAdd(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const reordered = reorder(rewards, event);
    if (!reordered) return;
    // Optimistic update
    queryClient.setQueryData(["admin-rewards"], reordered);
    setReordering(true);
    try {
      const updates = reordered.map((r, i) => supabase.from("redeem_rewards").update({ sort_order: i + 1 }).eq("id", r.id));
      await Promise.all(updates);
      toast.success("Urutan hadiah diperbarui");
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    } catch (err: any) {
      toast.error("Gagal: " + err.message);
      queryClient.invalidateQueries({ queryKey: ["admin-rewards"] });
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> Bushido Tiket Rewards
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Drag <GripVertical className="inline h-3 w-3" /> untuk mengubah urutan tampilan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reordering && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button size="sm" onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Hadiah
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-bold">{editId ? "Edit Hadiah" : "Tambah Hadiah Baru"}</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nama Hadiah</Label>
              <Input placeholder="Contoh: Voucher 50K" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Deskripsi</Label>
              <Input placeholder="Deskripsi singkat hadiah" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Gambar Hadiah</Label>
              <div className="flex items-center gap-3">
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="h-16 w-16 rounded-lg border border-border object-cover" />
                )}
                <div className="flex flex-1 gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-1.5 h-4 w-4" />
                    {uploading ? "Mengupload..." : "Upload Gambar"}
                  </Button>
                  <Input placeholder="Atau masukkan URL gambar" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Jumlah Tiket untuk Ditukarkan</Label>
              <Input type="number" min={1} placeholder="10" value={form.ticket_cost} onChange={(e) => setForm({ ...form, ticket_cost: Number(e.target.value) })} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipe Tiket</Label>
              <select
                value={form.ticket_type}
                onChange={(e) => setForm({ ...form, ticket_type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Stok Tersedia</Label>
              <Input type="number" min={0} placeholder="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>

            <div className="flex items-end gap-2 pb-1">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="text-sm">{form.is_active ? "Aktif" : "Nonaktif"}</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              <Save className="mr-1.5 h-4 w-4" /> Simpan
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setEditId(null); }}>
              <X className="mr-1.5 h-4 w-4" /> Batal
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="rewards">
        <TabsList>
          <TabsTrigger value="rewards">Daftar Hadiah ({rewards.length})</TabsTrigger>
          <TabsTrigger value="claims">Penukaran ({claims.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {rewards.length === 0 && !isLoading && <p className="text-sm text-muted-foreground">Belum ada hadiah. Klik "Tambah Hadiah" untuk menambahkan.</p>}
          <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
            <SortableContext items={rewards.map(r => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {rewards.map((r, idx) => (
                  <SortableRewardRow
                    key={r.id}
                    reward={r}
                    index={idx}
                    onEdit={startEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </TabsContent>

        <TabsContent value="claims">
          <div className="space-y-2">
            {claims.length === 0 && <p className="text-sm text-muted-foreground">Belum ada penukaran.</p>}
            {claims.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                <div>
                  <span className="text-sm font-semibold">{c.reward_name}</span>
                  <p className="text-xs text-muted-foreground">🎫 {c.tickets_spent} tiket • {new Date(c.created_at).toLocaleDateString("id-ID")}</p>
                </div>
                <select
                  value={c.status}
                  onChange={(e) => updateClaimStatus.mutate({ id: c.id, status: e.target.value })}
                  className="rounded border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      {cropDialog}
    </div>
  );
};

export default AdminRewards;
