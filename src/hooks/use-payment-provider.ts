import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentProvider = "midtrans" | "stripe" | "ipaymu" | "doku";
export type IpaymuMode = "sandbox" | "production";
export type DokuMode = "sandbox" | "production";

export function usePaymentProvider() {
  const [provider, setProvider] = useState<PaymentProvider>("midtrans");
  const [ipaymuMode, setIpaymuMode] = useState<IpaymuMode>("sandbox");
  const [dokuMode, setDokuMode] = useState<DokuMode>("sandbox");
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
      const value = (data?.value as { provider?: string; active?: string; ipaymu_mode?: string; doku_mode?: string } | null) || {};
      const p = value.active || value.provider;
      setProvider(
        p === "stripe" ? "stripe" :
        p === "ipaymu" ? "ipaymu" :
        p === "doku" ? "doku" : "midtrans"
      );
      setIpaymuMode(value.ipaymu_mode === "production" ? "production" : "sandbox");
      setDokuMode(value.doku_mode === "production" ? "production" : "sandbox");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { provider, ipaymuMode, dokuMode, loading };
}
