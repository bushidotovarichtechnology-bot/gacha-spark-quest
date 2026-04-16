import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DinoUnboxAnimationProps {
  /** Total taps required to open the box */
  requiredTaps?: number;
  /** Called when unboxing is complete */
  onComplete: () => void;
  /** Draw count label */
  drawCount: number;
}

// 8-bit pixel art as inline SVGs for instant loading
const DINO_IDLE = () => (
  <svg viewBox="0 0 32 32" className="w-full h-full" style={{ imageRendering: "pixelated" }}>
    {/* Body */}
    <rect x="10" y="14" width="12" height="10" fill="#4ade80" />
    <rect x="8" y="16" width="2" height="6" fill="#4ade80" />
    {/* Head */}
    <rect x="16" y="6" width="10" height="10" fill="#4ade80" />
    <rect x="26" y="8" width="4" height="4" fill="#4ade80" />
    {/* Eye */}
    <rect x="22" y="8" width="2" height="2" fill="#1a1a2e" />
    {/* Mouth closed */}
    <rect x="26" y="12" width="4" height="2" fill="#22c55e" />
    {/* Arms */}
    <rect x="22" y="16" width="2" height="4" fill="#22c55e" />
    {/* Legs */}
    <rect x="12" y="24" width="3" height="4" fill="#4ade80" />
    <rect x="18" y="24" width="3" height="4" fill="#4ade80" />
    {/* Feet */}
    <rect x="11" y="28" width="5" height="2" fill="#22c55e" />
    <rect x="17" y="28" width="5" height="2" fill="#22c55e" />
    {/* Tail */}
    <rect x="6" y="18" width="4" height="2" fill="#4ade80" />
    <rect x="4" y="16" width="4" height="2" fill="#4ade80" />
    {/* Spikes */}
    <rect x="12" y="12" width="2" height="2" fill="#22c55e" />
    <rect x="16" y="10" width="2" height="2" fill="#22c55e" />
    <rect x="14" y="12" width="2" height="2" fill="#22c55e" />
  </svg>
);

const DINO_BITE = () => (
  <svg viewBox="0 0 32 32" className="w-full h-full" style={{ imageRendering: "pixelated" }}>
    {/* Body */}
    <rect x="10" y="14" width="12" height="10" fill="#4ade80" />
    <rect x="8" y="16" width="2" height="6" fill="#4ade80" />
    {/* Head - moved forward */}
    <rect x="18" y="6" width="10" height="10" fill="#4ade80" />
    <rect x="28" y="6" width="4" height="4" fill="#4ade80" />
    {/* Eye - excited */}
    <rect x="24" y="8" width="2" height="2" fill="#1a1a2e" />
    <rect x="24" y="7" width="2" height="1" fill="#fff" />
    {/* Mouth OPEN - top jaw */}
    <rect x="28" y="10" width="4" height="2" fill="#4ade80" />
    {/* Mouth OPEN - bottom jaw */}
    <rect x="28" y="14" width="4" height="2" fill="#4ade80" />
    {/* Teeth */}
    <rect x="28" y="12" width="1" height="1" fill="#fff" />
    <rect x="30" y="12" width="1" height="1" fill="#fff" />
    <rect x="29" y="13" width="1" height="1" fill="#fff" />
    <rect x="31" y="13" width="1" height="1" fill="#fff" />
    {/* Arms reaching */}
    <rect x="22" y="14" width="2" height="2" fill="#22c55e" />
    <rect x="24" y="16" width="2" height="2" fill="#22c55e" />
    {/* Legs */}
    <rect x="12" y="24" width="3" height="4" fill="#4ade80" />
    <rect x="18" y="24" width="3" height="4" fill="#4ade80" />
    <rect x="11" y="28" width="5" height="2" fill="#22c55e" />
    <rect x="17" y="28" width="5" height="2" fill="#22c55e" />
    {/* Tail */}
    <rect x="6" y="18" width="4" height="2" fill="#4ade80" />
    <rect x="4" y="16" width="4" height="2" fill="#4ade80" />
    {/* Spikes */}
    <rect x="12" y="12" width="2" height="2" fill="#22c55e" />
    <rect x="16" y="10" width="2" height="2" fill="#22c55e" />
    <rect x="14" y="12" width="2" height="2" fill="#22c55e" />
  </svg>
);

const GiftBox = ({ damage }: { damage: number }) => {
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
      <rect x="4" y="12" width="20" height="14" fill="#a855f7" />
      <rect x="6" y="12" width="16" height="14" fill="#c084fc" />
      {/* Box lid */}
      <rect x="2" y="8" width="24" height="4" fill="#a855f7" />
      <rect x="4" y="8" width="20" height="4" fill="#d8b4fe" />
      {/* Ribbon vertical */}
      <rect x="12" y="8" width="4" height="18" fill="#facc15" />
      {/* Ribbon bow */}
      <rect x="8" y="4" width="4" height="4" fill="#facc15" />
      <rect x="16" y="4" width="4" height="4" fill="#facc15" />
      <rect x="12" y="6" width="4" height="2" fill="#facc15" />
      {/* Cracks based on damage */}
      {damage >= 1 && (
        <>
          <rect x="8" y="14" width="2" height="1" fill="#7c3aed" opacity={crackOpacity} />
          <rect x="10" y="15" width="1" height="2" fill="#7c3aed" opacity={crackOpacity} />
        </>
      )}
      {damage >= 2 && (
        <>
          <rect x="18" y="16" width="2" height="1" fill="#7c3aed" opacity={crackOpacity} />
          <rect x="17" y="17" width="1" height="2" fill="#7c3aed" opacity={crackOpacity} />
          <rect x="6" y="20" width="1" height="2" fill="#7c3aed" opacity={crackOpacity} />
        </>
      )}
      {damage >= 3 && (
        <>
          <rect x="14" y="18" width="3" height="1" fill="#7c3aed" />
          <rect x="7" y="10" width="2" height="1" fill="#7c3aed" />
          <rect x="19" y="10" width="2" height="1" fill="#7c3aed" />
        </>
      )}
      {damage >= 4 && (
        <>
          <rect x="4" y="9" width="1" height="2" fill="#7c3aed" />
          <rect x="23" y="9" width="1" height="2" fill="#7c3aed" />
          {/* Light rays */}
          <rect x="13" y="14" width="2" height="2" fill="#fef08a" opacity={0.8} />
        </>
      )}
    </motion.svg>
  );
};

const Particle = ({ delay, x, y, color }: { delay: number; x: number; y: number; color?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
    animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x, y }}
    transition={{ duration: 0.5, delay }}
    className="absolute w-2 h-2 rounded-sm"
    style={{ imageRendering: "pixelated", backgroundColor: color || "hsl(var(--accent))" }}
  />
);

const EXPLOSION_COLORS = [
  "#facc15", "#a855f7", "#f472b6", "#4ade80", "#38bdf8", "#fb923c", "#fff",
];

const ExplosionParticle = ({ x, y, size, color, delay }: { x: number; y: number; size: number; color: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
    animate={{ opacity: 0, scale: [1, 1.5, 0], x, y, rotate: Math.random() * 360 }}
    transition={{ duration: 0.6 + Math.random() * 0.4, delay, ease: "easeOut" }}
    className="absolute rounded-sm"
    style={{ width: size, height: size, backgroundColor: color, imageRendering: "pixelated" }}
  />
);

const FlashOverlay = () => (
  <motion.div
    initial={{ opacity: 0.9 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 0.4 }}
    className="fixed inset-0 z-[60] pointer-events-none"
    style={{ backgroundColor: "hsl(var(--accent))" }}
  />
);

const DinoUnboxAnimation = ({
  requiredTaps = 5,
  onComplete,
  drawCount,
}: DinoUnboxAnimationProps) => {
  const [taps, setTaps] = useState(0);
  const [isBiting, setIsBiting] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [screenShake, setScreenShake] = useState(0);

  const progress = Math.min(taps / requiredTaps, 1);
  const damage = Math.min(Math.floor((taps / requiredTaps) * 5), 5);

  // Generate explosion particles on complete
  const explosionParticles = useMemo(() => {
    if (!completed) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 30) * Math.PI * 2;
      const dist = 60 + Math.random() * 100;
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: 4 + Math.random() * 8,
        color: EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)],
        delay: Math.random() * 0.15,
      };
    });
  }, [completed]);

  const handleTap = useCallback(() => {
    if (completed) return;

    setIsBiting(true);
    setTaps((prev) => prev + 1);
    
    // Screen shake intensity increases with damage
    const shakeAmount = 2 + damage * 1.5;
    setScreenShake(shakeAmount);
    setTimeout(() => setScreenShake(0), 150);

    // Spawn particles with random colors
    const newParticles = Array.from({ length: 4 + damage }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * (80 + damage * 20),
      y: (Math.random() - 0.5) * (60 + damage * 15) - 20,
      color: EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)],
    }));
    setParticles((prev) => [...prev, ...newParticles]);

    setTimeout(() => setIsBiting(false), 200);
    setTimeout(() => setParticles((prev) => prev.filter((p) => !newParticles.find((n) => n.id === p.id))), 600);
  }, [completed, damage]);

  useEffect(() => {
    if (taps >= requiredTaps && !completed) {
      setCompleted(true);
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 400);
      setTimeout(onComplete, 1000);
    }
  }, [taps, requiredTaps, completed, onComplete]);

  return (
    <>
      {showFlash && <FlashOverlay />}
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
            {completed ? "💥 TERBUKA! 💥" : "👆 Tap untuk menggigit!"}
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

            {/* Dino */}
            <motion.div
              className="absolute"
              style={{ width: 120, height: 120, left: 10, bottom: 10 }}
              animate={
                completed
                  ? { x: 0, y: [0, -15, 0], scale: [1, 1.1, 1] }
                  : isBiting
                  ? { x: 20 }
                  : { x: 0 }
              }
              transition={
                completed
                  ? { duration: 0.5, repeat: 1 }
                  : { type: "spring", damping: 20, stiffness: 400 }
              }
            >
              {isBiting || completed ? <DINO_BITE /> : <DINO_IDLE />}
            </motion.div>

            {/* Gift Box */}
            <AnimatePresence>
              {!completed ? (
                <motion.div
                  className="absolute"
                  style={{ width: 100, height: 100, right: 20, bottom: 20 }}
                  animate={isBiting ? { rotate: [-5, 5, 0], scale: [1, 0.95, 1] } : {}}
                  transition={{ duration: 0.2 }}
                  exit={{
                    scale: [1, 1.4, 0],
                    opacity: [1, 1, 0],
                    rotate: [0, 15, -30],
                  }}
                >
                  <GiftBox damage={damage} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: [0, 2, 1.2], rotate: [0, 20, -20, 0], opacity: [0, 1, 1] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute flex items-center justify-center"
                  style={{ width: 100, height: 100, right: 20, bottom: 20 }}
                >
                  <span className="text-6xl">✨</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Impact ring on bite */}
            {isBiting && (
              <motion.div
                className="absolute rounded-full border-2 border-accent/50"
                style={{ right: 40, bottom: 40, width: 40, height: 40 }}
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
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
