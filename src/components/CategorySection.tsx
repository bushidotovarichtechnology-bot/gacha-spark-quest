import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, icons } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabaseImg } from "@/lib/imageTransform";
import CampaignCard from "@/components/CampaignCard";

import campaignBlindbox from "@/assets/campaign-blindbox.jpg";
import campaignDesksetup from "@/assets/campaign-desksetup.jpg";
import campaignWallet from "@/assets/campaign-wallet.jpg";
import campaignFigurine from "@/assets/campaign-figurine.jpg";
import campaignGaming from "@/assets/campaign-gaming.jpg";

const imageMap: Record<string, string> = {
  "/assets/campaign-blindbox.jpg": campaignBlindbox,
  "/assets/campaign-desksetup.jpg": campaignDesksetup,
  "/assets/campaign-wallet.jpg": campaignWallet,
  "/assets/campaign-figurine.jpg": campaignFigurine,
  "/assets/campaign-gaming.jpg": campaignGaming,
};
const resolveImage = (url: string) => imageMap[url] || url || campaignBlindbox;

interface Subcategory {
  id: string;
  name: string;
  image_url: string;
  sort_order: number;
}

interface CategorySectionProps {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryImage: string;
  description?: string;
}

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  if (!name || !(name in icons)) return null;
  const LucideIcon = icons[name as keyof typeof icons];
  return <LucideIcon className={className} />;
};

const CategorySection = ({ categoryId, categoryName, categoryIcon, categoryImage, description }: CategorySectionProps) => {
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["subcategories", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, name, image_url, sort_order")
        .eq("category_id", categoryId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const subIds = useMemo(() => subcategories.map((s) => s.id), [subcategories]);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns-by-category", categoryId, subIds.join(",")],
    enabled: subIds.length > 0,
    queryFn: async () => {
      const { data: camps, error } = await supabase
        .from("campaigns")
        .select("id, slug, title, image_url, price, is_hot, subcategory_id, sort_order, created_at")
        .eq("is_active", true)
        .in("subcategory_id", subIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;

      const ids = (camps || []).map((c) => c.id);
      const stockByCampaign: Record<string, { remaining: number; total: number; isSoldOut: boolean }> = {};
      if (ids.length > 0) {
        const { data: summaries } = await supabase.rpc("get_campaign_stock_summary" as any, { _campaign_ids: ids });
        (summaries || []).forEach((s: any) => {
          const acc = stockByCampaign[s.campaign_id] ||
            (stockByCampaign[s.campaign_id] = { remaining: 0, total: 0, isSoldOut: true });
          const r = parseInt(String(s.remaining_bucket ?? "0"), 10);
          acc.remaining += Number.isFinite(r) ? r : 0;
          acc.total += s.total_bucket || 0;
          if (!s.is_sold_out) acc.isSoldOut = false;
        });
      }

      return (camps || []).map((c) => {
        const s = stockByCampaign[c.id] || { remaining: 0, total: 0, isSoldOut: true };
        return {
          id: c.id,
          slug: (c as any).slug as string | undefined,
          title: c.title,
          image: resolveImage(c.image_url),
          price: c.price,
          remaining: s.remaining,
          total: s.total,
          hot: c.is_hot,
          subcategory_id: c.subcategory_id as string | null,
        };
      });
    },
  });

  const filtered = selectedSub ? campaigns.filter((c) => c.subcategory_id === selectedSub) : campaigns;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: (dir === "left" ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!isLoading && campaigns.length === 0) return null;

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        {/* Header card */}
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/20">
              {categoryImage ? (
                <img src={supabaseImg(categoryImage, 80)} alt={categoryName} className="h-full w-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <DynamicIcon name={categoryIcon} className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-bold text-foreground sm:text-lg">{categoryName}</h2>
              {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <button
              onClick={() => scroll("left")}
              aria-label="Scroll kiri"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              aria-label="Scroll kanan"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Subcategory chips */}
        {subcategories.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedSub(null)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                selectedSub === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              Semua
            </button>
            {subcategories.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSub(s.id === selectedSub ? null : s.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  selectedSub === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Horizontal scroll on mobile, grid on larger */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Belum ada campaign untuk subkategori ini.</p>
        ) : (
          <div
            ref={scrollRef}
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin scrollbar-thumb-border md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-5"
          >
            {filtered.map((c) => (
              <div
                key={c.id}
                className="w-[44vw] max-w-[200px] shrink-0 snap-start sm:w-[32vw] md:w-auto md:max-w-none"
              >
                <CampaignCard {...c} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CategorySection;
