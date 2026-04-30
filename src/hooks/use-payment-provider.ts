import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentProvider = "midtrans" | "stripe";

export function usePaymentProvider() {
  const [provider, setProvider] = useState<PaymentProvider>("midtrans");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "payment_provider")
        .maybeSingle();
      if (cancelled) return;
      const p = (data?.value as { provider?: string } | null)?.provider;
      setProvider(p === "stripe" ? "stripe" : "midtrans");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { provider, loading };
}
