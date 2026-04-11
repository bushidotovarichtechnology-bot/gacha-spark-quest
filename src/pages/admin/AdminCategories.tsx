import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

const AdminCategories = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState("");

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
    const { error } = await supabase.from("categories").insert({ name: newCatName.trim(), sort_order: categories.length });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Kategori ditambahkan!" }); setNewCatName(""); fetchCategories(); }
  };

  const updateCategory = async (id: string) => {
    if (!editingCatName.trim()) return;
    const { error } = await supabase.from("categories").update({ name: editingCatName.trim() }).eq("id", id);
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
    const { error } = await supabase.from("subcategories").insert({ category_id: catId, name: newSubName.trim(), sort_order: subcategories.length });
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

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold tracking-wider">Category Management</h1>

      <Card className="mb-6 border-border/50">
        <CardHeader><CardTitle className="text-sm">Tambah Kategori Baru</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Nama kategori (misal: Gadget)" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createCategory()} />
            <Button onClick={createCategory} className="gap-1.5 shrink-0"><Plus className="h-4 w-4" /> Tambah</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {categories.map((cat) => (
          <Card key={cat.id} className="border-border/50">
            <div className="flex items-center gap-2 p-3">
              <button onClick={() => toggleExpand(cat.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                {expandedCat === cat.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {editingCat === cat.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <Input value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && updateCategory(cat.id)} className="h-8 text-sm" />
                  <Button size="sm" variant="ghost" onClick={() => updateCategory(cat.id)}><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{cat.name}</span>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingCat(cat.id); setEditingCatName(cat.name); }}><Edit2 className="h-3.5 w-3.5" /></Button>
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
                <div className="space-y-1">
                  {subcategories.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 rounded-md px-3 py-1.5 hover:bg-secondary/50">
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
                  ))}
                  {subcategories.length === 0 && <p className="text-xs text-muted-foreground pl-3">Belum ada subkategori.</p>}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        {categories.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Belum ada kategori. Tambahkan di atas.</p>}
      </div>
    </div>
  );
};

export default AdminCategories;
