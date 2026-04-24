import { useEffect, useState, useId } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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
  const titleId = useId();
  const descId = useId();
  const statusId = useId();

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

  const titleText = wasReset
    ? t("pityReset")
    : isReady
      ? t("pityReady")
      : t("pityProgress");

  const descText = wasReset
    ? t("pityResetDesc")
    : isReady
      ? t("pityReadyPopupDesc").replace("{tier}", guaranteedTier)
      : t("pityProgressDesc");

  const statusText = isReady
    ? t("pityNextDrawGuaranteed").replace("{tier}", guaranteedTier)
    : `${remaining} ${t("moreDrawsForTierA")}`;

  // Verbose, screen-reader-friendly summary that announces the change.
  const srSummary = wasReset
    ? `${titleText}. ${descText}. ${t("pityProgress")}: 0 / ${threshold}.`
    : `${titleText}. ${descText}. ${beforeValue} → ${afterValue} / ${threshold}. ${statusText}.`;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content
              asChild
              aria-labelledby={titleId}
              aria-describedby={descId}
              onOpenAutoFocus={(e) => {
                // Keep default focus trap, but don't yank focus to the close (X) button.
                // Radix will focus the first focusable element — the close button is first
                // in DOM but visually decorative; we want focus on the primary action.
                // Easiest: let Radix focus the content, then move to the action button.
                e.preventDefault();
                const action = document.getElementById(`${titleId}-action`);
                if (action) (action as HTMLButtonElement).focus();
              }}
            >
              <div
                className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto sm:items-center"
                style={{
                  paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)",
                  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)",
                  paddingLeft: "calc(env(safe-area-inset-left, 0px) + 1rem)",
                  paddingRight: "calc(env(safe-area-inset-right, 0px) + 1rem)",
                }}
              >
                <motion.div
                  initial={{ scale: 0.7, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 20 }}
                  transition={{ type: "spring", damping: 18, stiffness: 220 }}
                  className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl"
                  style={{
                    boxShadow:
                      "0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2)",
                  }}
                >
                  {/* Animated background glow */}
                  <motion.div
                    aria-hidden="true"
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
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      aria-label={t("close" as any) || "Close"}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </DialogPrimitive.Close>

                  {/* Screen-reader-only summary (announced once on open) */}
                  <div className="sr-only" role="status" aria-live="polite">
                    {srSummary}
                  </div>

                  {/* Header */}
                  <div className="mb-5 flex items-center gap-3">
                    <motion.div
                      aria-hidden="true"
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
                      <DialogPrimitive.Title
                        id={titleId}
                        className="font-display text-lg font-bold text-foreground"
                      >
                        {titleText}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description
                        id={descId}
                        className="text-xs text-muted-foreground"
                      >
                        {descText}
                      </DialogPrimitive.Description>
                    </div>
                  </div>

                  {/* Counter display */}
                  <div className="mb-3 flex items-end justify-between">
                    <div className="flex items-baseline gap-1.5" aria-hidden="true">
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
                        aria-label={`+${gained} ${t("pityProgress")}`}
                      >
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        +{gained}
                      </motion.div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div
                    className="relative h-4 w-full overflow-hidden rounded-full bg-secondary"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={threshold}
                    aria-valuenow={afterValue}
                    aria-valuetext={`${afterValue} / ${threshold}`}
                    aria-labelledby={titleId}
                  >
                    {/* Before fill (faded) */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-primary/30"
                      style={{ width: `${beforePct}%` }}
                    />
                    {/* Animated fill */}
                    <motion.div
                      aria-hidden="true"
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
                      aria-hidden="true"
                      className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ["-100%", "300%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  {/* Status text (visible) */}
                  <p
                    id={statusId}
                    className={`mt-3 text-center text-sm font-medium ${
                      isReady ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {isReady ? `🎉 ${statusText}` : statusText}
                  </p>

                  {/* Floating sparkles when ready */}
                  {isReady && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
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
                    id={`${titleId}-action`}
                    onClick={onClose}
                    className="mt-5 w-full"
                    variant={isReady ? "gold" : "neon"}
                    aria-describedby={statusId}
                  >
                    {isReady ? t("drawNow") : t("keepDrawing")}
                  </Button>
                </motion.div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
};

export default PityMeterPopup;
