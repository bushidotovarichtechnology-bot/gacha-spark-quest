import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useMemo } from "react";

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
}

interface Props extends StripeCheckoutOptions {
  open: boolean;
}

export function StripeCheckoutDialog({ open, onClose, kind, ...rest }: Props) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const returnUrl =
      rest.returnUrl || `${window.location.origin}/transactions?session_id={CHECKOUT_SESSION_ID}`;
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
    return data.clientSecret;
  }, [kind, rest.package_id, rest.claim_id, rest.shipping_cost, rest.shipping_method, rest.prize_name, rest.returnUrl]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Pembayaran via Stripe</DialogTitle>
        </DialogHeader>
        <div className="px-2 pb-2">
          {open && (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
