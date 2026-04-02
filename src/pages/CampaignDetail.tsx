import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, Crown, Star, Gift, Award, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import PrizeRevealModal from "@/components/PrizeRevealModal";
import { useGacha } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";

import campaignBlindbox from "@/assets/campaign-blindbox.jpg";
import campaignDesksetup from "@/assets/campaign-desksetup.jpg";
import campaignWallet from "@/assets/campaign-wallet.jpg";
import campaignFigurine from "@/assets/campaign-figurine.jpg";
import campaignGaming from "@/assets/campaign-gaming.jpg";

const campaignData: Record<string, {
  title: string; image: string; price: number; description: string;
  tiers: { name: string; label: string; color: string; icon: typeof Crown; remaining: number; total: number; prizes: string[] }[];
}> = {
  "mystery-box": {
    title: "Mystery Blind Box", image: campaignBlindbox, price: 5,
    description: "What lies inside the mystery box? Rare collectibles, limited-edition gear, or the legendary Grand Prize await the bold.",
    tiers: [
      { name: "Grand Prize", label: "S", color: "text-accent", icon: Crown, remaining: 1, total: 1, prizes: ["24K Gold-Plated Katana Replica"] },
      { name: "Tier A", label: "A", color: "text-neon-purple", icon: Star, remaining: 2, total: 3, prizes: ["Premium Headphones", "Mechanical Keyboard", "Smart Watch"] },
      { name: "Tier B", label: "B", color: "text-neon-pink", icon: Gift, remaining: 15, total: 20, prizes: ["Wireless Mouse", "LED Strip Lights", "Phone Stand"] },
      { name: "Tier C", label: "C", color: "text-muted-foreground", icon: Award, remaining: 27, total: 76, prizes: ["Sticker Pack", "Keychain", "Pin Badge"] },
    ],
  },
  "desk-setup": {
    title: "Ultimate Desk Setup", image: campaignDesksetup, price: 15,
    description: "Build your dream workstation. Every ticket is a chance at premium peripherals, monitors, and the ultimate ergonomic throne.",
    tiers: [
      { name: "Grand Prize", label: "S", color: "text-accent", icon: Crown, remaining: 1, total: 1, prizes: ["Full Ergonomic Desk Setup"] },
      { name: "Tier A", label: "A", color: "text-neon-purple", icon: Star, remaining: 1, total: 3, prizes: ["4K Monitor", "Standing Desk", "Herman Miller Chair"] },
      { name: "Tier B", label: "B", color: "text-neon-pink", icon: Gift, remaining: 5, total: 16, prizes: ["Webcam", "Desk Mat", "Monitor Arm"] },
      { name: "Tier C", label: "C", color: "text-muted-foreground", icon: Award, remaining: 5, total: 30, prizes: ["Cable Organizer", "Coaster Set", "USB Hub"] },
    ],
  },
  "digital-wallet": {
    title: "Digital Wallets", image: campaignWallet, price: 8,
    description: "Crypto meets fortune. Draw for loaded digital wallets, hardware keys, and the ultimate blockchain treasure.",
    tiers: [
      { name: "Grand Prize", label: "S", color: "text-accent", icon: Crown, remaining: 1, total: 1, prizes: ["$500 Crypto Wallet"] },
      { name: "Tier A", label: "A", color: "text-neon-purple", icon: Star, remaining: 3, total: 5, prizes: ["$100 Gift Card", "Hardware Wallet", "NFT Bundle"] },
      { name: "Tier B", label: "B", color: "text-neon-pink", icon: Gift, remaining: 30, total: 44, prizes: ["$25 Gift Card", "Token Pack", "Digital Art"] },
      { name: "Tier C", label: "C", color: "text-muted-foreground", icon: Award, remaining: 44, total: 150, prizes: ["$5 Credit", "Sticker Pack", "Badge"] },
    ],
  },
  "rare-figurine": {
    title: "Rare Figurine Collection", image: campaignFigurine, price: 10,
    description: "Limited-edition anime figurines await. Will you pull the ultra-rare 1-of-1 chase variant?",
    tiers: [
      { name: "Grand Prize", label: "S", color: "text-accent", icon: Crown, remaining: 1, total: 1, prizes: ["Chase Variant 1/1 Figurine"] },
      { name: "Tier A", label: "A", color: "text-neon-purple", icon: Star, remaining: 1, total: 2, prizes: ["Premium Scale Figure", "Signed Art Print"] },
      { name: "Tier B", label: "B", color: "text-neon-pink", icon: Gift, remaining: 3, total: 7, prizes: ["Standard Figure", "Art Book"] },
      { name: "Tier C", label: "C", color: "text-muted-foreground", icon: Award, remaining: 3, total: 20, prizes: ["Mini Figure", "Poster", "Acrylic Stand"] },
    ],
  },
  "gaming-bundle": {
    title: "Gaming Console Bundle", image: campaignGaming, price: 20,
    description: "The ultimate gamer draw. Consoles, controllers, and the legendary collector's edition are all in the pool.",
    tiers: [
      { name: "Grand Prize", label: "S", color: "text-accent", icon: Crown, remaining: 1, total: 1, prizes: ["PS5 Pro + Game Library"] },
      { name: "Tier A", label: "A", color: "text-neon-purple", icon: Star, remaining: 1, total: 2, prizes: ["Nintendo Switch OLED", "Xbox Controller Elite"] },
      { name: "Tier B", label: "B", color: "text-neon-pink", icon: Gift, remaining: 2, total: 7, prizes: ["Gaming Headset", "Pro Controller"] },
      { name: "Tier C", label: "C", color: "text-muted-foreground", icon: Award, remaining: 1, total: 15, prizes: ["Game Pass 1-Month", "Grip Case", "Thumb Grips"] },
    ],
  },
};

// Fallback
const fallbackCampaign = campaignData["mystery-box"];

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

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const campaign = campaignData[id || ""] || fallbackCampaign;
  const campaignId = id || "mystery-box";
  const totalRemaining = campaign.tiers.reduce((s, t) => s + t.remaining, 0);
  const totalTickets = campaign.tiers.reduce((s, t) => s + t.total, 0);
  const { addPrize } = useGacha();
  const { t } = useI18n();

  const [isDrawing, setIsDrawing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [drawnPrize, setDrawnPrize] = useState<{ tier: string; color: string; prize: string } | null>(null);
  const [drawCount, setDrawCount] = useState(0);

  const handleDraw = useCallback((count: number) => {
    if (isDrawing) return;
    setDrawCount(count);
    setIsDrawing(true);

    setTimeout(() => {
      const weights = campaign.tiers.map(t => t.remaining);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalWeight;
      let selectedTier = campaign.tiers[campaign.tiers.length - 1];
      for (const tier of campaign.tiers) {
        r -= tier.remaining;
        if (r <= 0) { selectedTier = tier; break; }
      }
      const prize = selectedTier.prizes[Math.floor(Math.random() * selectedTier.prizes.length)];
      setDrawnPrize({ tier: selectedTier.label, color: selectedTier.color, prize });

      // Persist to inventory
      addPrize({
        prize,
        tier: selectedTier.label as "S" | "A" | "B" | "C",
        campaign: campaign.title,
        campaignId,
        image: campaign.image,
        coinValue: selectedTier.label === "S" ? 1000 : selectedTier.label === "A" ? 200 : selectedTier.label === "B" ? 80 : 15,
      });

      setIsDrawing(false);
      setShowResult(true);
    }, 2400);
  }, [isDrawing, campaign, campaignId, addPrize]);

  return (
    <div className="min-h-screen pb-28">
      <Navbar />

      {/* Hero banner */}
      <div className="relative h-56 overflow-hidden pt-16 sm:h-72">
        <img src={campaign.image} alt={campaign.title} className="h-full w-full object-cover" />
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
        {/* Description & stats */}
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

        {/* Prize Tiers */}
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          {t("prizePool")}
        </h2>
        <div className="space-y-3">
          {campaign.tiers.map((tier, i) => {
            const pct = tier.total > 0 ? (tier.remaining / tier.total) * 100 : 0;
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`overflow-hidden rounded-xl border p-4 ${tierBgMap[tier.color]} ${tierGlowMap[tier.color]}`}
              >
                <div className="flex items-start gap-3">
                  {/* Tier badge */}
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
                    {/* Prize list */}
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {tier.prizes.map((p) => (
                        <span key={p} className="rounded-md bg-background/40 px-2 py-0.5 text-xs text-foreground/80">
                          {p}
                        </span>
                      ))}
                    </div>
                    {/* Progress bar */}
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

        {/* Last One Prize callout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-4 box-glow-gold"
        >
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 shrink-0 text-accent" />
            <div>
              <h3 className="font-display text-sm font-bold text-accent">Last One Prize</h3>
              <p className="text-xs text-muted-foreground">The person who draws the very last ticket wins an exclusive bonus reward!</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Draw animation overlay */}
      <AnimatePresence>
        {isDrawing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-6">
              {/* Shaking box */}
              <motion.div
                animate={{
                  rotate: [0, -5, 5, -8, 8, -3, 3, 0],
                  scale: [1, 1.05, 1, 1.08, 1, 1.03, 1],
                }}
                transition={{ duration: 0.5, repeat: 3, ease: "easeInOut" }}
                className="relative"
              >
                {/* Glow rings */}
                <motion.div
                  animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl"
                />
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                  className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl"
                />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-primary/50 bg-card box-glow-purple">
                  <span className="text-5xl">🎁</span>
                </div>
              </motion.div>

              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="font-display text-sm tracking-widest text-muted-foreground"
              >
                {drawCount > 1 ? `Drawing ${drawCount}x...` : "Drawing..."}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result modal */}
      <PrizeRevealModal
        open={showResult}
        onClose={() => setShowResult(false)}
        prize={drawnPrize}
        drawCount={drawCount}
      />

      {/* Fixed bottom draw buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          <div className="mr-auto text-sm">
            <span className="text-muted-foreground">Price: </span>
            <span className="font-bold text-accent">${campaign.price}</span>
          </div>
          <Button
            variant="neon"
            onClick={() => handleDraw(1)}
            disabled={isDrawing}
            className="gap-1.5 px-5"
          >
            <Zap className="h-4 w-4" /> Draw 1x
          </Button>
          <Button
            variant="gold"
            onClick={() => handleDraw(10)}
            disabled={isDrawing}
            className="gap-1.5 px-5"
          >
            <Sparkles className="h-4 w-4" /> Draw 10x
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
