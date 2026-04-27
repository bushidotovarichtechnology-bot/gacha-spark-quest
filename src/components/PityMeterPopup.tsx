import { useEffect, useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Trophy } from "lucide-react";
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

const AUTO_DISMISS_MS = 3200;

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
  const statusId = useId();

  useEffect(() => {
    if (!open) return;
    setAnimatedValue(beforeValue);
    const fillTimer = setTimeout(() => setAnimatedValue(afterValue), 250);
    const dismissTimer = setTimeout(() => onClose(), AUTO_DISMISS_MS);
    return () => {
      clearTimeout(fillTimer);
      clearTimeout(dismissTimer);
    };
  }, [open, beforeValue, afterValue, onClose]);

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

  const statusText = isReady
    ? t("pityNextDrawGuaranteed").replace("{tier}", guaranteedTier)
    : `${remaining} ${t("moreDrawsForTierA")}`;

  const srSummary = wasReset
    ? `${titleText}. ${t("pityProgress")}: 0 / ${threshold}.`
    : `${titleText}. ${beforeValue} → ${afterValue} / ${threshold}. ${statusText}.`;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
        >
          <motion.div
            role="status"
            aria-live="polite"
            aria-labelledby={titleId}
            initial={{ y: -40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={onClose}
            className="pointer-events-auto relative w-full max-w-sm cursor-pointer overflow-hidden rounded-xl border border-primary/30 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md"
            style={{
              boxShadow:
                "0 0 24px hsl(var(--primary) / 0.35), 0 8px 24px hsl(var(--background) / 0.4)",
            }}
          >
            <span className="sr-only">{srSummary}</span>

            {/* Header row */}
            <div className="flex items-center gap-2.5">
              <motion.div
                aria-hidden="true"
                animate={{
                  scale: isReady ? [1, 1.15, 1] : 1,
                }}
                transition={{
                  duration: 1.2,
                  repeat: isReady ? Infinity : 0,
                }}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  isReady
                    ? "bg-gradient-to-br from-accent to-amber-500"
                    : "bg-gradient-to-br from-primary to-neon-purple"
                }`}
              >
                {isReady ? (
                  <Trophy className="h-4 w-4 text-background" />
                ) : (
                  <Zap className="h-4 w-4 text-primary-foreground" />
                )}
              </motion.div>

              <div className="min-w-0 flex-1">
                <div
                  id={titleId}
                  className="font-display text-sm font-bold text-foreground"
                >
                  {titleText}
                </div>
                <div
                  id={statusId}
                  className={`truncate text-xs ${
                    isReady ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {isReady ? `🎉 ${statusText}` : statusText}
                </div>
              </div>

              {gained > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex shrink-0 items-center gap-0.5 rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-bold text-primary"
                  aria-hidden="true"
                >
                  <Sparkles className="h-3 w-3" />
                  +{gained}
                </motion.div>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-2.5 flex items-center gap-2">
              <div
                className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={threshold}
                aria-valuenow={afterValue}
                aria-valuetext={`${afterValue} / ${threshold}`}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-primary/30"
                  style={{ width: `${beforePct}%` }}
                />
                <motion.div
                  aria-hidden="true"
                  initial={{ width: `${beforePct}%` }}
                  animate={{ width: `${afterPct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 }}
                  className={`absolute inset-y-0 left-0 ${
                    isReady
                      ? "bg-gradient-to-r from-accent via-amber-400 to-amber-500"
                      : "bg-gradient-to-r from-primary via-neon-purple to-neon-pink"
                  }`}
                />
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <span
                className="shrink-0 font-display text-xs font-bold tabular-nums text-foreground"
                aria-hidden="true"
              >
                {Math.round(animatedValue)}/{threshold}
              </span>
            </div>

            {/* Auto-dismiss timer bar */}
            <motion.div
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-0.5 bg-primary/60"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PityMeterPopup;
