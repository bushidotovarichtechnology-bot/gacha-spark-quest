import { motion } from "framer-motion";
import { Sparkles, TrendingUp } from "lucide-react";
import { useRateUpStatus } from "@/hooks/use-rate-up-status";
import { cn } from "@/lib/utils";

interface RateUpBadgeProps {
  className?: string;
  /** When true, shows "Rate Normal" pill if user is not eligible. Default: true */
  showNormal?: boolean;
}

/**
 * Badge animasi yang menampilkan status promo "Rate Up 1.5x" untuk 100 pendaftar pertama.
 * - Tampil sebagai banner mencolok jika user berhak.
 * - Tampil sebagai pill kecil "Rate Normal" jika tidak berhak (opsional).
 */
const RateUpBadge = ({ className, showNormal = true }: RateUpBadgeProps) => {
  const { is_rate_up, multiplier, user_index, limit, ends_at, loading } = useRateUpStatus();

  if (loading) return null;

  const endsLabel = ends_at
    ? new Date(ends_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : null;

  if (is_rate_up) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn(
          "relative inline-flex flex-wrap items-center gap-2 rounded-full border border-accent/40",
          "bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20",
          "px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
          "shadow-[0_0_20px_hsl(var(--accent)/0.4)]",
          className,
        )}
      >
        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="text-accent"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </motion.span>
        <motion.span
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent"
        >
          PROMO RATE UP {multiplier}x AKTIF
        </motion.span>
        {user_index ? (
          <span className="hidden text-[10px] font-medium text-muted-foreground sm:inline">
            #{user_index}/{limit}
          </span>
        ) : null}
        {endsLabel ? (
          <span className="text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
            • s/d {endsLabel}
          </span>
        ) : null}
      </motion.div>
    );
  }

  if (!showNormal) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <TrendingUp className="h-3 w-3" />
      Rate Normal
    </span>
  );
};

export default RateUpBadge;
