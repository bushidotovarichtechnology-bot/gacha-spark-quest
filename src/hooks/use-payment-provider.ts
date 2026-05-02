import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentProvider = "midtrans" | "stripe" | "ipaymu";
export type IpaymuMode = "sandbox" | "production";

export function usePaymentProvider() {
  const [provider, setProvider] = useState<PaymentProvider>("midtrans");
  const [ipaymuMode, setIpaymuMode] = useState<IpaymuMode>("sandbox");
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
      const value = (data?.value as { provider?: string; active?: string; ipaymu_mode?: string } | null) || {};
      // Support both legacy `provider` and new `active`
      const p = value.active || value.provider;
      setProvider(p === "stripe" ? "stripe" : p === "ipaymu" ? "ipaymu" : "midtrans");
      setIpaymuMode(value.ipaymu_mode === "production" ? "production" : "sandbox");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { provider, ipaymuMode, loading };
}
