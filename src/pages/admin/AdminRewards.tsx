import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const AdminRewards = () => {
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RewardForm>(emptyForm);
  const [showAdd, setShowAdd] = useState(false);

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["admin-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("redeem_rewards").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("redeem_rewards").update(form).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("redeem_rewards").insert(form);
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

  const startEdit = (reward: any) => {
    setEditId(reward.id);
    setForm({ name: reward.name, description: reward.description, image_url: reward.image_url, ticket_cost: reward.ticket_cost, ticket_type: reward.ticket_type, stock: reward.stock, is_active: reward.is_active });
    setShowAdd(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Redeem Rewards
        </h1>
        <Button size="sm" onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm); }}>
          <Plus className="mr-1.5 h-4 w-4" /> Tambah
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold">{editId ? "Edit Reward" : "Tambah Reward"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <Input placeholder="Deskripsi" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input type="number" placeholder="Harga Tiket" value={form.ticket_cost} onChange={(e) => setForm({ ...form, ticket_cost: Number(e.target.value) })} />
            <Input type="number" placeholder="Stok" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <span className="text-sm">{form.is_active ? "Aktif" : "Nonaktif"}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
              <Save className="mr-1.5 h-4 w-4" /> Simpan
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setEditId(null); }}>
              <X className="mr-1.5 h-4 w-4" /> Batal
            </Button>
          </div>
        </div>
      )}

      {/* Rewards List */}
      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {rewards.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              {r.image_url && <img src={r.image_url} alt={r.name} className="h-10 w-10 rounded object-cover" />}
              <div>
                <span className="text-sm font-semibold">{r.name}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>🎫 {r.ticket_cost}</span>
                  <span>📦 Stok: {r.stock}</span>
                  <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Aktif" : "Nonaktif"}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Claims */}
      <div>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Penukaran Terbaru</h2>
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
      </div>
    </div>
  );
};

export default AdminRewards;
