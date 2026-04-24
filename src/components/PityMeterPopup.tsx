import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";

interface PityMeterPopupProps {
  open: boolean;
  onClose: () => void;
  beforeValue: number;
  afterValue: number;
  threshold: number;
  guaranteedTier: string;
  wasReset: boolean; // true if user just hit S/A and meter reset
}

const PityMeterPopup = ({
  open,
  onClose,
  beforeValue,
  afterValue,
  threshold,
  guaranteedTier,
  wasReset,
}: PityMeterPopupProps) => {
  const { t } = useI18n();
  const [animatedValue, setAnimatedValue] = useState(beforeValue);

  useEffect(() => {
    if (!open) return;
    setAnimatedValue(beforeValue);
    // Animate fill after small delay
    const timer = setTimeout(() => setAnimatedValue(afterValue), 400);
    return () => clearTimeout(timer);
  }, [open, beforeValue, afterValue]);

  const beforePct = Math.min((beforeValue / threshold) * 100, 100);
  const afterPct = Math.min((animatedValue / threshold) * 100, 100);
  const isReady = afterValue >= threshold;
  const remaining = Math.max(threshold - afterValue, 0);
  const gained = wasReset ? 0 : Math.max(afterValue - beforeValue, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow:
                "0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2)",
            }}
          >
            {/* Animated background glow */}
            <motion.div
              className="pointer-events-none absolute inset-0 -z-10"
              animate={{
                background: isReady
                  ? [
                      "radial-gradient(circle at 50% 50%, hsl(var(--accent) / 0.3), transparent 70%)",
                      "radial-gradient(circle at 50% 50%, hsl(var(--accent) / 0.5), transparent 70%)",
                      "radial-gradient(circle at 50% 50%, hsl(var(--accent) / 0.3), transparent 70%)",
                    ]
                  : "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.2), transparent 70%)",
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="mb-5 flex items-center gap-3">
              <motion.div
                animate={{
                  rotate: isReady ? [0, -10, 10, -10, 10, 0] : 0,
                  scale: isReady ? [1, 1.15, 1] : 1,
                }}
                transition={{
                  duration: isReady ? 1.5 : 0.5,
                  repeat: isReady ? Infinity : 0,
                }}
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  isReady
                    ? "bg-gradient-to-br from-accent to-amber-500"
                    : "bg-gradient-to-br from-primary to-neon-purple"
                }`}
              >
                {isReady ? (
                  <Trophy className="h-6 w-6 text-background" />
                ) : (
                  <Zap className="h-6 w-6 text-primary-foreground" />
                )}
              </motion.div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {wasReset
                    ? t("pityReset")
                    : isReady
                      ? t("pityReady")
                      : t("pityProgress")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {wasReset
                    ? t("pityResetDesc")
                    : isReady
                      ? t("pityReadyPopupDesc").replace(
                          "{tier}",
                          guaranteedTier,
                        )
                      : t("pityProgressDesc")}
                </p>
              </div>
            </div>

            {/* Counter display */}
            <div className="mb-3 flex items-end justify-between">
              <div className="flex items-baseline gap-1.5">
                <motion.span
                  key={afterValue}
                  initial={{ scale: 1.6, color: "hsl(var(--accent))" }}
                  animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="font-display text-4xl font-bold tabular-nums"
                >
                  {Math.round(animatedValue)}
                </motion.span>
                <span className="font-display text-xl text-muted-foreground">
                  / {threshold}
                </span>
              </div>
              {gained > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary"
                >
                  <Sparkles className="h-3 w-3" />
                  +{gained}
                </motion.div>
              )}
            </div>

            {/* Progress bar */}
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
              {/* Before fill (faded) */}
              <div
                className="absolute inset-y-0 left-0 bg-primary/30"
                style={{ width: `${beforePct}%` }}
              />
              {/* Animated fill */}
              <motion.div
                initial={{ width: `${beforePct}%` }}
                animate={{ width: `${afterPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                className={`absolute inset-y-0 left-0 ${
                  isReady
                    ? "bg-gradient-to-r from-accent via-amber-400 to-amber-500"
                    : "bg-gradient-to-r from-primary via-neon-purple to-neon-pink"
                }`}
              />
              {/* Shimmer */}
              <motion.div
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Status text */}
            <p
              className={`mt-3 text-center text-sm font-medium ${
                isReady ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {isReady
                ? `🎉 ${t("pityNextDrawGuaranteed").replace("{tier}", guaranteedTier)}`
                : `${remaining} ${t("moreDrawsForTierA")}`}
            </p>

            {/* Floating sparkles when ready */}
            {isReady && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{
                      x: `${20 + Math.random() * 60}%`,
                      y: "100%",
                      opacity: 0,
                    }}
                    animate={{
                      y: "-20%",
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 1.5,
                      repeat: Infinity,
                      delay: i * 0.25,
                      ease: "easeOut",
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-accent" />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Action button */}
            <Button
              onClick={onClose}
              className="mt-5 w-full"
              variant={isReady ? "gold" : "neon"}
            >
              {isReady ? t("drawNow") : t("keepDrawing")}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PityMeterPopup;
