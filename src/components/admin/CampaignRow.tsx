import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, ChevronDown, ChevronUp, Image, Pencil, Check, X } from "lucide-react";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useImageCrop } from "@/hooks/use-image-crop";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;

interface SubcategoryOption {
  id: string;
  name: string;
  category_name: string;
}

interface CampaignRowProps {
  campaign: Campaign;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: string, updates: Partial<Campaign>) => Promise<void>;
  onDelete: (id: string) => void;
  onUploadImage: (id: string, file: File) => void;
  subcategoryOptions?: SubcategoryOption[];
  children?: React.ReactNode;
}

export function CampaignRow({ campaign: c, isExpanded, onToggleExpand, onUpdate, onDelete, onUploadImage, subcategoryOptions = [], children }: CampaignRowProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [description, setDescription] = useState(c.description);
  const [price, setPrice] = useState(c.price);
  const [subcategoryId, setSubcategoryId] = useState(c.subcategory_id || "");

  const startEdit = () => {
    setTitle(c.title);
    setDescription(c.description);
    setPrice(c.price);
    setSubcategoryId(c.subcategory_id || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    await onUpdate(c.id, { title, description, price, subcategory_id: subcategoryId || null } as any);
    setEditing(false);
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {c.image_url && <img src={c.image_url} alt={c.title} className="h-10 w-10 rounded-lg object-cover" />}
          {editing ? (
            <div className="flex-1 space-y-1.5 min-w-0">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="h-7 text-sm" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="h-7 text-xs" />
              <div className="flex items-center gap-1.5">
                <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="h-7 text-xs w-20" placeholder="Koin" />
                <Select value={subcategoryId || "none"} onValueChange={(v) => setSubcategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-7 text-xs w-40">
                    <SelectValue placeholder="Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa kategori</SelectItem>
                    {subcategoryOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.category_name} → {opt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="ghost" onClick={saveEdit} className="h-7 w-7 p-0 text-primary"><Check className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 w-7 p-0 text-muted-foreground"><X className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ) : (
            <div className="min-w-0 cursor-pointer" onClick={startEdit} title="Click to edit">
              <p className="font-semibold text-sm truncate flex items-center gap-1">
                {c.title} <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </p>
              <p className="text-xs text-muted-foreground truncate">{c.description || "No description"}</p>
              <p className="text-xs text-muted-foreground">ID: {c.id} • {c.price} koin</p>
            </div>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Active</span>
              <Switch checked={c.is_active} onCheckedChange={(v) => onUpdate(c.id, { is_active: v })} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Hot</span>
              <Switch checked={c.is_hot} onCheckedChange={(v) => onUpdate(c.id, { is_hot: v })} />
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={startEdit} title="Edit">
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
            <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md hover:bg-accent" title="Upload image">
              <Image className="h-4 w-4 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(c.id, file);
              }} />
            </label>
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <ConfirmDelete title="Hapus Campaign?" description={`Campaign "${c.title}" akan dihapus beserta semua tier dan hadiahnya. Tindakan ini tidak dapat dibatalkan.`} onConfirm={() => onDelete(c.id)}>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </ConfirmDelete>
          </div>
        )}
      </div>
      {children}
    </>
  );
}
