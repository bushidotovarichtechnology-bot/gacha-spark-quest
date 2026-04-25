import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { toast } from "sonner";
import { Plus, Pencil, Image as ImageIcon, Loader2, Megaphone, ExternalLink, Trash2 } from "lucide-react";
import { useImageCrop } from "@/hooks/use-image-crop";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortableItem } from "@/components/admin/SortableItem";
import { useSortableList } from "@/hooks/use-sortable-list";

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  cta_label: string;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

const empty: Omit<PromoBanner, "id"> = {
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "",
  cta_label: "",
  is_active: true,
  sort_order: 0,
  starts_at: null,
  ends_at: null,
};

const toLocalDT = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
};

const fromLocalDT = (v: string) => (v ? new Date(v).toISOString() : null);

const AdminPromoBanners = () => {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromoBanner | null>(null);
  const [form, setForm] = useState<Omit<PromoBanner, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_banners")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Gagal memuat banner");
    } else {
      setBanners((data ?? []) as PromoBanner[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("promo-banners").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("promo-banners").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("Gambar berhasil diunggah");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload gagal";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const { pickFile, dialog: cropDialog } = useImageCrop(
    {
      defaultAspect: "16:9",
      allowedAspects: ["16:9", "4:3"],
      title: "Crop banner promo",
      maxSizeMB: 5,
    },
    onUpload,
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, sort_order: banners.length });
    setOpen(true);
  };

  const openEdit = (b: PromoBanner) => {
    setEditing(b);
    const { id, ...rest } = b;
    void id;
    setForm(rest);
    setOpen(true);
  };

  const save = async () => {
    if (!form.image_url) {
      toast.error("Gambar banner wajib diunggah");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from("promo_banners").update(payload).eq("id", editing.id)
      : await supabase.from("promo_banners").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Banner diperbarui" : "Banner dibuat");
    setOpen(false);
    fetchBanners();
  };

  const remove = async (b: PromoBanner) => {
    const { error } = await supabase.from("promo_banners").delete().eq("id", b.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Banner dihapus");
    fetchBanners();
  };

  const { sensors, collisionDetection, reorder } = useSortableList();

  const onDragEnd = async (event: DragEndEvent) => {
    const next = reorder(banners, event);
    if (!next) return;
    const previous = banners;
    // Optimistic UI: assign new sort_order by index
    const updated = next.map((b, i) => ({ ...b, sort_order: i }));
    setBanners(updated);
    // Persist only changed rows
    const changes = updated.filter((b, i) => previous.find((p) => p.id === b.id)?.sort_order !== i);
    const results = await Promise.all(
      changes.map((b) => supabase.from("promo_banners").update({ sort_order: b.sort_order }).eq("id", b.id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("Gagal menyimpan urutan");
      setBanners(previous);
    } else if (changes.length > 0) {
      toast.success("Urutan diperbarui");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Promo Banners
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola banner carousel promosi yang tampil di homepage.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Banner Baru
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat...
        </div>
      ) : banners.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Belum ada banner. Klik "Banner Baru" untuk membuat.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="aspect-[16/7] bg-muted">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{b.title || "(Tanpa judul)"}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{b.subtitle}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.is_active
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                {b.link_url && (
                  <a
                    href={b.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {b.link_url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <span className="text-xs text-muted-foreground">Urutan: {b.sort_order}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <ConfirmDelete onConfirm={() => remove(b)} description={`Hapus banner "${b.title || "tanpa judul"}"?`}>
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        Hapus
                      </Button>
                    </ConfirmDelete>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Banner" : "Banner Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Gambar Banner *</Label>
              <div className="mt-2 space-y-2">
                {form.image_url && (
                  <div className="aspect-[16/7] overflow-hidden rounded-lg border border-border">
                    <img src={form.image_url} alt="preview" className="h-full w-full object-cover" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickFile(f);
                    e.target.value = "";
                  }}
                />
                {uploading && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Mengunggah...
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Rekomendasi rasio 16:7 atau 16:5. Maks 5MB.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Judul</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Promo spesial..." />
              </div>
              <div>
                <Label>Label Tombol (CTA)</Label>
                <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Cek sekarang" />
              </div>
            </div>

            <div>
              <Label>Subtitle</Label>
              <Textarea
                rows={2}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Deskripsi singkat promo..."
              />
            </div>

            <div>
              <Label>Link URL</Label>
              <Input
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="/campaign/slug atau https://..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Kosongkan jika tidak ingin banner bisa diklik.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Mulai Tampil</Label>
                <Input
                  type="datetime-local"
                  value={toLocalDT(form.starts_at)}
                  onChange={(e) => setForm({ ...form, starts_at: fromLocalDT(e.target.value) })}
                />
              </div>
              <div>
                <Label>Berakhir</Label>
                <Input
                  type="datetime-local"
                  value={toLocalDT(form.ends_at)}
                  onChange={(e) => setForm({ ...form, ends_at: fromLocalDT(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Urutan</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <Label className="cursor-pointer">Aktif</Label>
                  <p className="text-xs text-muted-foreground">Tampilkan di homepage</p>
                </div>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Simpan" : "Buat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cropDialog}
    </div>
  );
};

export default AdminPromoBanners;
