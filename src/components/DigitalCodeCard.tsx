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
}

const DigitalCodeCard = ({ code, label, compact = false, showHeader = true }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Kode disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5",
        compact ? "p-2" : "p-3",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {showHeader && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <KeyRound className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", "text-primary")} />
          <span
            className={cn(
              compact ? "text-[10px]" : "text-xs",
              "font-bold uppercase tracking-wider text-primary",
            )}
          >
            {label ?? "Kode Voucher"}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <code
          className={cn(
            "flex-1 truncate rounded bg-background/90 font-mono font-semibold text-foreground border border-border/60 select-all",
            compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
          )}
          title={code}
        >
          {code}
        </code>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn("shrink-0", compact ? "h-7 w-7" : "h-8 w-8")}
          onClick={handleCopy}
          aria-label="Salin kode"
        >
          {copied ? (
            <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          ) : (
            <Copy className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          )}
        </Button>
      </div>
    </div>
  );
};

export default DigitalCodeCard;
