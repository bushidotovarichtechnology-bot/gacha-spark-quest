import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, Terminal } from "lucide-react";
import { toast } from "sonner";
import { setSecurityPin } from "@/lib/tradeApi";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after PIN is successfully set (or confirmed). */
  onReady: () => void;
  /** Title override; default targets first-time setup. */
  title?: string;
}

/**
 * Setup-only PIN dialog: collects a 6-digit PIN, asks for confirmation,
 * then stores it via the `set_security_pin` RPC (bcrypt-hashed server-side).
 */
const SecurityPinDialog = ({ open, onOpenChange, onReady, title }: Props) => {
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("enter");
    setPin("");
    setConfirmPin("");
    setSubmitting(false);
  };

  const handleNext = () => {
    if (pin.length !== 6) {
      toast.error("PIN harus 6 digit");
      return;
    }
    setStep("confirm");
  };

  const handleSubmit = async () => {
    if (confirmPin !== pin) {
      toast.error("PIN tidak cocok", { description: "Pastikan kamu mengetik ulang PIN yang sama." });
      setConfirmPin("");
      return;
    }
    setSubmitting(true);
    try {
      await setSecurityPin(pin);
      toast.success("Security PIN aktif", {
        description: "PIN tersimpan dengan aman (hash bcrypt). Selalu jaga kerahasiaannya.",
      });
      reset();
      onOpenChange(false);
      onReady();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan PIN";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="border-hacker bg-hacker-surface font-mono-hacker text-foreground sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-md border-hacker border bg-hacker-bg">
            <ShieldCheck className="h-6 w-6 text-hacker-green text-glow-hacker" />
          </div>
          <DialogTitle className="text-center text-base font-semibold uppercase tracking-wider text-hacker-green text-glow-hacker">
            {title ?? "Setup Security PIN"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            <span className="text-hacker-green">$</span> initiating handshake auth…
            <br />
            PIN 6 digit ini wajib dimasukkan setiap kali kamu mengeksekusi <b>trade</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border-hacker border bg-hacker-bg p-3 text-[11px] text-hacker-green/80">
            <Terminal className="mr-1 inline h-3 w-3" />
            {step === "enter" ? "[1/2] Masukkan PIN baru" : "[2/2] Konfirmasi PIN"}
            <span className="animate-hacker-blink">_</span>
          </div>

          <div className="flex justify-center">
            {step === "enter" ? (
              <InputOTP
                maxLength={6}
                value={pin}
                onChange={setPin}
                disabled={submitting}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                aria-label="Security PIN baru"
                name="security-pin-new"
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      masked
                      className="border-hacker bg-hacker-bg font-mono-hacker text-hacker-green"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            ) : (
              <InputOTP
                maxLength={6}
                value={confirmPin}
                onChange={setConfirmPin}
                disabled={submitting}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                aria-label="Konfirmasi Security PIN"
                name="security-pin-confirm"
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      masked
                      className="border-hacker bg-hacker-bg font-mono-hacker text-hacker-green"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            )}
          </div>

          <div className="flex gap-2">
            {step === "confirm" && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-hacker bg-hacker-bg text-xs uppercase text-hacker-green hover:bg-hacker-bg/70"
                onClick={() => {
                  setConfirmPin("");
                  setStep("enter");
                }}
                disabled={submitting}
              >
                ← back
              </Button>
            )}
            <Button
              type="button"
              className="flex-1 bg-hacker-green text-hacker-bg hover:bg-hacker-green/90 font-mono-hacker text-xs uppercase tracking-wider"
              onClick={step === "enter" ? handleNext : handleSubmit}
              disabled={submitting || (step === "enter" ? pin.length !== 6 : confirmPin.length !== 6)}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> committing…
                </>
              ) : step === "enter" ? (
                "next →"
              ) : (
                "git commit -m \"set pin\""
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityPinDialog;
