import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  code: string;
  label?: string;
  compact?: boolean;
  showHeader?: boolean;
  /** Optional descriptor used in the success toast, e.g. "Unit #2" or "Voucher Steam". */
  unitLabel?: string;
}

const DigitalCodeCard = ({ code, label, compact = false, showHeader = true, unitLabel }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(
        unitLabel ? `${unitLabel} disalin!` : "Kode disalin ke clipboard!",
        { description: code, duration: 2000 },
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-gradient-to-br transition-all duration-300",
        copied
          ? "border-accent/70 from-accent/20 to-accent/5 ring-2 ring-accent/40 shadow-[0_0_0_4px_hsl(var(--accent)/0.08)]"
          : "border-primary/40 from-primary/10 to-primary/5",
        compact ? "p-2" : "p-3",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {showHeader && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <KeyRound
            className={cn(
              compact ? "h-3 w-3" : "h-3.5 w-3.5",
              copied ? "text-accent" : "text-primary",
            )}
          />
          <span
            className={cn(
              compact ? "text-[10px]" : "text-xs",
              "font-bold uppercase tracking-wider transition-colors",
              copied ? "text-accent" : "text-primary",
            )}
          >
            {copied ? "Tersalin" : (label ?? "Kode Voucher")}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <code
          className={cn(
            "flex-1 truncate rounded font-mono font-semibold border select-all transition-colors",
            copied
              ? "bg-accent/10 text-accent-foreground border-accent/50"
              : "bg-background/90 text-foreground border-border/60",
            compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
          )}
          title={code}
        >
          {code}
        </code>
        <Button
          type="button"
          size="icon"
          variant={copied ? "default" : "outline"}
          className={cn(
            "shrink-0 transition-all",
            copied && "bg-accent text-accent-foreground hover:bg-accent/90 scale-105",
            compact ? "h-7 w-7" : "h-8 w-8",
          )}
          onClick={handleCopy}
          aria-label={copied ? "Kode sudah disalin" : "Salin kode"}
        >
          {copied ? (
            <Check className={cn("animate-in zoom-in-50 duration-200", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          ) : (
            <Copy className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          )}
        </Button>
      </div>
    </div>
  );
};

export default DigitalCodeCard;
