import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Gift, Award, X, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";

interface PrizeRevealModalProps {
  open: boolean;
  onClose: () => void;
  prizes: { tier: string; color: string; prize: string; isPityReward?: boolean }[];
  drawCount: number;
  hasPityReward?: boolean;
}

const tierConfig: Record<string, { gradient: string; glow: string; icon: typeof Crown; emoji: string }> = {
  S: { gradient: "from-accent via-yellow-400 to-accent", glow: "box-glow-gold", icon: Crown, emoji: "👑" },
  A: { gradient: "from-primary via-purple-400 to-primary", glow: "box-glow-purple", icon: Star, emoji: "⭐" },
  B: { gradient: "from-pink-500 via-rose-400 to-pink-500", glow: "", icon: Gift, emoji: "🎁" },
  C: { gradient: "from-muted-foreground via-gray-400 to-muted-foreground", glow: "", icon: Award, emoji: "📦" },
};

const tierOrder = { S: 0, A: 1, B: 2, C: 3 };

const PrizeRevealModal = ({ open, onClose, prizes, drawCount, hasPityReward }: PrizeRevealModalProps) => {
  const { t } = useI18n();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

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

  return (
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
              <button onClick={handleClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>

              <p className="mb-1 text-center font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t("drawResult", { count: drawCount })}
              </p>
              <h2 className="mb-4 text-center font-display text-lg font-bold text-foreground">
                {t("drawSummary")}
              </h2>

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
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${c.gradient} text-sm font-black text-background`}>
                        {p.tier}
                      </div>
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

              <Button variant="neon" onClick={handleClose} className="mt-4 w-full">
                {t("continue")}
              </Button>
            </motion.div>
          ) : (
            /* ===== Single Prize View ===== */
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-sm overflow-hidden rounded-2xl border bg-card p-6 text-center ${
                prize.isPityReward ? "border-accent box-glow-gold" : `border-border ${config.glow}`
              }`}
            >
              <button onClick={handleClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground z-10">
                <X className="h-5 w-5" />
              </button>

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
                    className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-yellow-400 px-2.5 py-1 text-[10px] font-black text-background shadow-lg"
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

              {isRare && !prize.isPityReward && (
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
                <div className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${config.gradient}`}>
                  <span className="text-4xl">{config.emoji}</span>
                </div>
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
                      return (
                        <div
                          key={i}
                          className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-black bg-gradient-to-br ${c.gradient} text-background ${i === currentIndex ? "ring-2 ring-foreground" : "opacity-60"}`}
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
};

export default PrizeRevealModal;
