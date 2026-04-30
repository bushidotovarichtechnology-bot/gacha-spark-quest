import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Gift, Award, X, ChevronLeft, ChevronRight, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import PrizeShareMenu from "@/components/PrizeShareMenu";

// Cache audio data URLs across modal re-opens
const sfxCache: Record<string, string> = {};

const SFX_MUTE_KEY = "prize-reveal-sfx-muted";

const getSfxMuted = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SFX_MUTE_KEY) === "1";
  } catch {
    return false;
  }
};

const setSfxMuted = (muted: boolean) => {
  try {
    localStorage.setItem(SFX_MUTE_KEY, muted ? "1" : "0");
  } catch {
    // ignore
  }
};

const playTierSfx = async (tier: string) => {
  if (tier !== "S" && tier !== "A") return;
  if (getSfxMuted()) return;
  try {
    let dataUrl = sfxCache[tier];
    if (!dataUrl) {
      const { data, error } = await supabase.functions.invoke("generate-tier-sfx", {
        body: { tier },
      });
      if (error || !data?.audioContent) return;
      dataUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      sfxCache[tier] = dataUrl;
    }
    if (getSfxMuted()) return;
    const audio = new Audio(dataUrl);
    audio.volume = 0.7;
    await audio.play().catch(() => {});
  } catch (e) {
    console.warn("Failed to play tier SFX", e);
  }
};

interface PrizeRevealModalProps {
  open: boolean;
  onClose: () => void;
  prizes: { tier: string; color: string; prize: string; image?: string; isPityReward?: boolean }[];
  drawCount: number;
  hasPityReward?: boolean;
  /** Rate-up multiplier yang server pakai untuk draw ini (mis. 1.5 untuk 100 user pertama). */
  rateUpMultiplier?: number;
  /** Campaign name (for share card context). */
  campaignName?: string;
  /** Absolute URL to the campaign detail page (used by share menu). */
  campaignUrl?: string;
}

// Uses global tier tokens (Diamond/Gold/Silver/Bronze) — see src/lib/tierStyles.ts.
const tierConfig: Record<string, { gradient: string; glow: string; icon: typeof Crown; emoji: string }> = {
  S: { gradient: "tier-banner-s", glow: "tier-glow-s", icon: Crown, emoji: "💎" },
  A: { gradient: "tier-banner-a", glow: "tier-glow-a", icon: Star, emoji: "🥇" },
  B: { gradient: "tier-banner-b", glow: "tier-glow-b", icon: Gift, emoji: "🥈" },
  C: { gradient: "tier-banner-c", glow: "tier-glow-c", icon: Award, emoji: "🥉" },
};

const tierOrder = { S: 0, A: 1, B: 2, C: 3 };

const PrizeRevealModal = ({ open, onClose, prizes, drawCount, hasPityReward, rateUpMultiplier, campaignName, campaignUrl }: PrizeRevealModalProps) => {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => getSfxMuted());
  const lastPlayedRef = useRef<string | null>(null);

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      setSfxMuted(next);
      return next;
    });
  };

  const safePrize = prizes[currentIndex] || prizes[0];

  // Play SFX when a new rare tier prize is shown (single view only)
  useEffect(() => {
    if (!open || showSummary || !safePrize) {
      lastPlayedRef.current = null;
      return;
    }
    const key = `${currentIndex}-${safePrize.tier}`;
    if ((safePrize.tier === "S" || safePrize.tier === "A") && lastPlayedRef.current !== key) {
      lastPlayedRef.current = key;
      playTierSfx(safePrize.tier);
    }
  }, [open, showSummary, currentIndex, safePrize]);

  // Lock body scroll while modal is open so the dialog stays anchored to the
  // user's viewport (right where the unbox animation just finished).
  useEffect(() => {
    if (!open) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  if (!prizes.length) return null;

  const isMulti = prizes.length > 1;
  const prize = prizes[currentIndex] || prizes[0];
  const config = tierConfig[prize.tier] || tierConfig.C;
  const isRare = prize.tier === "S" || prize.tier === "A";
  const isLast = currentIndex >= prizes.length - 1;

  const sorted = [...prizes].sort((a, b) => (tierOrder[a.tier as keyof typeof tierOrder] ?? 3) - (tierOrder[b.tier as keyof typeof tierOrder] ?? 3));

  const handleClose = () => {
    setCurrentIndex(0);
    setShowSummary(false);
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  const handleSkipAll = () => {
    setShowSummary(true);
  };

  // Count tiers for summary
  const tierCounts: Record<string, { count: number; names: string[] }> = {};
  prizes.forEach((p) => {
    if (!tierCounts[p.tier]) tierCounts[p.tier] = { count: 0, names: [] };
    tierCounts[p.tier].count++;
    tierCounts[p.tier].names.push(p.prize);
  });

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
          onClick={handleClose}
        >
          {showSummary ? (
            /* ===== Summary View ===== */
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-6"
            >
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button onClick={handleClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-1 text-center font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t("drawResult", { count: drawCount })}
              </p>
              <h2 className="mb-2 text-center font-display text-lg font-bold text-foreground">
                {t("drawSummary")}
              </h2>
              {rateUpMultiplier && rateUpMultiplier > 1 ? (
                <div className="mb-3 flex justify-center">
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent shadow-[0_0_12px_hsl(var(--accent)/0.35)]">
                    ✦ Rate Up {rateUpMultiplier}x diterapkan
                  </span>
                </div>
              ) : null}

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {sorted.map((p, i) => {
                  const c = tierConfig[p.tier] || tierConfig.C;
                  const rare = p.tier === "S" || p.tier === "A";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                        rare ? "border-accent/30 bg-accent/5" : "border-border bg-secondary/30"
                      }`}
                    >
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.prize}
                          className={`h-9 w-9 shrink-0 rounded-lg object-contain border bg-gradient-to-br ${c.gradient} p-0.5`}
                        />
                      ) : (
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.gradient} text-sm font-black text-background`}>
                          {p.tier}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${rare ? "text-accent" : "text-foreground"}`}>
                          {p.prize}
                        </p>
                        {p.isPityReward && (
                          <span className="text-[9px] font-bold text-accent">★ PITY</span>
                        )}
                      </div>
                      <span className="text-lg">{c.emoji}</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Tier counts */}
              <div className="mt-4 flex justify-center gap-2">
                {["S", "A", "B", "C"].map((tier) => {
                  if (!tierCounts[tier]) return null;
                  const c = tierConfig[tier];
                  return (
                    <div key={tier} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-gradient-to-r ${c.gradient} text-background`}>
                      {tier} ×{tierCounts[tier].count}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2">
                <PrizeShareMenu prize={sorted[0].prize} tier={sorted[0].tier} imageUrl={sorted[0].image} campaign={campaignName} url={campaignUrl} />
                <Button variant="neon" onClick={handleClose} className="w-full">
                  {t("continue")}
                </Button>
              </div>
            </motion.div>
          ) : (
            /* ===== Single Prize View ===== */
            <motion.div
              key={currentIndex}
              initial={prize.tier === "S" ? { scale: 0.3, opacity: 0, rotateY: 180 } : { scale: 0.5, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={prize.tier === "S" ? { type: "spring", damping: 12, stiffness: 150, duration: 0.6 } : { type: "spring", damping: 15, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-sm overflow-hidden rounded-2xl border bg-card p-6 text-center ${
                prize.tier === "S" ? "border-tier-s border-2 tier-glow-s" :
                prize.isPityReward ? "border-tier-a tier-glow-a" : `border-border ${config.glow}`
              }`}
            >
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button onClick={handleClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Pity reward special effect */}
              {prize.isPityReward && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  {/* Rotating golden rays */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-50%] opacity-20"
                    style={{
                      background: "conic-gradient(from 0deg, transparent, hsl(var(--accent)), transparent, hsl(var(--accent)), transparent, hsl(var(--accent)), transparent)",
                    }}
                  />
                  {/* Pity badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full tier-banner-a px-2.5 py-1 text-[10px] font-black text-tier-a-foreground shadow-lg"
                  >
                    <Star className="h-3 w-3" />
                    PITY REWARD
                  </motion.div>
                  {/* Extra sparkle particles */}
                  {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                      key={`pity-${i}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        x: `${Math.random() * 100}%`,
                        y: `${Math.random() * 100}%`,
                      }}
                      transition={{
                        duration: 1.5 + Math.random(),
                        delay: Math.random() * 2,
                        repeat: Infinity,
                        repeatDelay: Math.random() * 2,
                      }}
                      className="absolute h-1.5 w-1.5 rounded-full bg-accent"
                      style={{ filter: "blur(0.5px)" }}
                    />
                  ))}
                </div>
              )}

              {/* Grand Prize (Tier S) — Confetti explosion */}
              {prize.tier === "S" && !prize.isPityReward && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  {/* Rotating golden rays */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-50%] opacity-15"
                    style={{
                      background: "conic-gradient(from 0deg, transparent, hsl(var(--accent)), transparent, hsl(var(--accent)), transparent, hsl(var(--accent)), transparent)",
                    }}
                  />
                  {/* Confetti pieces */}
                  {Array.from({ length: 40 }).map((_, i) => {
                    const colors = [
                      "bg-accent", "bg-primary", "bg-neon-pink",
                      "bg-yellow-400", "bg-green-400", "bg-blue-400",
                      "bg-red-400", "bg-purple-400", "bg-orange-400",
                    ];
                    const isRect = i % 3 === 0;
                    const startX = 50 + (Math.random() - 0.5) * 20;
                    const endX = startX + (Math.random() - 0.5) * 120;
                    return (
                      <motion.div
                        key={`confetti-${i}`}
                        initial={{
                          y: "40%",
                          x: `${startX}%`,
                          opacity: 1,
                          scale: 0,
                          rotate: 0,
                        }}
                        animate={{
                          y: `${-20 + Math.random() * 140}%`,
                          x: `${endX}%`,
                          opacity: [0, 1, 1, 0.8, 0],
                          scale: [0, 1.2, 1],
                          rotate: Math.random() * 720 - 360,
                        }}
                        transition={{
                          duration: 2 + Math.random() * 1.5,
                          delay: Math.random() * 0.6,
                          ease: "easeOut",
                        }}
                        className={`absolute ${isRect ? "h-3 w-1.5 rounded-sm" : "h-2 w-2 rounded-full"} ${colors[i % colors.length]}`}
                      />
                    );
                  })}
                  {/* Sparkle stars */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={`star-${i}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        x: `${10 + Math.random() * 80}%`,
                        y: `${10 + Math.random() * 80}%`,
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 0.5 + Math.random() * 1.5,
                        repeat: Infinity,
                        repeatDelay: 1 + Math.random() * 2,
                      }}
                      className="absolute text-accent text-lg"
                    >
                      ✦
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Tier A — Simple particles */}
              {prize.tier === "A" && !prize.isPityReward && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: -20, x: `${Math.random() * 100}%`, opacity: 1, scale: 0 }}
                      animate={{
                        y: "120%",
                        opacity: [1, 1, 0],
                        scale: [0, 1, 0.5],
                        rotate: Math.random() * 360,
                      }}
                      transition={{ duration: 2 + Math.random(), delay: Math.random() * 0.5, ease: "easeOut" }}
                      className={`absolute h-2 w-2 rounded-full ${i % 3 === 0 ? "bg-accent" : i % 3 === 1 ? "bg-primary" : "bg-neon-pink"}`}
                    />
                  ))}
                </div>
              )}

              {/* Rate-up indicator */}
              {rateUpMultiplier && rateUpMultiplier > 1 ? (
                <div className="mb-2 flex justify-center">
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent shadow-[0_0_12px_hsl(var(--accent)/0.35)]">
                    ✦ Rate Up {rateUpMultiplier}x
                  </span>
                </div>
              ) : null}

              {/* Counter + Skip */}
              {isMulti && (
                <div className="mb-2 flex items-center justify-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    {currentIndex + 1} / {prizes.length}
                  </p>
                  <button
                    onClick={handleSkipAll}
                    className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary"
                  >
                    <SkipForward className="h-3 w-3" />
                    {t("skipAll")}
                  </button>
                </div>
              )}

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mx-auto mb-4"
              >
                {prize.image ? (
                  <div className={`relative inline-flex h-24 w-24 items-center justify-center rounded-2xl ${config.gradient} ${config.glow} p-0.5`}>
                    <img
                      src={prize.image}
                      alt={prize.prize}
                      className="h-full w-full rounded-xl object-contain bg-card"
                    />
                  </div>
                ) : (
                  <div className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl ${config.gradient} ${config.glow}`}>
                    <span className="text-4xl">{config.emoji}</span>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="mb-1 font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {isMulti ? t("drawResult", { count: drawCount }) : t("youDrew")}
                </p>
                <h2 className={`mb-2 font-display text-lg font-black ${isRare ? "text-glow-gold text-accent" : "text-foreground"}`}>
                  {prize.tier === "S" ? t("grandPrizeFire") : `${t("tierA").split(" ")[0]} ${prize.tier}`}
                </h2>
                <p className="mb-6 text-base font-semibold text-foreground">{prize.prize}</p>

                <div className="flex gap-2">
                  {isMulti && currentIndex > 0 && (
                    <Button variant="outline" onClick={handlePrev} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant={isRare ? "gold" : "neon"} onClick={handleNext} className="w-full">
                    {isLast ? (isRare ? t("claimReward") : t("continue")) : t("continue")}
                  </Button>
                  <PrizeShareMenu prize={prize.prize} tier={prize.tier} imageUrl={prize.image} campaign={campaignName} url={campaignUrl} variant="compact" />
                  {isMulti && !isLast && (
                    <Button variant="outline" onClick={handleNext} className="shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Mini summary dots */}
                {isMulti && (
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {sorted.map((p, i) => {
                      const c = tierConfig[p.tier] || tierConfig.C;
                      const isActive = p === prize;
                      return (
                        <div
                          key={i}
                          className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-black bg-gradient-to-br ${c.gradient} text-background ${isActive ? "ring-2 ring-foreground" : "opacity-60"}`}
                        >
                          {p.tier}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return modalContent;
  return createPortal(modalContent, document.body);
};

export default PrizeRevealModal;
