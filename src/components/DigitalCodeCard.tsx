import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  code: string;
  prizeName?: string;
  compact?: boolean;
}

const DigitalCodeCard = ({ code, prizeName, compact = false }: Props) => {
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
      className={`rounded-lg border border-primary/40 bg-primary/5 ${compact ? "p-2" : "p-3"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <KeyRound className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} text-primary`} />
        <span className={`${compact ? "text-[10px]" : "text-xs"} font-bold uppercase tracking-wider text-primary`}>
          Kode Voucher{prizeName ? ` · ${prizeName}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <code
          className={`flex-1 truncate rounded bg-background/80 ${compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm"} font-mono font-semibold text-foreground border border-border/60`}
          title={code}
        >
          {code}
        </code>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={`shrink-0 ${compact ? "h-7 w-7" : "h-8 w-8"}`}
          onClick={handleCopy}
          aria-label="Salin kode"
        >
          {copied ? <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> : <Copy className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />}
        </Button>
      </div>
    </div>
  );
};

export default DigitalCodeCard;
