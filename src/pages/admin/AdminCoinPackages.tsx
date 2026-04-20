import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CoinPackage, emptyForm, PackageFormState } from "./coin-packages/types";
import { PackageRow } from "./coin-packages/PackageRow";
import { PackageForm } from "./coin-packages/PackageForm";

const AdminCoinPackages = () => {
  const { toast } = useToast();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CoinPackage | null>(null);
  const [form, setForm] = useState<PackageFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchPackages = async () => {
    const { data } = await supabase.from("coin_packages").select("*").order("sort_order");
    setPackages((data as CoinPackage[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPackages(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (pkg: CoinPackage) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      coins: pkg.coins,
      price: pkg.price,
      icon: pkg.icon,
      is_popular: pkg.is_popular,
      is_active: pkg.is_active,
      discount_percent: pkg.discount_percent,
      discount_start: pkg.discount_start,
      discount_end: pkg.discount_end,
      bonus_coins: pkg.bonus_coins,
      bonus_label: pkg.bonus_label,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("coin_packages").update(form).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Paket berhasil diperbarui" });
      } else {
        const nextOrder = packages.length > 0 ? Math.max(...packages.map(p => p.sort_order)) + 1 : 1;
        const { error } = await supabase.from("coin_packages").insert({ ...form, sort_order: nextOrder });
        if (error) throw error;
        toast({ title: "Paket berhasil ditambahkan" });
      }
      setDialogOpen(false);
      fetchPackages();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const persistOrder = async (ordered: CoinPackage[]) => {
    const updates = ordered.map((pkg, idx) =>
      supabase.from("coin_packages").update({ sort_order: idx + 1 }).eq("id", pkg.id)
    );
    await Promise.all(updates);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus paket ini?")) return;
    const { error } = await supabase.from("coin_packages").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paket dihapus" });
      const remaining = packages.filter(p => p.id !== id);
      await persistOrder(remaining);
      fetchPackages();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = packages.findIndex(p => p.id === active.id);
    const newIndex = packages.findIndex(p => p.id === over.id);
    const reordered = arrayMove(packages, oldIndex, newIndex).map((p, idx) => ({ ...p, sort_order: idx + 1 }));

    setPackages(reordered);
    setReordering(true);
    try {
      await persistOrder(reordered);
      toast({ title: "Urutan diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal menyimpan urutan", description: err.message, variant: "destructive" });
      fetchPackages();
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Coin Packages</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Drag <GripVertical className="inline h-3 w-3" /> untuk mengubah urutan. Penomoran otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reordering && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Tambah Paket
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-2 py-3 w-10"></th>
              <th className="px-3 py-3 text-left font-medium">#</th>
              <th className="px-3 py-3 text-left font-medium">Nama</th>
              <th className="px-3 py-3 text-left font-medium">Koin</th>
              <th className="px-3 py-3 text-left font-medium">Harga</th>
              <th className="px-3 py-3 text-left font-medium">Diskon</th>
              <th className="px-3 py-3 text-left font-medium">Bonus</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={packages.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {packages.map((pkg, idx) => (
                  <PackageRow key={pkg.id} pkg={pkg} index={idx} onEdit={openEdit} onDelete={handleDelete} />
                ))}
                {packages.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Belum ada paket</td></tr>
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      <PackageForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={!!editing}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  );
};

export default AdminCoinPackages;
