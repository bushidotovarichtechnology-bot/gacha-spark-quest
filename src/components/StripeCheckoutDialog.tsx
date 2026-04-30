import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useMemo, useState, useEffect } from "react";

export type StripeCheckoutKind = "topup" | "shipping";

export interface StripeCheckoutOptions {
  kind: StripeCheckoutKind;
  package_id?: string;
  claim_id?: string;
  shipping_cost?: number;
  shipping_method?: string;
  prize_name?: string;
  returnUrl?: string;
  onClose: () => void;
  onLoadingChange?: (loading: boolean) => void;
  onError?: (message: string) => void;
}

interface Props extends StripeCheckoutOptions {
  open: boolean;
}

export function StripeCheckoutDialog({ open, onClose, kind, onLoadingChange, onError, ...rest }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Reset state when dialog re-opens
  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setLoading(true);
      onLoadingChange?.(true);
    } else {
      setLoading(false);
      onLoadingChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retryKey]);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const returnUrl =
      rest.returnUrl || `${window.location.origin}/transactions?session_id={CHECKOUT_SESSION_ID}`;
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: {
          kind,
          package_id: rest.package_id,
          claim_id: rest.claim_id,
          shipping_cost: rest.shipping_cost,
          shipping_method: rest.shipping_method,
          prize_name: rest.prize_name,
          environment: getStripeEnvironment(),
          return_url: returnUrl,
        },
      });
      if (error || !data?.clientSecret) {
        throw new Error(error?.message || "Gagal membuat sesi pembayaran");
      }
      // Session ready — Stripe will mount the form, hide loader
      setLoading(false);
      onLoadingChange?.(false);
      return data.clientSecret;
    } catch (err: any) {
      const msg = err?.message || "Gagal membuat sesi pembayaran";
      setErrorMsg(msg);
      setLoading(false);
      onLoadingChange?.(false);
      onError?.(msg);
      throw err;
    }
  }, [kind, rest.package_id, rest.claim_id, rest.shipping_cost, rest.shipping_method, rest.prize_name, rest.returnUrl, onLoadingChange, onError]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const handleRetry = () => {
    setErrorMsg(null);
    setLoading(true);
    onLoadingChange?.(true);
    setRetryKey((k) => k + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Pembayaran via Stripe</DialogTitle>
        </DialogHeader>
        <div className="relative px-2 pb-2 min-h-[320px]">
          {open && !errorMsg && (
            <>
              {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Menyiapkan sesi pembayaran...</p>
                </div>
              )}
              <EmbeddedCheckoutProvider key={retryKey} stripe={getStripe()} options={checkoutOptions}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </>
          )}

          {open && errorMsg && (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="font-display text-base font-semibold text-foreground">
                Gagal memuat pembayaran
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">{errorMsg}</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  Tutup
                </Button>
                <Button onClick={handleRetry} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Coba lagi
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
