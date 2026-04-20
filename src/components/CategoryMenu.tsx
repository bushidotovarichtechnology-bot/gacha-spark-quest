import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, icons } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  sort_order: number;
  icon: string;
  image_url: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  image_url: string;
}

interface CategoryMenuProps {
  selectedSubcategoryId: string | null;
  onSelect: (subcategoryId: string | null) => void;
}

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  if (!name || !(name in icons)) return null;
  const LucideIcon = icons[name as keyof typeof icons];
  return <LucideIcon className={className} />;
};

const CategoryMenu = ({ selectedSubcategoryId, onSelect }: CategoryMenuProps) => {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subcategories").select("*").order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  if (categories.length === 0) return null;

  const getSubcats = (catId: string) => subcategories.filter((s) => s.category_id === catId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
          selectedSubcategoryId === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        )}
      >
        Semua
      </button>

      {categories.map((cat) => {
        const subs = getSubcats(cat.id);
        const isExpanded = expandedCat === cat.id;
        const isActive = subs.some((s) => s.id === selectedSubcategoryId);

        return (
          <div key={cat.id} className="relative">
            <button
              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
              className={cn(
                "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.image_url ? (
                <img src={cat.image_url} alt={cat.name} className="h-6 w-6 rounded-full object-cover ring-1 ring-border/40" />
              ) : (
                <DynamicIcon name={cat.icon} className="ml-2 h-3.5 w-3.5" />
              )}
              <span>{cat.name}</span>
              {subs.length > 0 && <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />}
            </button>

            {isExpanded && subs.length > 0 && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-border/50 bg-card/95 p-1 shadow-lg backdrop-blur-xl">
                {subs.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => { onSelect(sub.id); setExpandedCat(null); }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
                      selectedSubcategoryId === sub.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {sub.image_url && (
                      <img src={sub.image_url} alt={sub.name} className="h-6 w-6 shrink-0 rounded object-cover ring-1 ring-border/40" />
                    )}
                    <span>{sub.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CategoryMenu;
