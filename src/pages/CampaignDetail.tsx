import { useState, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, Crown, Star, Gift, Award, Ticket, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import PrizeRevealModal from "@/components/PrizeRevealModal";
import { useGacha } from "@/context/GachaContext";
import { toast } from "sonner";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import campaignBlindbox from "@/assets/campaign-blindbox.jpg";
import dinoUnboxAsset from "@/assets/dino-unbox.mp4.asset.json";
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

function resolveImage(url: string) {
  return imageMap[url] || url || campaignBlindbox;
}

const iconMap: Record<string, typeof Crown> = { S: Crown, A: Star, B: Gift, C: Award };
const colorMap: Record<string, string> = {
  S: "text-accent",
  A: "text-neon-purple",
  B: "text-neon-pink",
  C: "text-muted-foreground",
};

const tierBgMap: Record<string, string> = {
  "text-accent": "bg-accent/10 border-accent/30",
  "text-neon-purple": "bg-primary/10 border-primary/30",
  "text-neon-pink": "bg-neon-pink/10 border-neon-pink/30",
  "text-muted-foreground": "bg-secondary border-border",
};

const tierGlowMap: Record<string, string> = {
  "text-accent": "box-glow-gold",
  "text-neon-purple": "box-glow-purple",
  "text-neon-pink": "",
  "text-muted-foreground": "",
};

const coinValues: Record<string, number> = { S: 1000, A: 200, B: 80, C: 15 };

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const campaignId = id || "";
  const { addPrize, totalCoins, spendCoins, drawsSinceTierA } = useGacha();
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, campaign_tiers(*, tier_prizes(*))")
        .eq("id", campaignId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  const { data: pitySettings } = useQuery({
    queryKey: ["pity_settings", campaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pity_settings")
        .select("*")
        .eq("campaign_id", campaignId)
        .maybeSingle();
      return data as { threshold: number; guaranteed_tier: string; is_enabled: boolean } | null;
    },
    enabled: !!campaignId,
  });

  // Realtime: auto-refetch when campaign_tiers for this campaign changes
  useEffect(() => {
    const channel = supabase
      .channel(`detail-campaign-tiers-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaign_tiers", filter: `campaign_id=eq.${campaignId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, queryClient]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [drawnPrizes, setDrawnPrizes] = useState<{ tier: string; color: string; prize: string; isPityReward?: boolean }[]>([]);
  const [drawCount, setDrawCount] = useState(0);
  const [hasPityReward, setHasPityReward] = useState(false);

  if (isLoading || !campaign) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </div>
    );
  }

  const image = resolveImage(campaign.image_url);
  const tiers = [...(campaign.campaign_tiers || [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((tier) => ({
      ...tier,
      color: colorMap[tier.label] || "text-muted-foreground",
      icon: iconMap[tier.label] || Award,
      prizes: (tier.tier_prizes || []).map((p: { name: string }) => p.name),
    }));

  const totalRemaining = tiers.reduce((s, t) => s + t.remaining, 0);
  const totalTickets = tiers.reduce((s, t) => s + t.total, 0);

  const handleDraw = (count: number) => {
    if (isDrawing || totalRemaining <= 0) return;
    const actualCount = Math.min(count, totalRemaining);
    const totalCost = actualCount * campaign.price;

    if (totalCoins < totalCost) {
      toast.error(t("insufficientCoins"));
      return;
    }

    if (!spendCoins(totalCost)) {
      toast.error(t("insufficientCoins"));
      return;
    }

    setDrawCount(actualCount);
    setIsDrawing(true);

    setTimeout(async () => {
      const results: { tier: string; color: string; prize: string; isPityReward?: boolean }[] = [];
      let batchHasPity = false;
      const remainingCopy: Record<string, number> = {};
      tiers.forEach((t) => { remainingCopy[t.id] = t.remaining; });

      for (let i = 0; i < actualCount; i++) {
        // Track pity across draws in this batch
        let localPityCount = drawsSinceTierA;

        const activeTiers = tiers
          .map((t) => ({ ...t, remaining: Math.max(remainingCopy[t.id] ?? 0, 0) }))
          .filter((t) => t.remaining > 0);

        if (activeTiers.length === 0) break;

        let selectedTier;

        // Pity system: force tier A or S when threshold reached
        const isPityDraw = localPityCount >= pityThreshold - 1;
        const rareTiers = activeTiers.filter((t) => t.label === "S" || t.label === "A");

        if (isPityDraw && rareTiers.length > 0) {
          batchHasPity = true;
          // Force a rare tier
          const totalRareWeight = rareTiers.reduce((a, b) => a + Number(b.probability_weight), 0);
          let r = Math.random() * totalRareWeight;
          selectedTier = rareTiers[rareTiers.length - 1];
          for (const tier of rareTiers) {
            r -= Number(tier.probability_weight);
            if (r <= 0) { selectedTier = tier; break; }
          }
        } else {
          // Normal weighted random
          const totalWeight = activeTiers.reduce((a, b) => a + Number(b.probability_weight), 0);
          let r = Math.random() * totalWeight;
          selectedTier = activeTiers[activeTiers.length - 1];
          for (const tier of activeTiers) {
            r -= Number(tier.probability_weight);
            if (r <= 0) { selectedTier = tier; break; }
          }
        }

        // Update local pity counter
        if (selectedTier.label === "S" || selectedTier.label === "A") {
          localPityCount = 0;
        } else {
          localPityCount++;
        }

        const prize = selectedTier.prizes.length > 0
          ? selectedTier.prizes[Math.floor(Math.random() * selectedTier.prizes.length)]
          : selectedTier.name;

        remainingCopy[selectedTier.id] = (remainingCopy[selectedTier.id] ?? 0) - 1;

        addPrize({
          prize,
          tier: selectedTier.label as "S" | "A" | "B" | "C",
          campaign: campaign.title,
          campaignId: campaign.id,
          image,
          coinValue: coinValues[selectedTier.label] || 15,
        });

        results.push({ tier: selectedTier.label, color: selectedTier.color, prize, isPityReward: isPityDraw && rareTiers.length > 0 });
      }

      // Update remaining counts in database & record draws
      const tierUpdates = Object.entries(remainingCopy).map(([tierId, rem]) =>
        supabase.from("campaign_tiers").update({ remaining: rem }).eq("id", tierId)
      );

      const drawInserts = user ? results.map((r) =>
        supabase.from("draws").insert({
          user_id: user.id,
          campaign_id: campaign.id,
          tier_label: r.tier,
          prize_name: r.prize,
          coin_value: coinValues[r.tier] || 15,
        })
      ) : [];

      await Promise.all([...tierUpdates, ...drawInserts]);

      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });

      setDrawnPrizes(results);
      setHasPityReward(batchHasPity);
      setIsDrawing(false);
      setShowResult(true);
    }, 2400);
  };

  return (
    <div className="min-h-screen pb-28">
      <Navbar />

      {/* Hero banner */}
      <div className="relative h-56 overflow-hidden pt-16 sm:h-72">
        <img src={image} alt={campaign.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="container mx-auto">
            <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> {t("backToCampaigns")}
            </Link>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {campaign.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-6">
        <p className="mb-6 max-w-xl text-sm text-muted-foreground">{campaign.description}</p>

        <div className="mb-8 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
            <Ticket className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">${campaign.price}{t("ticket")}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              <span className="font-semibold">{totalRemaining}</span>
              <span className="text-muted-foreground">/{totalTickets} {t("left")}</span>
            </span>
          </div>
        </div>

        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          {t("prizePool")}
        </h2>
        <div className="space-y-3">
          {tiers.map((tier, i) => {
            const pct = tier.total > 0 ? (tier.remaining / tier.total) * 100 : 0;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`overflow-hidden rounded-xl border p-4 ${tierBgMap[tier.color]} ${tierGlowMap[tier.color]}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/50 font-display text-lg font-black ${tier.color}`}>
                    {tier.label}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className={`font-display text-sm font-semibold ${tier.color}`}>
                        {tier.name}
                      </h3>
                      <span className={`text-xs font-semibold ${tier.remaining <= 2 ? "text-destructive animate-pulse-glow" : "text-muted-foreground"}`}>
                        {tier.remaining}/{tier.total} {t("left")}
                      </span>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {tier.prizes.map((p) => (
                        <span key={p} className="rounded-md bg-background/40 px-2 py-0.5 text-xs text-foreground/80">
                          {p}
                        </span>
                      ))}
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-background/30">
                      <motion.div
                        className={`h-full rounded-full ${tier.color === "text-accent" ? "bg-accent" : tier.color === "text-neon-purple" ? "bg-primary" : tier.color === "text-neon-pink" ? "bg-neon-pink" : "bg-muted-foreground"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: i * 0.15 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-4 box-glow-gold"
        >
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 shrink-0 text-accent" />
            <div>
              <h3 className="font-display text-sm font-bold text-accent">{t("lastOnePrizeTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("lastOnePrizeDetail")}</p>
            </div>
          </div>
        </motion.div>

        {/* Pity System Indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className={`mt-4 rounded-xl border p-4 ${
            drawsSinceTierA >= pityThreshold - 2
              ? "border-primary/60 bg-primary/10 box-glow-purple"
              : "border-border bg-secondary/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">{t("pitySystem")}</h3>
            </div>
            <span className={`text-xs font-bold ${drawsSinceTierA >= pityThreshold - 2 ? "text-primary animate-pulse" : "text-muted-foreground"}`}>
              {drawsSinceTierA}/{pityThreshold}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background/50 mb-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((drawsSinceTierA / pityThreshold) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {drawsSinceTierA >= pityThreshold
              ? t("pityReady")
              : `${pityThreshold - drawsSinceTierA} ${t("moreDrawsForTierA")}`}
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-lg"
          >
            <div className="flex flex-col items-center gap-4">
              {/* Dino unboxing video */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="relative overflow-hidden rounded-2xl border-2 border-primary/50 box-glow-purple"
                style={{ width: 280, height: 280 }}
              >
                <video
                  src={dinoUnboxAsset.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              </motion.div>

              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="font-display text-sm tracking-widest text-muted-foreground"
              >
                {drawCount > 1 ? t("drawingMulti", { count: drawCount }) : t("drawing")}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PrizeRevealModal
        open={showResult}
        onClose={() => setShowResult(false)}
        prizes={drawnPrizes}
        drawCount={drawCount}
        hasPityReward={hasPityReward}
      />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          {totalRemaining <= 0 ? (
            <div className="flex w-full items-center justify-center gap-2 py-1">
              <span className="font-display text-lg font-bold tracking-wider text-destructive">{t("soldOut")}</span>
              <span className="text-sm text-muted-foreground">— {t("soldOutDesc")}</span>
            </div>
          ) : (
            <>
              <div className="mr-auto flex flex-col">
                <div className="text-sm">
                  <span className="text-muted-foreground">{t("price")}: </span>
                  <span className="font-bold text-accent">{campaign.price} coins</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Coins className="h-3 w-3 text-accent" />
                  <span>{totalCoins.toLocaleString()}</span>
                </div>
              </div>
              <Button
                variant="neon"
                onClick={() => handleDraw(1)}
                disabled={isDrawing || totalRemaining <= 0}
                className="gap-1.5 px-5"
              >
                <Zap className="h-4 w-4" /> {t("draw1x")}
              </Button>
              <Button
                variant="gold"
                onClick={() => handleDraw(10)}
                disabled={isDrawing || totalRemaining <= 0}
                className="gap-1.5 px-5"
              >
                <Sparkles className="h-4 w-4" /> {t("draw10x")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
