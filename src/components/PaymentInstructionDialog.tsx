import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Clock, QrCode, Landmark, Wallet, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export type PaymentInstruction = {
  qr_string?: string | null;
  qr_image_url?: string | null;
  va_number?: string | null;
  va_bank?: string | null;
  expired_at?: string | number | null;
  payment_url?: string | null;
};

export type PaymentInstructionData = {
  order_id: string;
  amount: number;
  channel: string;
  instruction: PaymentInstruction;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

const CHANNEL_KIND = (ch: string): "qris" | "va" | "ewallet" | "card" | "redirect" => {
  const c = (ch || "").toUpperCase().replace(/[\s_-]/g, "");
  if (c.includes("QRIS") || c === "QR") return "qris";
  if (c.includes("VA") || ["BCA", "BNI", "BRI", "MANDIRI", "PERMATA", "CIMB", "BSI", "DANAMON", "OCBC", "SINARMAS", "PANIN", "MAYBANK", "BNC", "SAMPOERNA", "ARTAGRAHA", "ATMBERSAMA"].some((b) => c.includes(b))) return "va";
  if (["OVO", "DANA", "SHOPEEPAY", "LINKAJA", "GOPAY"].some((w) => c.includes(w))) return "ewallet";
  if (c.includes("CARD") || c.includes("CC") || c.includes("CREDIT")) return "card";
  return "redirect";
};

const KIND_META: Record<string, { icon: React.ComponentType<any>; label: string }> = {
  qris: { icon: QrCode, label: "QRIS" },
  va: { icon: Landmark, label: "Virtual Account" },
  ewallet: { icon: Wallet, label: "E-Wallet" },
  card: { icon: CreditCard, label: "Kartu Kredit" },
  redirect: { icon: ExternalLink, label: "Pembayaran" },
};

const useCountdown = (endTime: string | number | null | undefined) => {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!endTime) return;
    const end = typeof endTime === "number"
      ? (endTime < 10_000_000_000 ? endTime * 1000 : endTime)
      : new Date(endTime).getTime();
    if (Number.isNaN(end)) return;
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setLabel("Kedaluwarsa"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(h > 0 ? `${h}j ${m}m ${s}d` : `${m}m ${s}d`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return label;
};

const CopyButton = ({ value }: { value: string }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast({ title: "Tersalin", description: "Nomor berhasil disalin." });
          setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="ml-1">{copied ? "Tersalin" : "Salin"}</span>
    </Button>
  );
};

export const PaymentInstructionDialog = ({
  data,
  open,
  onOpenChange,
  onFinish,
}: {
  data: PaymentInstructionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish?: () => void;
}) => {
  const kind = data ? CHANNEL_KIND(data.channel) : "redirect";
  const meta = KIND_META[kind];
  const countdown = useCountdown(data?.instruction?.expired_at);
  const Icon = meta.icon;

  if (!data) return null;
  const { instruction, amount, order_id } = data;

  // Generate QR image from qr_string if only string given.
  const qrImgSrc = instruction.qr_image_url
    || (instruction.qr_string
      ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(instruction.qr_string)}`
      : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-foreground">
            <Icon className="h-5 w-5 text-primary" />
            Instruksi Pembayaran {meta.label}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Selesaikan pembayaran sebelum kedaluwarsa. Koin akan otomatis masuk setelah pembayaran terverifikasi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-secondary p-3 text-center">
            <div className="text-xs text-muted-foreground">Total Pembayaran</div>
            <div className="font-display text-2xl font-bold text-foreground">{formatRupiah(amount)}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">ID Transaksi: {order_id}</div>
            {countdown && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Clock className="h-3 w-3" /> Kedaluwarsa dalam {countdown}
              </div>
            )}
          </div>

          {kind === "qris" && (
            <div className="space-y-2 text-center">
              {qrImgSrc ? (
                <img
                  src={qrImgSrc}
                  alt="QRIS Code"
                  className="mx-auto h-64 w-64 rounded-lg border border-border bg-white p-2"
                />
              ) : instruction.payment_url ? (
                <div className="overflow-hidden rounded-lg border border-border bg-white">
                  <iframe
                    src={instruction.payment_url}
                    title="QRIS Payment"
                    className="h-[420px] w-full"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-secondary">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Scan QR di atas dengan aplikasi bank atau e-wallet yang mendukung QRIS.
              </p>
              {instruction.payment_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={instruction.payment_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Buka di tab baru
                  </a>
                </Button>
              )}
            </div>
          )}

          {kind === "va" && instruction.va_number && (
            <div className="space-y-2">
              <div className="rounded-lg border border-border bg-secondary p-4">
                {instruction.va_bank && (
                  <div className="text-xs text-muted-foreground">Bank</div>
                )}
                {instruction.va_bank && (
                  <div className="font-medium text-foreground">{instruction.va_bank}</div>
                )}
                <div className="mt-2 text-xs text-muted-foreground">Nomor Virtual Account</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-lg font-bold tracking-wider text-foreground break-all">
                    {instruction.va_number}
                  </div>
                  <CopyButton value={String(instruction.va_number)} />
                </div>
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Buka aplikasi mobile banking atau ATM.</li>
                <li>Pilih menu Transfer / Virtual Account.</li>
                <li>Masukkan nomor VA di atas dan konfirmasi jumlah.</li>
                <li>Selesaikan pembayaran sesuai instruksi bank.</li>
              </ol>
            </div>
          )}

          {(kind === "ewallet" || kind === "card" || kind === "redirect") && instruction.payment_url && (
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                {kind === "card"
                  ? "Anda akan diarahkan ke halaman pembayaran kartu."
                  : "Anda akan diarahkan ke aplikasi/halaman e-wallet."}
              </p>
              <Button variant="gold" className="w-full" asChild>
                <a href={instruction.payment_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Lanjutkan Pembayaran
                </a>
              </Button>
            </div>
          )}

          <div className="rounded-md border border-dashed border-border p-2 text-center text-xs text-muted-foreground">
            Status pembayaran akan diperbarui otomatis. Anda dapat menutup dialog ini dan cek riwayat transaksi.
          </div>

          <Button variant="outline" className="w-full" onClick={() => { onFinish?.(); onOpenChange(false); }}>
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentInstructionDialog;
