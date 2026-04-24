import { useEffect, useMemo, useReducer } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

export interface DrawLoaderAnimationProps {
  /** Number of draws — affects label only. */
  drawCount: number;
  /** Resolved tier of the (first) prize. Drives glow intensity. */
  tier?: "S" | "A" | "B" | "C";
  /** Optional prize image to flash at the end. */
  prizeImage?: string;
  /** Optional prize name (used for screen readers + caption). */
  prizeName?: string;
  /**
   * Called once the full animation has played. Parent should then open
   * the result modal. The component also calls this immediately when
   * `prefers-reduced-motion` is set.
   */
  onComplete: () => void;
}

/**
 * Mobile-first, auto-playing draw loader.
 *
 * Goals:
 *  - Fast: ~1.2s on mobile, ~1.6s on desktop, ~0s with reduced-motion.
 *  - Readable: a single focal element (orb → burst → prize peek).
 *  - Accessible: role="status", aria-live="polite", aria-busy, SR text.
 *  - Themed: only design-system tokens (primary / accent / foreground).
 */
type Phase = "spin" | "burst" | "reveal";

const TIER_GLOW: Record<NonNullable<DrawLoaderAnimationProps["tier"]>, string> = {
  S: "hsl(var(--accent))",
  A: "hsl(var(--primary))",
  B: "hsl(var(--accent))",
  C: "hsl(var(--primary))",
};

const PHASE_DURATIONS_MS = {
  // Mobile-first, snappy.
  spin: 600,
  burst: 350,
  reveal: 500,
} as const;

const TOTAL_MS =
  PHASE_DURATIONS_MS.spin + PHASE_DURATIONS_MS.burst + PHASE_DURATIONS_MS.reveal;

function phaseReducer(state: Phase, action: Phase): Phase {
  return action;
}

const DrawLoaderAnimation = ({
  drawCount,
  tier = "C",
  prizeImage,
  prizeName,
  onComplete,
}: DrawLoaderAnimationProps) => {
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useReducer(phaseReducer, "spin");

  const glow = TIER_GLOW[tier];
  const isRare = tier === "S" || tier === "A";

  const label = useMemo(
    () =>
      drawCount > 1
        ? `Menarik ${drawCount} hadiah, mohon tunggu`
        : "Menarik hadiah, mohon tunggu",
    [drawCount],
  );

  // Autoplay timeline. Reduced-motion: skip straight to onComplete.
  useEffect(() => {
    if (prefersReducedMotion) {
      onComplete();
      return;
    }
    const t1 = window.setTimeout(() => setPhase("burst"), PHASE_DURATIONS_MS.spin);
    const t2 = window.setTimeout(
      () => setPhase("reveal"),
      PHASE_DURATIONS_MS.spin + PHASE_DURATIONS_MS.burst,
    );
    const t3 = window.setTimeout(onComplete, TOTAL_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [onComplete, prefersReducedMotion]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      // --- Accessibility ---
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      {/* Visually-hidden text for screen readers */}
      <span className="sr-only">{label}</span>

      <div className="flex flex-col items-center gap-5 select-none px-6">
        {/* Caption */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground"
        >
          {drawCount > 1 ? `Menarik ${drawCount}x...` : "Menarik..."}
        </motion.p>

        {/* Focal orb / prize stage — single readable element */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: 180, height: 180 }}
          aria-hidden="true"
        >
          {/* Pulsing halo */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${glow}55 0%, transparent 70%)`,
              filter: "blur(12px)",
            }}
            animate={
              phase === "spin"
                ? { scale: [0.85, 1.05, 0.85], opacity: [0.5, 0.9, 0.5] }
                : phase === "burst"
                  ? { scale: 1.6, opacity: 1 }
                  : { scale: 1.3, opacity: 0.8 }
            }
            transition={{
              duration: phase === "spin" ? 0.6 : 0.35,
              repeat: phase === "spin" ? Infinity : 0,
              ease: "easeInOut",
            }}
          />

          <AnimatePresence mode="wait">
            {phase === "spin" && (
              <motion.div
                key="spin"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  rotate: 360,
                }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{
                  scale: { duration: 0.3 },
                  opacity: { duration: 0.2 },
                  rotate: { duration: 1, repeat: Infinity, ease: "linear" },
                }}
                className="relative flex h-24 w-24 items-center justify-center rounded-full border-2"
                style={{
                  borderColor: glow,
                  boxShadow: `0 0 24px ${glow}`,
                }}
              >
                <Sparkles className="h-10 w-10 text-foreground" />
              </motion.div>
            )}

            {phase === "burst" && (
              <motion.div
                key="burst"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.4, 1], opacity: [0, 1, 1] }}
                exit={{ scale: 1.1, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative flex h-28 w-28 items-center justify-center rounded-full"
                style={{
                  background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
                  boxShadow: `0 0 60px ${glow}`,
                }}
              />
            )}

            {phase === "reveal" && (
              <motion.div
                key="reveal"
                initial={{ scale: 0.6, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  damping: 14,
                  stiffness: 220,
                }}
                className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 bg-card"
                style={{
                  borderColor: glow,
                  boxShadow: `0 0 28px ${glow}, 0 0 56px ${glow}80`,
                }}
              >
                {prizeImage ? (
                  <img
                    src={prizeImage}
                    alt={prizeName || "Hadiah"}
                    className="h-full w-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <Sparkles className="h-12 w-12 text-accent" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Determinate-ish progress bar — gives a clear "almost done" cue */}
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: TOTAL_MS / 1000, ease: "easeInOut" }}
          />
        </div>

        {prizeName && phase === "reveal" && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.25 }}
            className="max-w-[14rem] truncate text-center font-display text-xs font-bold tracking-wider text-foreground"
            aria-hidden="true"
          >
            {prizeName}
          </motion.p>
        )}

        {/* Tier hint */}
        {isRare && phase !== "spin" && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-full border border-accent/40 bg-accent/10 px-3 py-0.5 text-[10px] font-bold tracking-widest text-accent"
            aria-hidden="true"
          >
            TIER {tier} ✦
          </motion.span>
        )}
      </div>
    </motion.div>
  );
};

export default DrawLoaderAnimation;
