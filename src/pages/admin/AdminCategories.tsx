import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, GripVertical, icons, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortableList } from "@/hooks/use-sortable-list";

const ICON_OPTIONS = [
  "", "Smartphone", "Laptop", "Gamepad2", "Watch", "Headphones", "Camera",
  "Tv", "Monitor", "Tablet", "Speaker", "Cpu", "HardDrive", "Wifi",
  "Gift", "ShoppingBag", "Star", "Heart", "Zap", "Crown", "Gem",
  "Shirt", "Car", "Home", "Music", "Book", "Palette", "Utensils",
  "Dumbbell", "Plane", "Trophy", "Sparkles", "Flame", "Package",
];

interface Category {
  id: string;
  name: string;
  sort_order: number;
  icon: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

const IconPreview = ({ name }: { name: string }) => {
  if (!name || !(name in icons)) return null;
  const LucideIcon = icons[name as keyof typeof icons];
  return <LucideIcon className="h-4 w-4" />;
};

const IconSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <Select value={value || "_none"} onValueChange={(v) => onChange(v === "_none" ? "" : v)}>
    <SelectTrigger className="h-8 w-[140px] text-xs">
      <SelectValue>
        <span className="flex items-center gap-1.5">
          <IconPreview name={value} />
          {value || "Pilih ikon"}
        </span>
      </SelectValue>
    </SelectTrigger>
    <SelectContent className="max-h-[240px]">
      <SelectItem value="_none">Tanpa ikon</SelectItem>
      {ICON_OPTIONS.filter(Boolean).map((name) => (
        <SelectItem key={name} value={name}>
          <span className="flex items-center gap-2">
            <IconPreview name={name} /> {name}
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

interface SortableCategoryProps {
  cat: Category;
  index: number;
  children: (handle: React.ReactNode) => React.ReactNode;
}

const SortableCategory = ({ cat, index, children }: SortableCategoryProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const handle = (
    <div className="flex items-center gap-1 shrink-0">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="font-mono text-xs text-muted-foreground w-5 text-center">{index + 1}</span>
    </div>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
};

interface SortableSubProps {
  sub: Subcategory;
  index: number;
  children: (handle: React.ReactNode) => React.ReactNode;
}

const SortableSub = ({ sub, index, children }: SortableSubProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const handle = (
    <div className="flex items-center gap-1 shrink-0">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-0.5 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag"
        type="button"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="font-mono text-[10px] text-muted-foreground/60 w-4 text-center">{index + 1}</span>
    </div>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(handle)}
    </div>
  );
};

const AdminCategories = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatIcon, setEditingCatIcon] = useState("");
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");
  const [reordering, setReordering] = useState(false);

  const catCtx = useSortableList();
  const subCtx = useSortableList();

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").order("sort_order");
    if (data) setCategories(data);
  };

  const fetchSubcategories = async (catId: string) => {
    const { data } = await supabase.from("subcategories").select("*").eq("category_id", catId).order("sort_order");
    if (data) setSubcategories(data);
  };

  useEffect(() => { fetchCategories(); }, []);

  const toggleExpand = (id: string) => {
    if (expandedCat === id) { setExpandedCat(null); setSubcategories([]); }
    else { setExpandedCat(id); fetchSubcategories(id); }
  };

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) + 1 : 1;
    const { error } = await supabase.from("categories").insert({ name: newCatName.trim(), sort_order: nextOrder, icon: newCatIcon });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Kategori ditambahkan!" }); setNewCatName(""); setNewCatIcon(""); fetchCategories(); }
  };

  const updateCategory = async (id: string) => {
    if (!editingCatName.trim()) return;
    const { error } = await supabase.from("categories").update({ name: editingCatName.trim(), icon: editingCatIcon }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Kategori diperbarui!" }); setEditingCat(null); fetchCategories(); }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Kategori dihapus" }); if (expandedCat === id) { setExpandedCat(null); setSubcategories([]); } fetchCategories(); }
  };

  const createSubcategory = async (catId: string) => {
    if (!newSubName.trim()) return;
    const nextOrder = subcategories.length > 0 ? Math.max(...subcategories.map(s => s.sort_order || 0)) + 1 : 1;
    const { error } = await supabase.from("subcategories").insert({ category_id: catId, name: newSubName.trim(), sort_order: nextOrder });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Subkategori ditambahkan!" }); setNewSubName(""); fetchSubcategories(catId); }
  };

  const updateSubcategory = async (id: string) => {
    if (!editingSubName.trim()) return;
    const { error } = await supabase.from("subcategories").update({ name: editingSubName.trim() }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Subkategori diperbarui!" }); setEditingSub(null); if (expandedCat) fetchSubcategories(expandedCat); }
  };

  const deleteSubcategory = async (id: string) => {
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Subkategori dihapus" }); if (expandedCat) fetchSubcategories(expandedCat); }
  };

  const persistCatOrder = async (ordered: Category[]) => {
    const updates = ordered.map((c, i) => supabase.from("categories").update({ sort_order: i + 1 }).eq("id", c.id));
    await Promise.all(updates);
  };

  const persistSubOrder = async (ordered: Subcategory[]) => {
    const updates = ordered.map((s, i) => supabase.from("subcategories").update({ sort_order: i + 1 }).eq("id", s.id));
    await Promise.all(updates);
  };

  const handleCatDragEnd = async (event: DragEndEvent) => {
    const reordered = catCtx.reorder(categories, event);
    if (!reordered) return;
    setCategories(reordered);
    setReordering(true);
    try {
      await persistCatOrder(reordered);
      toast({ title: "Urutan kategori diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
      fetchCategories();
    } finally {
      setReordering(false);
    }
  };

  const handleSubDragEnd = async (event: DragEndEvent) => {
    const reordered = subCtx.reorder(subcategories, event);
    if (!reordered) return;
    setSubcategories(reordered);
    setReordering(true);
    try {
      await persistSubOrder(reordered);
      toast({ title: "Urutan subkategori diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
      if (expandedCat) fetchSubcategories(expandedCat);
    } finally {
      setReordering(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider">Category Management</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Drag <GripVertical className="inline h-3 w-3" /> untuk mengubah urutan. Penomoran otomatis.
          </p>
        </div>
        {reordering && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <Card className="mb-6 border-border/50">
        <CardHeader><CardTitle className="text-sm">Tambah Kategori Baru</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Nama kategori (misal: Gadget)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createCategory()} />
            <IconSelect value={newCatIcon} onChange={setNewCatIcon} />
            <Button onClick={createCategory} className="gap-1.5 shrink-0"><Plus className="h-4 w-4" /> Tambah</Button>
          </div>
        </CardContent>
      </Card>

      <DndContext sensors={catCtx.sensors} collisionDetection={catCtx.collisionDetection} onDragEnd={handleCatDragEnd}>
        <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {categories.map((cat, catIdx) => (
              <SortableCategory key={cat.id} cat={cat} index={catIdx}>
                {(handle) => (
                  <Card className="border-border/50">
                    <div className="flex items-center gap-1 p-3">
                      {handle}

                      <button onClick={() => toggleExpand(cat.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                        {expandedCat === cat.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      {editingCat === cat.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <Input value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && updateCategory(cat.id)} className="h-8 text-sm" />
                          <IconSelect value={editingCatIcon} onChange={setEditingCatIcon} />
                          <Button size="sm" variant="ghost" onClick={() => updateCategory(cat.id)}><Check className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex flex-1 items-center gap-2 text-sm font-medium">
                            <IconPreview name={cat.icon} />
                            {cat.name}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingCat(cat.id); setEditingCatName(cat.name); setEditingCatIcon(cat.icon); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteCategory(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>

                    {expandedCat === cat.id && (
                      <CardContent className="border-t border-border/50 pt-3 pb-3">
                        <div className="flex gap-2 mb-3">
                          <Input placeholder="Nama subkategori (misal: Laptop)" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createSubcategory(cat.id)} className="h-8 text-sm" />
                          <Button size="sm" variant="outline" onClick={() => createSubcategory(cat.id)} className="gap-1 shrink-0"><Plus className="h-3 w-3" /> Tambah</Button>
                        </div>
                        <DndContext sensors={subCtx.sensors} collisionDetection={subCtx.collisionDetection} onDragEnd={handleSubDragEnd}>
                          <SortableContext items={subcategories.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-1">
                              {subcategories.map((sub, subIdx) => (
                                <SortableSub key={sub.id} sub={sub} index={subIdx}>
                                  {(subHandle) => (
                                    <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/50">
                                      {subHandle}
                                      {editingSub === sub.id ? (
                                        <div className="flex flex-1 items-center gap-2">
                                          <Input value={editingSubName} onChange={(e) => setEditingSubName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && updateSubcategory(sub.id)} className="h-7 text-xs" />
                                          <Button size="sm" variant="ghost" onClick={() => updateSubcategory(sub.id)}><Check className="h-3 w-3" /></Button>
                                          <Button size="sm" variant="ghost" onClick={() => setEditingSub(null)}><X className="h-3 w-3" /></Button>
                                        </div>
                                      ) : (
                                        <>
                                          <span className="flex-1 text-xs text-muted-foreground">↳ {sub.name}</span>
                                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingSub(sub.id); setEditingSubName(sub.name); }}><Edit2 className="h-3 w-3" /></Button>
                                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => deleteSubcategory(sub.id)}><Trash2 className="h-3 w-3" /></Button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </SortableSub>
                              ))}
                              {subcategories.length === 0 && <p className="text-xs text-muted-foreground pl-3">Belum ada subkategori.</p>}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </CardContent>
                    )}
                  </Card>
                )}
              </SortableCategory>
            ))}
            {categories.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Belum ada kategori. Tambahkan di atas.</p>}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default AdminCategories;
