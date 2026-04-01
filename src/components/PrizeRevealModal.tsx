import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Gift, Award, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrizeRevealModalProps {
  open: boolean;
  onClose: () => void;
  prize: { tier: string; color: string; prize: string } | null;
  drawCount: number;
}

const tierConfig: Record<string, { gradient: string; glow: string; icon: typeof Crown; emoji: string }> = {
  S: { gradient: "from-accent via-yellow-400 to-accent", glow: "box-glow-gold", icon: Crown, emoji: "👑" },
  A: { gradient: "from-primary via-purple-400 to-primary", glow: "box-glow-purple", icon: Star, emoji: "⭐" },
  B: { gradient: "from-pink-500 via-rose-400 to-pink-500", glow: "", icon: Gift, emoji: "🎁" },
  C: { gradient: "from-muted-foreground via-gray-400 to-muted-foreground", glow: "", icon: Award, emoji: "📦" },
};

const PrizeRevealModal = ({ open, onClose, prize, drawCount }: PrizeRevealModalProps) => {
  if (!prize) return null;
  const config = tierConfig[prize.tier] || tierConfig.C;
  const isRare = prize.tier === "S" || prize.tier === "A";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: 90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-6 text-center ${config.glow}`}
          >
            {/* Close button */}
            <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>

            {/* Confetti-like particles for rare */}
            {isRare && (
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

            {/* Tier badge */}
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

            {/* Result text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="mb-1 font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {drawCount > 1 ? `${drawCount}x Draw Result` : "You Drew"}
              </p>
              <h2 className={`mb-2 font-display text-lg font-black ${isRare ? "text-glow-gold text-accent" : "text-foreground"}`}>
                {prize.tier === "S" ? "🔥 GRAND PRIZE 🔥" : `Tier ${prize.tier}`}
              </h2>
              <p className="mb-6 text-base font-semibold text-foreground">{prize.prize}</p>

              <Button variant={isRare ? "gold" : "neon"} onClick={onClose} className="w-full">
                {isRare ? "Claim Reward!" : "Continue"}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrizeRevealModal;
