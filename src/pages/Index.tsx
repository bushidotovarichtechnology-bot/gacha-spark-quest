import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CampaignCard from "@/components/CampaignCard";
import { Sparkles, Shield, Clock, Trophy } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { supabase } from "@/integrations/supabase/client";

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

const Index = () => {
  const { t } = useI18n();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data: camps, error } = await supabase
        .from("campaigns")
        .select("*, campaign_tiers(remaining, total)")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (camps || []).map((c) => {
        const tiers = c.campaign_tiers || [];
        const remaining = tiers.reduce((s: number, t: { remaining: number }) => s + t.remaining, 0);
        const total = tiers.reduce((s: number, t: { total: number }) => s + t.total, 0);
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

      <section className="py-16">
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

      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-xs tracking-wider text-muted-foreground">
            {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
