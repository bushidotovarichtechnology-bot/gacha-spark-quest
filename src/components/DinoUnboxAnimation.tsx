import { useState, useCallback, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

// Detect low-end devices once (hardware concurrency, deviceMemory, or reduced motion)
const detectLowEnd = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 8;
  // @ts-expect-error - deviceMemory is non-standard but widely supported
  const memory = navigator.deviceMemory ?? 8;
  return cores <= 4 || memory <= 4;
};

interface DinoUnboxAnimationProps {
  /** Total taps required to open the box */
  requiredTaps?: number;
  /** Called when unboxing is complete */
  onComplete: () => void;
  /** Draw count label */
  drawCount: number;
  /** Tier of the prize (S/A/B/C) - affects animation intensity */
  tier?: "S" | "A" | "B" | "C";
  /** Image URL of the actual prize won (shown when box opens) */
  prizeImage?: string;
  /** Name of the prize (alt text + caption) */
  prizeName?: string;
}

// Tier-based configuration
const TIER_CONFIG = {
  S: {
    isRare: true,
    explosionCount: 60,
    explosionColors: ["#fbbf24", "#f59e0b", "#d97706", "#fcd34d", "#fff", "#f472b6", "#a78bfa"],
    screenShakeMultiplier: 3,
    flashColor: "#fbbf24",
    giftBoxColor: { main: "#fbbf24", light: "#fcd34d", ribbon: "#dc2626" },
    dinoColor: { main: "#fbbf24", dark: "#d97706" },
  },
  A: {
    isRare: true,
    explosionCount: 50,
    explosionColors: ["#a78bfa", "#8b5cf6", "#7c3aed", "#c4b5fd", "#fff", "#f472b6", "#60a5fa"],
    screenShakeMultiplier: 2.5,
    flashColor: "#a78bfa",
    giftBoxColor: { main: "#8b5cf6", light: "#a78bfa", ribbon: "#fbbf24" },
    dinoColor: { main: "#8b5cf6", dark: "#7c3aed" },
  },
  B: {
    isRare: false,
    explosionCount: 35,
    explosionColors: ["#f472b6", "#ec4899", "#db2777", "#fbcfe8", "#fff", "#a78bfa", "#60a5fa"],
    screenShakeMultiplier: 1.5,
    flashColor: "hsl(var(--accent))",
    giftBoxColor: { main: "#ec4899", light: "#f472b6", ribbon: "#fbbf24" },
    dinoColor: { main: "#4ade80", dark: "#22c55e" },
  },
  C: {
    isRare: false,
    explosionCount: 30,
    explosionColors: ["#facc15", "#a855f7", "#f472b6", "#4ade80", "#38bdf8", "#fb923c", "#fff"],
    screenShakeMultiplier: 1,
    flashColor: "hsl(var(--accent))",
    giftBoxColor: { main: "#a855f7", light: "#c084fc", ribbon: "#facc15" },
    dinoColor: { main: "#4ade80", dark: "#22c55e" },
  },
};

// 8-bit pixel art dino variants for different tiers
const createDinoSVG = (colorMain: string, colorDark: string, isBiting: boolean) => {
  if (isBiting) {
    return (
      <svg viewBox="0 0 32 32" className="w-full h-full" style={{ imageRendering: "pixelated" }}>
        {/* Body */}
        <rect x="10" y="14" width="12" height="10" fill={colorMain} />
        <rect x="8" y="16" width="2" height="6" fill={colorMain} />
        {/* Head - moved forward */}
        <rect x="18" y="6" width="10" height="10" fill={colorMain} />
        <rect x="28" y="6" width="4" height="4" fill={colorMain} />
        {/* Eye - excited */}
        <rect x="24" y="8" width="2" height="2" fill="#1a1a2e" />
        <rect x="24" y="7" width="2" height="1" fill="#fff" />
        {/* Mouth OPEN - top jaw */}
        <rect x="28" y="10" width="4" height="2" fill={colorMain} />
        {/* Mouth OPEN - bottom jaw */}
        <rect x="28" y="14" width="4" height="2" fill={colorMain} />
        {/* Teeth */}
        <rect x="28" y="12" width="1" height="1" fill="#fff" />
        <rect x="30" y="12" width="1" height="1" fill="#fff" />
        <rect x="29" y="13" width="1" height="1" fill="#fff" />
        <rect x="31" y="13" width="1" height="1" fill="#fff" />
        {/* Arms reaching */}
        <rect x="22" y="14" width="2" height="2" fill={colorDark} />
        <rect x="24" y="16" width="2" height="2" fill={colorDark} />
        {/* Legs */}
        <rect x="12" y="24" width="3" height="4" fill={colorMain} />
        <rect x="18" y="24" width="3" height="4" fill={colorMain} />
        <rect x="11" y="28" width="5" height="2" fill={colorDark} />
        <rect x="17" y="28" width="5" height="2" fill={colorDark} />
        {/* Tail */}
        <rect x="6" y="18" width="4" height="2" fill={colorMain} />
        <rect x="4" y="16" width="4" height="2" fill={colorMain} />
        {/* Spikes */}
        <rect x="12" y="12" width="2" height="2" fill={colorDark} />
        <rect x="16" y="10" width="2" height="2" fill={colorDark} />
        <rect x="14" y="12" width="2" height="2" fill={colorDark} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="w-full h-full" style={{ imageRendering: "pixelated" }}>
      {/* Body */}
      <rect x="10" y="14" width="12" height="10" fill={colorMain} />
      <rect x="8" y="16" width="2" height="6" fill={colorMain} />
      {/* Head */}
      <rect x="16" y="6" width="10" height="10" fill={colorMain} />
      <rect x="26" y="8" width="4" height="4" fill={colorMain} />
      {/* Eye */}
      <rect x="22" y="8" width="2" height="2" fill="#1a1a2e" />
      {/* Mouth closed */}
      <rect x="26" y="12" width="4" height="2" fill={colorDark} />
      {/* Arms */}
      <rect x="22" y="16" width="2" height="4" fill={colorDark} />
      {/* Legs */}
      <rect x="12" y="24" width="3" height="4" fill={colorMain} />
      <rect x="18" y="24" width="3" height="4" fill={colorMain} />
      {/* Feet */}
      <rect x="11" y="28" width="5" height="2" fill={colorDark} />
      <rect x="17" y="28" width="5" height="2" fill={colorDark} />
      {/* Tail */}
      <rect x="6" y="18" width="4" height="2" fill={colorMain} />
      <rect x="4" y="16" width="4" height="2" fill={colorMain} />
      {/* Spikes */}
      <rect x="12" y="12" width="2" height="2" fill={colorDark} />
      <rect x="16" y="10" width="2" height="2" fill={colorDark} />
      <rect x="14" y="12" width="2" height="2" fill={colorDark} />
    </svg>
  );
};

const GiftBox = memo(({ damage, colors }: { damage: number; colors: { main: string; light: string; ribbon: string } }) => {
  const crackOpacity = Math.min(damage / 3, 1);
  const shakeIntensity = damage > 0 ? 2 : 0;

  return (
    <motion.svg
      viewBox="0 0 28 28"
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
      animate={damage > 0 ? { x: [0, -shakeIntensity, shakeIntensity, 0] } : {}}
      transition={{ duration: 0.15 }}
    >
      {/* Box body */}
      <rect x="4" y="12" width="20" height="14" fill={colors.main} />
      <rect x="6" y="12" width="16" height="14" fill={colors.light} />
      {/* Box lid */}
      <rect x="2" y="8" width="24" height="4" fill={colors.main} />
      <rect x="4" y="8" width="20" height="4" fill={colors.light} />
      {/* Ribbon vertical */}
      <rect x="12" y="8" width="4" height="18" fill={colors.ribbon} />
      {/* Ribbon bow */}
      <rect x="8" y="4" width="4" height="4" fill={colors.ribbon} />
      <rect x="16" y="4" width="4" height="4" fill={colors.ribbon} />
      <rect x="12" y="6" width="4" height="2" fill={colors.ribbon} />
      {/* Cracks based on damage */}
      {damage >= 1 && (
        <>
          <rect x="8" y="14" width="2" height="1" fill="#000" opacity={crackOpacity} />
          <rect x="10" y="15" width="1" height="2" fill="#000" opacity={crackOpacity} />
        </>
      )}
      {damage >= 2 && (
        <>
          <rect x="18" y="16" width="2" height="1" fill="#000" opacity={crackOpacity} />
          <rect x="17" y="17" width="1" height="2" fill="#000" opacity={crackOpacity} />
          <rect x="6" y="20" width="1" height="2" fill="#000" opacity={crackOpacity} />
        </>
      )}
      {damage >= 3 && (
        <>
          <rect x="14" y="18" width="3" height="1" fill="#000" />
          <rect x="7" y="10" width="2" height="1" fill="#000" />
          <rect x="19" y="10" width="2" height="1" fill="#000" />
        </>
      )}
      {damage >= 4 && (
        <>
          <rect x="4" y="9" width="1" height="2" fill="#000" />
          <rect x="23" y="9" width="1" height="2" fill="#000" />
          {/* Light rays */}
          <rect x="13" y="14" width="2" height="2" fill="#fef08a" opacity={0.8} />
        </>
      )}
    </motion.svg>
  );
});
GiftBox.displayName = "GiftBox";

const Particle = memo(({ delay, x, y, color }: { delay: number; x: number; y: number; color?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
    animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x, y }}
    transition={{ duration: 0.5, delay }}
    className="absolute w-2 h-2 rounded-sm"
    style={{ imageRendering: "pixelated", backgroundColor: color || "hsl(var(--accent))" }}
  />
));
Particle.displayName = "Particle";

const ExplosionParticle = memo(({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
    animate={{ opacity: 0, scale: [1, 1.5, 0], x, y, rotate: 180 }}
    transition={{ duration: 0.7, delay, ease: "easeOut" }}
    className="absolute rounded-sm"
    style={{ width: size, height: size, backgroundColor: color, imageRendering: "pixelated" }}
  />
));
ExplosionParticle.displayName = "ExplosionParticle";

const FlashOverlay = ({ color = "hsl(var(--accent))" }: { color?: string }) => (
  <motion.div
    initial={{ opacity: 0.9 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 0.4 }}
    className="fixed inset-0 z-[60] pointer-events-none"
    style={{ backgroundColor: color }}
  />
);

const RareGlow = ({ isRare }: { isRare: boolean }) => {
  if (!isRare) return null;
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      animate={{
        boxShadow: [
          "inset 0 0 50px rgba(251, 191, 36, 0.2)",
          "inset 0 0 100px rgba(251, 191, 36, 0.4)",
          "inset 0 0 50px rgba(251, 191, 36, 0.2)",
        ],
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
};

const TierBadge = ({ tier, isRare }: { tier: string; isRare: boolean }) => {
  if (!isRare) return null;
  
  const tierEmojis: Record<string, string> = { S: "💎", A: "🥇" };
  // Use global tier tokens — read CSS variables so colors stay in sync.
  const tierVars: Record<string, string> = { S: "--tier-s", A: "--tier-a" };
  const tierVar = tierVars[tier] || "--tier-a";
  const tierColor = `hsl(var(${tierVar}))`;
  
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className="px-4 py-2 rounded-full font-bold text-white text-sm"
        style={{
          backgroundColor: tierColor,
          boxShadow: `0 0 30px ${tierColor}`,
        }}
      >
        {tierEmojis[tier]} TIER {tier} DITEMUKAN!
      </div>
    </motion.div>
  );
};

const DinoUnboxAnimation = ({
  requiredTaps = 5,
  onComplete,
  drawCount,
  tier = "C",
  prizeImage,
  prizeName,
}: DinoUnboxAnimationProps) => {
  const [taps, setTaps] = useState(0);
  const [isBiting, setIsBiting] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [screenShake, setScreenShake] = useState(0);

  const prefersReducedMotion = useReducedMotion();
  const isLowEnd = useMemo(() => detectLowEnd(), []);
  // Performance scale: 0.4 for reduced-motion, 0.6 for low-end, 1 for normal
  const perfScale = prefersReducedMotion ? 0.4 : isLowEnd ? 0.6 : 1;

  const config = TIER_CONFIG[tier] || TIER_CONFIG.C;
  const progress = Math.min(taps / requiredTaps, 1);
  const damage = Math.min(Math.floor((taps / requiredTaps) * 5), 5);

  // Generate explosion particles on complete (count scaled by device perf)
  const explosionParticles = useMemo(() => {
    if (!completed) return [];
    const count = Math.max(8, Math.floor(config.explosionCount * perfScale));
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const dist = config.isRare
        ? 80 + Math.random() * 150
        : 60 + Math.random() * 100;
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: config.isRare ? 6 + Math.random() * 10 : 4 + Math.random() * 8,
        color: config.explosionColors[Math.floor(Math.random() * config.explosionColors.length)],
        delay: Math.random() * (config.isRare ? 0.2 : 0.15),
      };
    });
  }, [completed, config, perfScale]);

  const handleTap = useCallback(() => {
    if (completed) return;

    setIsBiting(true);
    setTaps((prev) => prev + 1);

    // Skip screen shake on low-end / reduced-motion
    if (!prefersReducedMotion && !isLowEnd) {
      const shakeAmount = (2 + damage * 1.5) * config.screenShakeMultiplier;
      setScreenShake(shakeAmount);
      setTimeout(() => setScreenShake(0), 150);
    }

    // Spawn particles with tier-specific colors (scaled)
    const baseCount = config.isRare ? 6 + damage * 2 : 4 + damage;
    const particleCount = Math.max(2, Math.floor(baseCount * perfScale));
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * (80 + damage * 20) * config.screenShakeMultiplier,
      y: (Math.random() - 0.5) * (60 + damage * 15) - 20,
      color: config.explosionColors[Math.floor(Math.random() * config.explosionColors.length)],
    }));
    setParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => setIsBiting(false), 200);
    setTimeout(() => setParticles((prev) => prev.filter((p) => !newParticles.find((n) => n.id === p.id))), 600);
  }, [completed, damage, config, perfScale, prefersReducedMotion, isLowEnd]);

  useEffect(() => {
    if (taps >= requiredTaps && !completed) {
      setCompleted(true);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), config.isRare ? 600 : 400);
      setTimeout(onComplete, config.isRare ? 1500 : 1000);
    }
  }, [taps, requiredTaps, completed, onComplete, config.isRare]);

  return (
    <>
      {showFlash && <FlashOverlay color={config.flashColor} />}
      <RareGlow isRare={config.isRare} />
      <TierBadge tier={tier} isRare={config.isRare} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          x: screenShake ? [0, -screenShake, screenShake, -screenShake / 2, 0] : 0,
          y: screenShake ? [0, screenShake / 2, -screenShake, screenShake / 2, 0] : 0,
        }}
        exit={{ opacity: 0 }}
        transition={screenShake ? { duration: 0.15 } : { duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95"
        onClick={handleTap}
        style={{ cursor: "pointer" }}
      >
        <div className="flex flex-col items-center gap-4 select-none">
          {/* Tap prompt */}
          <motion.p
            animate={completed ? { scale: [1, 1.2, 1], opacity: 1 } : { opacity: [0.4, 1, 0.4] }}
            transition={completed ? { duration: 0.5 } : { duration: 1.2, repeat: Infinity }}
            className="font-display text-xs tracking-[0.2em] uppercase text-muted-foreground"
          >
            {completed 
              ? (config.isRare ? "🎉 JACKPOT! 🎉" : "💥 TERBUKA! 💥") 
              : "👆 Tap untuk menggigit!"}
          </motion.p>

          {/* Progress bar */}
          <div className="w-48 h-2 rounded-full bg-secondary overflow-hidden border border-border">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: "spring", damping: 15 }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{taps}/{requiredTaps}</span>

          {/* Animation area */}
          <div className="relative" style={{ width: 280, height: 200 }}>
            {/* Bite particles */}
            <div className="absolute inset-0 flex items-center justify-center">
              {particles.map((p) => (
                <Particle key={p.id} delay={0} x={p.x} y={p.y} color={p.color} />
              ))}
            </div>

            {/* Explosion particles on complete */}
            {completed && (
              <div className="absolute flex items-center justify-center" style={{ right: 50, bottom: 50 }}>
                {explosionParticles.map((p) => (
                  <ExplosionParticle key={p.id} x={p.x} y={p.y} size={p.size} color={p.color} delay={p.delay} />
                ))}
              </div>
            )}

            {/* Dino with tier colors */}
            <motion.div
              className="absolute"
              style={{ width: 120, height: 120, left: 10, bottom: 10 }}
              animate={
                completed
                  ? { 
                      x: 0, 
                      y: config.isRare ? [0, -25, 0, -15, 0] : [0, -15, 0], 
                      scale: config.isRare ? [1, 1.3, 1.1, 1.2, 1] : [1, 1.1, 1] 
                    }
                  : isBiting
                  ? { x: 20 }
                  : { x: 0 }
              }
              transition={
                completed
                  ? { duration: config.isRare ? 0.8 : 0.5, repeat: config.isRare ? 0 : 1 }
                  : { type: "spring", damping: 20, stiffness: 400 }
              }
            >
              {createDinoSVG(config.dinoColor.main, config.dinoColor.dark, isBiting || completed)}
            </motion.div>

            {/* Gift Box with tier colors */}
            <AnimatePresence>
              {!completed ? (
                <motion.div
                  className="absolute"
                  style={{ width: 100, height: 100, right: 20, bottom: 20 }}
                  animate={isBiting ? { rotate: [-5, 5, 0], scale: [1, 0.95, 1] } : {}}
                  transition={{ duration: 0.2 }}
                  exit={{
                    scale: config.isRare ? [1, 1.8, 0] : [1, 1.4, 0],
                    opacity: [1, 1, 0],
                    rotate: config.isRare ? [0, 30, -45] : [0, 15, -30],
                  }}
                >
                  <GiftBox damage={damage} colors={config.giftBoxColor} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0, rotate: 0, opacity: 0 }}
                  animate={{
                    scale: config.isRare ? [0, 1.6, 1.2] : [0, 1.4, 1.1],
                    rotate: config.isRare ? [0, 15, -15, 0] : [0, 10, -10, 0],
                    opacity: [0, 1, 1],
                  }}
                  transition={{ duration: config.isRare ? 0.8 : 0.6, ease: "easeOut" }}
                  className="absolute flex flex-col items-center justify-center gap-1"
                  style={{ width: 130, height: 130, right: 5, bottom: 5 }}
                >
                  {/* Glow halo behind prize */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 0.8, 0.5], scale: [0.5, 1.4, 1.2] }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    style={{
                      background: `radial-gradient(circle, ${config.flashColor}66 0%, transparent 70%)`,
                      filter: "blur(8px)",
                    }}
                  />
                  {prizeImage ? (
                    <div
                      className="relative rounded-xl overflow-hidden border-2 bg-card"
                      style={{
                        width: 110,
                        height: 110,
                        borderColor: config.giftBoxColor.main,
                        boxShadow: `0 0 30px ${config.flashColor}, 0 0 60px ${config.flashColor}80`,
                      }}
                    >
                      <img
                        src={prizeImage}
                        alt={prizeName || "Prize"}
                        className="w-full h-full object-cover"
                        style={{ imageRendering: "auto" }}
                        loading="eager"
                      />
                    </div>
                  ) : (
                    <span className="text-6xl">{config.isRare ? "🏆" : "✨"}</span>
                  )}
                  {prizeName && (
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className="relative text-[10px] font-display font-bold tracking-wider text-center text-foreground bg-background/80 px-2 py-0.5 rounded-md max-w-[120px] truncate"
                    >
                      {prizeName}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Impact ring on bite */}
            {isBiting && (
              <motion.div
                className="absolute rounded-full border-2 border-accent/50"
                style={{ right: 40, bottom: 40, width: 40, height: 40 }}
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: config.isRare ? 4 : 2.5, opacity: 0 }}
                transition={{ duration: config.isRare ? 0.4 : 0.3 }}
              />
            )}
          </div>

          {/* Draw count info */}
          <motion.p
            className="font-display text-sm tracking-widest text-muted-foreground"
          >
            {drawCount > 1 ? `🎲 Drawing ${drawCount}x...` : "🎲 Drawing..."}
          </motion.p>
        </div>
      </motion.div>
    </>
  );
};

export default DinoUnboxAnimation;