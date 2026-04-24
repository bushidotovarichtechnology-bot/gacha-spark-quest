import { useState, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, Crown, Star, Gift, Award, Ticket, Coins, Trophy, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import PrizeRevealModal from "@/components/PrizeRevealModal";
import PityMeterPopup from "@/components/PityMeterPopup";
import DinoUnboxAnimation from "@/components/DinoUnboxAnimation";
import PrizeImagePreview from "@/components/PrizeImagePreview";
import { useGacha } from "@/context/GachaContext";
import { toast } from "sonner";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { supabaseImg } from "@/lib/imageTransform";
import { obfuscateStock } from "@/lib/obfuscateStock";

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

// Banner gradients per tier — kitakuji-inspired chevron banner
const tierBannerMap: Record<string, string> = {
  S: "from-amber-300 via-yellow-400 to-orange-500", // Gold
  A: "from-fuchsia-500 via-purple-500 to-indigo-500", // Purple
  B: "from-pink-400 via-rose-400 to-red-400", // Pink
  C: "from-slate-400 via-slate-500 to-slate-600", // Silver
};

const tierLabelMap: Record<string, string> = {
  S: "Grand Prize",
  A: "Gold",
  B: "Silver",
  C: "Bronze",
};

const coinValues: Record<string, number> = { S: 1000, A: 200, B: 80, C: 15 };

// Persisted draw-in-progress state — survives page refresh mid-animation so the
// shake/glow/unbox animation and the resulting modals replay on next mount.
// Keyed per user + campaign and TTL'd to avoid stale state.
const DRAW_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const drawStateKey = (userId: string, campaignId: string) =>
  `bushido:draw-state:${userId}:${campaignId}`;

interface PersistedDrawState {
  drawCount: number;
  drawnPrizes: { tier: string; color: string; prize: string; image?: string; isPityReward?: boolean }[];
  hasPityReward: boolean;
  pityPopup: { open: boolean; before: number; after: number; wasReset: boolean };
  savedAt: number;
}

const readDrawState = (userId: string, campaignId: string): PersistedDrawState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(drawStateKey(userId, campaignId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDrawState;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > DRAW_STATE_TTL_MS) {
      sessionStorage.removeItem(drawStateKey(userId, campaignId));
      return null;
    }
    if (!Array.isArray(parsed.drawnPrizes) || parsed.drawnPrizes.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeDrawState = (userId: string, campaignId: string, state: Omit<PersistedDrawState, "savedAt">) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      drawStateKey(userId, campaignId),
      JSON.stringify({ ...state, savedAt: Date.now() }),
    );
  } catch {
    // ignore quota / private mode
  }
};

const clearDrawState = (userId: string, campaignId: string) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(drawStateKey(userId, campaignId));
  } catch {
    // ignore
  }
};
const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const campaignId = id || "";
  const { totalCoins, drawsSinceTierA, freeDraws, activeDiscountPercent, refreshCoins } = useGacha();
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as const });
      return !!data;
    },
    staleTime: 5 * 60 * 1000,
  });

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

    const pityChannel = supabase
      .channel(`pity-settings-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pity_settings", filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["pity_settings", campaignId] });
          if (payload.eventType === "UPDATE") {
            const newData = payload.new as any;
            if (!newData.is_enabled) {
              toast.info("Pity system telah dinonaktifkan untuk campaign ini");
            } else {
              toast.info(`Pity system diperbarui: threshold ${newData.threshold} draw, tier ${newData.guaranteed_tier} dijamin`);
            }
          } else if (payload.eventType === "DELETE") {
            toast.info("Pity system telah dihapus untuk campaign ini");
          } else if (payload.eventType === "INSERT") {
            toast.info("Pity system telah diaktifkan untuk campaign ini!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(pityChannel);
    };
  }, [campaignId, queryClient]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [drawnPrizes, setDrawnPrizes] = useState<{ tier: string; color: string; prize: string; image?: string; isPityReward?: boolean }[]>([]);
  const [drawCount, setDrawCount] = useState(0);
  const [hasPityReward, setHasPityReward] = useState(false);
  const [pendingDrawComplete, setPendingDrawComplete] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; description?: string; images?: { url: string; name: string; description?: string }[]; index?: number } | null>(null);
  const [pityPopup, setPityPopup] = useState<{ open: boolean; before: number; after: number; wasReset: boolean }>({ open: false, before: 0, after: 0, wasReset: false });

  const pityEnabled = pitySettings?.is_enabled ?? true;
  const pityThreshold = pitySettings?.threshold ?? 10;
  const pityGuaranteedTier = pitySettings?.guaranteed_tier ?? "A";

  // Restore in-progress draw animation after page refresh.
  // Runs once per (user, campaign) when both are known.
  useEffect(() => {
    if (!user || !campaignId) return;
    // Don't clobber an active draw in this tab.
    if (isDrawing || showResult) return;
    const saved = readDrawState(user.id, campaignId);
    if (!saved) return;
    setDrawCount(saved.drawCount);
    setDrawnPrizes(saved.drawnPrizes);
    setHasPityReward(saved.hasPityReward);
    setPityPopup(saved.pityPopup);
    setPendingDrawComplete(true);
    setIsDrawing(true); // replays the shake/glow/unbox animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, campaignId]);

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
      prizes: (tier.tier_prizes || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((p: any) => ({ id: p.id, name: p.name, description: p.description || "", total: p.total ?? 1, remaining: p.remaining ?? 1, probability_weight: Number(p.probability_weight ?? 1), image_url: p.image_url || "", auto_refill: p.auto_refill ?? false, coin_value: p.coin_value ?? 0 })),
    }));

  const totalRemaining = tiers.reduce((s, t) => s + t.prizes.reduce((ps: number, p: any) => ps + p.remaining, 0), 0);
  const totalTickets = tiers.reduce((s, t) => s + t.prizes.reduce((ps: number, p: any) => ps + p.total, 0), 0);

  const handleDraw = async (count: number) => {
    if (!user) {
      toast.error("Silakan login terlebih dahulu untuk melakukan gacha!");
      navigate("/login");
      return;
    }
    if (isDrawing || totalRemaining <= 0) return;
    const actualCount = Math.min(count, totalRemaining);

    // Optimistic UI lock — prevent double-click / spam BEFORE network call
    setDrawCount(actualCount);
    setIsDrawing(true);
    setPendingDrawComplete(false);

    try {
      const { data, error } = await supabase.functions.invoke("secure-draw", {
        body: { campaign_id: campaignId, draw_count: actualCount },
      });

      if (error || !data?.success) {
        const code = (data as any)?.error || error?.message || "draw_failed";
        const messages: Record<string, string> = {
          rate_limited: "Terlalu cepat! Tunggu 2 detik sebelum gacha lagi.",
          insufficient_coins: t("insufficientCoins"),
          campaign_not_found: "Campaign tidak ditemukan.",
          unauthorized: "Sesi Anda kedaluwarsa. Silakan login ulang.",
          invalid_draw_count: "Jumlah draw tidak valid.",
          invalid_params: "Permintaan tidak valid.",
          user_banned: "Akun Anda di-banned. Hubungi admin untuk informasi lebih lanjut.",
        };
        toast.error(messages[code] || "Gacha gagal. Coba lagi.");
        setIsDrawing(false);
        return;
      }

      const serverResults = (data.results as any[]) || [];
      const results = serverResults.map((r) => ({
        tier: r.tier,
        color: colorMap[r.tier] || "text-muted-foreground",
        prize: r.prize,
        image: r.image || image,
        isPityReward: !!r.isPityReward,
        coinValue: r.coinValue,
      }));

      if (data.free_used > 0) {
        toast.success(`Menggunakan ${data.free_used}x gacha gratis!`);
      }
      const totalTicketsAwarded = serverResults.reduce(
        (s, r) => s + (r.ticketsAwarded || 0),
        0
      );
      if (totalTicketsAwarded > 0) {
        toast.success(`🎫 Kamu mendapat ${totalTicketsAwarded} Bushido Tiket!`);
      }

      await refreshCoins();
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["user-ticket-balance"] });

      setDrawnPrizes(results);
      setHasPityReward(!!data.has_pity_reward);

      // Compute pity meter change for popup
      if (pityEnabled) {
        const beforeVal = drawsSinceTierA;
        const hitSorA = serverResults.some((r) => r.tier === "S" || r.tier === "A");
        const nonRareCount = serverResults.filter((r) => r.tier !== "S" && r.tier !== "A").length;
        const afterVal = hitSorA ? 0 : Math.min(beforeVal + nonRareCount, pityThreshold);
        setPityPopup({ open: false, before: beforeVal, after: afterVal, wasReset: hitSorA && beforeVal > 0 });
      }

      setPendingDrawComplete(true);
    } catch (err) {
      console.error("Draw error:", err);
      toast.error("Terjadi kesalahan. Coba lagi.");
      setIsDrawing(false);
    }
  };

  return (
    <div className="min-h-screen pb-28">
      <Navbar />

      {/* Hero banner */}
      <div className="relative h-56 overflow-hidden pt-16 sm:h-72">
        <img src={supabaseImg(image, 1280, 75)} alt={campaign.title} loading="eager" fetchPriority="high" className="h-full w-full object-cover" />
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
            <span className="text-sm font-semibold text-foreground">{campaign.price}</span>
            <Coins className="h-4 w-4 text-accent" />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">
              <span className="font-semibold">{isAdmin ? totalRemaining : obfuscateStock(totalRemaining, totalTickets).remainingLabel}</span>
              <span className="text-muted-foreground">/{totalTickets} {t("left")}</span>
            </span>
          </div>
        </div>

        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          {t("prizePool")}
        </h2>
        {(() => {
          // Hitung peluang per tier (eksklusi tier S — itu untuk last one)
          return null;
        })()}
        <div className="space-y-6">
          {(() => {
            const nonSTiers = tiers.filter((t) => t.label !== "S");
            const weights = new Map<string, number>();
            nonSTiers.forEach((t) => {
              const tierRem = t.prizes.reduce((s: number, p: any) => s + p.remaining, 0);
              weights.set(t.id, tierRem > 0 ? Number(t.probability_weight ?? 1) : 0);
            });
            const totalWeight = Array.from(weights.values()).reduce((s, w) => s + w, 0);
            const chanceFor = (id: string) =>
              totalWeight > 0 ? ((weights.get(id) ?? 0) / totalWeight) * 100 : 0;

            return tiers.map((tier, i) => {
              const tierRemaining = tier.prizes.reduce((s: number, p: any) => s + p.remaining, 0);
              const tierTotal = tier.prizes.reduce((s: number, p: any) => s + p.total, 0);
              const pct = tierTotal > 0 ? (tierRemaining / tierTotal) * 100 : 0;
              const chancePct = tier.label !== "S" ? chanceFor(tier.id) : 0;
              const showChance = tier.label !== "S" && tierRemaining > 0;
            const bannerGradient = tierBannerMap[tier.label] || tierBannerMap.C;
            const tierLabel = tierLabelMap[tier.label] || tier.name;
            const isGrand = tier.label === "S";
            const isRare = tier.label === "A";
            const TierIcon = tier.icon;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="space-y-3"
              >
                {/* Kitakuji-style chevron banner */}
                <div className="relative">
                  <div
                    className={`relative flex h-10 items-center overflow-hidden bg-gradient-to-r ${bannerGradient} pl-3 pr-10 shadow-lg ${isGrand ? "shadow-[0_0_25px_rgba(251,191,36,0.6)]" : isRare ? "shadow-[0_0_15px_rgba(168,85,247,0.45)]" : ""}`}
                    style={{
                      clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)",
                    }}
                  >
                    {/* Grand Prize: shimmering gradient overlay + sweeping shine */}
                    {isGrand && (
                      <>
                        <div
                          className="pointer-events-none absolute inset-0 animate-shimmer opacity-70"
                          style={{
                            backgroundImage:
                              "linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)",
                            backgroundSize: "200% 100%",
                          }}
                        />
                        <div className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-shine-sweep bg-gradient-to-r from-transparent via-white/80 to-transparent blur-sm" />
                      </>
                    )}

                    {/* Tier A: subtle shimmer only — no sweeping shine */}
                    {isRare && (
                      <div
                        className="pointer-events-none absolute inset-0 animate-shimmer opacity-30"
                        style={{
                          backgroundImage:
                            "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)",
                          backgroundSize: "200% 100%",
                          animationDuration: "5s",
                        }}
                      />
                    )}

                    <div className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm ring-2 ring-white/40 ${isGrand ? "animate-pulse-glow" : ""}`}>
                      <TierIcon className="h-3.5 w-3.5 text-white drop-shadow" />
                    </div>
                    <span className="relative z-10 ml-2 font-display text-sm font-black uppercase tracking-wider text-white drop-shadow-md">
                      {tier.label} · {tierLabel}
                    </span>
                    <span className="relative z-10 ml-3 hidden text-xs font-bold text-white/90 drop-shadow sm:inline">
                      {tier.name}
                    </span>
                    <div className="relative z-10 ml-auto flex items-center gap-2">
                      {showChance && (
                        <span
                          className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm ring-1 ring-white/30"
                          title="Peluang mendapatkan tier ini saat gacha"
                        >
                          {chancePct >= 10 ? chancePct.toFixed(0) : chancePct.toFixed(1)}%
                        </span>
                      )}
                      <span className={`rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold text-white ${tierRemaining <= 2 ? "animate-pulse" : ""}`}>
                        {isAdmin ? tierRemaining : obfuscateStock(tierRemaining, tierTotal).remainingLabel}/{tierTotal}
                      </span>
                    </div>
                  </div>

                  {/* Decorative shine line */}
                  <div className="pointer-events-none absolute inset-x-0 top-1 h-px bg-white/40" style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)" }} />

                  {/* Grand Prize: floating sparkle particles around banner */}
                  {isGrand && (
                    <div className="pointer-events-none absolute inset-0 overflow-visible">
                      <Sparkles className="absolute left-[8%] top-1 h-3 w-3 animate-sparkle-twinkle text-yellow-200 drop-shadow-[0_0_4px_rgba(253,224,71,0.9)]" style={{ animationDelay: "0s" }} />
                      <Sparkles className="absolute left-[28%] top-5 h-2.5 w-2.5 animate-sparkle-twinkle text-amber-100 drop-shadow-[0_0_4px_rgba(254,240,138,0.9)]" style={{ animationDelay: "0.6s" }} />
                      <Sparkles className="absolute left-[55%] top-0 h-3.5 w-3.5 animate-sparkle-twinkle text-yellow-100 drop-shadow-[0_0_5px_rgba(253,224,71,1)]" style={{ animationDelay: "1.1s" }} />
                      <Sparkles className="absolute left-[78%] top-4 h-2 w-2 animate-sparkle-twinkle text-amber-200 drop-shadow-[0_0_4px_rgba(252,211,77,0.9)]" style={{ animationDelay: "1.6s" }} />
                      <Star className="absolute left-[42%] top-6 h-2 w-2 animate-sparkle-float fill-yellow-200 text-yellow-200" style={{ animationDelay: "0.3s" }} />
                      <Star className="absolute left-[68%] top-7 h-1.5 w-1.5 animate-sparkle-float fill-amber-100 text-amber-100" style={{ animationDelay: "1.4s" }} />
                    </div>
                  )}

                  {/* Tier A: subtle sparkle — fewer, smaller, dimmer (purple) */}
                  {isRare && (
                    <div className="pointer-events-none absolute inset-0 overflow-visible">
                      <Sparkles className="absolute left-[15%] top-1.5 h-2 w-2 animate-sparkle-twinkle text-purple-200/80 drop-shadow-[0_0_3px_rgba(216,180,254,0.7)]" style={{ animationDelay: "0.4s", animationDuration: "3s" }} />
                      <Sparkles className="absolute left-[60%] top-5 h-2 w-2 animate-sparkle-twinkle text-fuchsia-200/80 drop-shadow-[0_0_3px_rgba(240,171,252,0.7)]" style={{ animationDelay: "1.5s", animationDuration: "3s" }} />
                      <Sparkles className="absolute left-[82%] top-1 h-1.5 w-1.5 animate-sparkle-twinkle text-purple-100/70 drop-shadow-[0_0_2px_rgba(233,213,255,0.6)]" style={{ animationDelay: "2.2s", animationDuration: "3s" }} />
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${bannerGradient}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: i * 0.15 }}
                  />
                </div>

                {/* Prize cards grid */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {tier.prizes.map((p: any) => {
                    const isOut = p.remaining <= 0;
                    const coinVal = p.coin_value > 0 ? p.coin_value : (coinValues[tier.label] || 15);
                    return (
                      <motion.div
                        key={p.id}
                        whileHover={{ scale: isOut ? 1 : 1.02 }}
                        className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl border p-3 transition-all ${
                          isOut
                            ? "border-destructive/30 bg-destructive/5 opacity-60"
                            : `${tierBgMap[tier.color]} hover:shadow-lg`
                        }`}
                        onClick={() => {
                          const imagesInTier = tier.prizes.filter((pr: any) => pr.image_url).map((pr: any) => ({ url: pr.image_url, name: pr.name, description: pr.description }));
                          const idx = imagesInTier.findIndex((img: any) => img.url === p.image_url);
                          if (imagesInTier.length > 0 && idx >= 0) {
                            setPreviewImage({ url: p.image_url, name: p.name, description: p.description, images: imagesInTier, index: idx });
                          }
                        }}
                      >
                        {/* Tier corner ribbon */}
                        <div
                          className={`absolute right-0 top-0 bg-gradient-to-br ${bannerGradient} px-2 py-0.5 text-[9px] font-black text-white shadow-md`}
                          style={{ clipPath: "polygon(12px 0, 100% 0, 100% 100%, 0 100%)" }}
                        >
                          {tier.label}
                        </div>

                        {p.image_url ? (
                          <div className={`relative shrink-0 h-16 w-16 overflow-hidden rounded-lg ring-2 ring-border/50 transition-transform group-hover:scale-110 ${isOut ? "grayscale" : ""}`}>
                            {/* Subtle radial gradient + diagonal pattern backdrop */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_70%),radial-gradient(circle_at_80%_85%,hsl(var(--accent)/0.15),transparent_65%)] bg-secondary/40" />
                            <div
                              className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
                              style={{
                                backgroundImage:
                                  "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0 1px, transparent 1px 6px)",
                              }}
                            />
                            <img
                              src={supabaseImg(p.image_url, 200)}
                              alt={p.name}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-contain p-1"
                            />
                            {isOut && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                                <Ban className="h-5 w-5 text-destructive" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Gift className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 pr-6">
                          <p className={`truncate text-sm font-semibold ${isOut ? "text-destructive/70 line-through" : "text-foreground"}`}>
                            {p.name}
                          </p>
                          {p.description && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{p.description}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                              <Coins className="h-2.5 w-2.5" />
                              {coinVal.toLocaleString()}
                            </span>
                            {!isOut ? (
                              <span className="text-[10px] font-medium text-muted-foreground">
                                Stok: <span className="text-foreground">{isAdmin ? p.remaining : obfuscateStock(p.remaining, p.total).remainingLabel}/{p.total}</span>
                              </span>
                            ) : (
                              <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold text-destructive">HABIS</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
              );
            });
          })()}
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

        {/* Grand Prize (Tier S) Info */}
        {(() => {
          const tierS = tiers.find((t) => t.label === "S");
          if (!tierS || tierS.prizes.length === 0) return null;
          const tierSRemaining = tierS.prizes.reduce((s: number, p: any) => s + p.remaining, 0);
          if (tierSRemaining <= 0) return null;
          const nonSRemaining = totalRemaining - tierSRemaining;
          const isUnlocked = nonSRemaining <= 0;
          const progressPct = totalTickets > 0 ? Math.min(((totalTickets - totalRemaining) / (totalTickets - tierSRemaining)) * 100, 100) : 0;

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55 }}
              className={`mt-4 rounded-xl border p-4 ${
                isUnlocked
                  ? "border-accent/60 bg-accent/10 box-glow-gold animate-pulse"
                  : "border-primary/30 bg-primary/5"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Trophy className={`h-6 w-6 shrink-0 ${isUnlocked ? "text-accent" : "text-primary/60"}`} />
                <div className="flex-1">
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {isUnlocked ? "🎉 Grand Prize Terbuka!" : "Grand Prize (Tier S)"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isUnlocked
                      ? "Semua hadiah lain sudah habis — Grand Prize siap untuk dimenangkan!"
                      : "Grand Prize hanya bisa didapatkan ketika menjadi satu-satunya hadiah yang tersisa."}
                  </p>
                </div>
              </div>
              {!isUnlocked && (
                <>
                  <div className="h-2 overflow-hidden rounded-full bg-background/50 mb-1.5">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary/70 to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Sisa <span className="font-semibold text-foreground">{isAdmin ? nonSRemaining : obfuscateStock(nonSRemaining, totalTickets).remainingLabel}</span> hadiah lagi sebelum Grand Prize terbuka
                  </p>
                </>
              )}
            </motion.div>
          );
        })()}

        {/* Pity System Indicator */}
        {pityEnabled && (
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
        )}
      </div>

      <AnimatePresence>
        {isDrawing && (
          <DinoUnboxAnimation
            requiredTaps={drawCount > 1 ? 8 : 5}
            drawCount={drawCount}
            tier={drawnPrizes.length > 0 ? (drawnPrizes[0].tier as "S" | "A" | "B" | "C") : "C"}
            prizeImage={drawnPrizes[0]?.image}
            prizeName={drawnPrizes[0]?.prize}
            onComplete={() => {
              setIsDrawing(false);
              if (pendingDrawComplete) {
                setShowResult(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      <PrizeRevealModal
        open={showResult}
        onClose={() => {
          setShowResult(false);
          // Show pity popup after reveal closes (only if meter changed or reset)
          if (pityEnabled && (pityPopup.after !== pityPopup.before || pityPopup.wasReset)) {
            setTimeout(() => setPityPopup((p) => ({ ...p, open: true })), 250);
          }
        }}
        prizes={drawnPrizes}
        drawCount={drawCount}
        hasPityReward={hasPityReward}
      />

      <PityMeterPopup
        open={pityPopup.open}
        onClose={() => setPityPopup((p) => ({ ...p, open: false }))}
        beforeValue={pityPopup.before}
        afterValue={pityPopup.after}
        threshold={pityThreshold}
        guaranteedTier={pityGuaranteedTier}
        wasReset={pityPopup.wasReset}
      />

      <PrizeImagePreview image={previewImage} onClose={() => setPreviewImage(null)} />

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
                  {activeDiscountPercent > 0 ? (
                    <>
                      <span className="font-bold text-accent line-through opacity-50">{campaign.price}</span>
                      <span className="font-bold text-accent ml-1">
                        {Math.round(campaign.price * (1 - activeDiscountPercent / 100))} coins
                      </span>
                      <span className="ml-1 text-xs text-green-400">(-{activeDiscountPercent}%)</span>
                    </>
                  ) : (
                    <span className="font-bold text-accent">{campaign.price} coins</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3 text-accent" />
                    {totalCoins.toLocaleString()}
                  </span>
                  {freeDraws > 0 && (
                    <span className="flex items-center gap-1 text-green-400 font-medium">
                      <Zap className="h-3 w-3" />
                      {freeDraws}x gratis
                    </span>
                  )}
                </div>
              </div>
              {totalRemaining <= 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground">
                  <Ban className="h-4 w-4" />
                  Sold Out — Semua hadiah sudah habis
                </div>
              ) : (
                <>
                  <Button
                    variant="neon"
                    onClick={() => handleDraw(1)}
                    disabled={isDrawing}
                    className="gap-1.5 px-5"
                  >
                    <Zap className="h-4 w-4" /> {t("draw1x")}
                  </Button>
                  <Button
                    variant="gold"
                    onClick={() => handleDraw(10)}
                    disabled={isDrawing}
                    className="gap-1.5 px-5"
                  >
                    <Sparkles className="h-4 w-4" /> {t("draw10x")}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
