import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CampaignCard from "@/components/CampaignCard";
import { Sparkles, Shield, Clock, Trophy, Crown } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import CategoryMenu from "@/components/CategoryMenu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import defaultAvatar from "@/assets/default-avatar.webp";

import campaignBlindbox from "@/assets/campaign-blindbox.jpg";
import campaignDesksetup from "@/assets/campaign-desksetup.jpg";
import campaignWallet from "@/assets/campaign-wallet.jpg";
import campaignFigurine from "@/assets/campaign-figurine.jpg";
import campaignGaming from "@/assets/campaign-gaming.jpg";

// Fallback image map for campaigns using local assets
const imageMap: Record<string, string> = {
  "/assets/campaign-blindbox.jpg": campaignBlindbox,
  "/assets/campaign-desksetup.jpg": campaignDesksetup,
  "/assets/campaign-wallet.jpg": campaignWallet,
  "/assets/campaign-figurine.jpg": campaignFigurine,
  "/assets/campaign-gaming.jpg": campaignGaming,
};

function resolveImage(url: string) {
  return imageMap[url] || url || campaignBlindbox;
}

interface GrandPrizeWinner {
  draw_id: string;
  display_name: string;
  avatar_url: string;
  prize_name: string;
  campaign_title: string;
  won_at: string;
}

const GrandPrizePreview = () => {
  const [winners, setWinners] = useState<GrandPrizeWinner[]>([]);

  useEffect(() => {
    supabase.rpc("get_grand_prize_winners", { lim: 5 }).then(({ data }) => {
      if (data) setWinners(data as unknown as GrandPrizeWinner[]);
    });
  }, []);

  if (winners.length === 0) return null;

  return (
    <section className="border-t border-border/50 py-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-6 text-center"
        >
          <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Hall of Fame
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Pemenang Grand Prize
          </h2>
        </motion.div>

        <div className="mx-auto max-w-lg space-y-2">
          {winners.map((w, i) => (
            <motion.div
              key={w.draw_id}
              initial={{ opacity: 0, x: -15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                i === 0 ? "border-accent/40 bg-accent/5" : "border-border/50 bg-card"
              }`}
            >
              <span className="text-lg font-black w-7 text-center">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <Avatar className="h-9 w-9 border-2 border-accent/20">
                <AvatarImage src={w.avatar_url || defaultAvatar} />
                <AvatarFallback><img src={defaultAvatar} alt="" className="h-full w-full object-cover" /></AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{w.display_name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-accent">
                  <Crown className="h-3 w-3 shrink-0" /> {w.prize_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {w.campaign_title} · {formatDistanceToNow(new Date(w.won_at), { addSuffix: true, locale: idLocale })}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/30 px-4 py-2 text-sm font-semibold text-accent transition-all hover:bg-accent/20"
          >
            <Trophy className="h-4 w-4" />
            Lihat Semua Pemenang
          </Link>
        </div>
      </div>
    </section>
  );
};

const Index = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Realtime: auto-refetch when campaign_tiers changes (e.g. another user draws)
  useEffect(() => {
    const channel = supabase
      .channel("home-campaign-tiers")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaign_tiers" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", selectedSubcategoryId],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("*, campaign_tiers(id, remaining, total, label)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (selectedSubcategoryId) {
        query = query.eq("subcategory_id", selectedSubcategoryId);
      }

      const { data: camps, error } = await query;
      if (error) throw error;

      // Fetch actual prize counts from tier_prizes
      const tierIds = (camps || []).flatMap((c) =>
        (c.campaign_tiers || []).map((t: { id: string }) => t.id)
      );

      let prizeCounts: Record<string, { remaining: number; total: number }> = {};
      if (tierIds.length > 0) {
        const { data: prizes } = await supabase
          .from("tier_prizes")
          .select("tier_id, remaining, total")
          .in("tier_id", tierIds);

        (prizes || []).forEach((p) => {
          if (!prizeCounts[p.tier_id]) prizeCounts[p.tier_id] = { remaining: 0, total: 0 };
          prizeCounts[p.tier_id].remaining += p.remaining;
          prizeCounts[p.tier_id].total += p.total;
        });
      }

      return (camps || []).map((c) => {
        const tiers = c.campaign_tiers || [];
        let remaining = 0;
        let total = 0;
        tiers.forEach((t: { id: string }) => {
          const pc = prizeCounts[t.id];
          if (pc) {
            remaining += pc.remaining;
            total += pc.total;
          }
        });
        return {
          id: c.id,
          title: c.title,
          image: resolveImage(c.image_url),
          price: c.price,
          remaining,
          total,
          hot: c.is_hot,
        };
      });
    },
  });

  const features = [
    { icon: Shield, title: t("verifiedFair"), desc: t("verifiedFairDesc") },
    { icon: Clock, title: t("limitedPools"), desc: t("limitedPoolsDesc") },
    { icon: Trophy, title: t("pitySystem"), desc: t("pitySystemDesc") },
    { icon: Sparkles, title: t("lastOnePrize"), desc: t("lastOnePrizeDesc") },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />

      <section className="border-y border-border/50 bg-secondary/30">
        <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="font-display text-xs font-semibold tracking-wide text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="featured-campaigns" className="scroll-mt-20 py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {t("liveNow")}
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("featuredCampaigns")}
            </h2>
          </motion.div>

          <div className="mb-8">
            <CategoryMenu selectedSubcategoryId={selectedSubcategoryId} onSelect={setSelectedSubcategoryId} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} {...c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Grand Prize Leaderboard Preview */}
      <GrandPrizePreview />

      <footer className="border-t border-border/50 py-10">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-center">
          <span className="font-display text-sm font-bold tracking-wider text-foreground">
            BUSHIDO<span className="text-accent"> GACHA</span>
          </span>
          <p className="text-xs text-muted-foreground">
            {t("companyName")}
          </p>
          <div className="flex items-center gap-4">
            <Link to="/about" className="text-xs text-muted-foreground underline transition-colors hover:text-foreground">
              {t("aboutUs")}
            </Link>
            <Link to="/contact" className="text-xs text-muted-foreground underline transition-colors hover:text-foreground">
              {t("contactUs")}
            </Link>
          </div>
          <p className="font-display text-xs tracking-wider text-muted-foreground">
            {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
