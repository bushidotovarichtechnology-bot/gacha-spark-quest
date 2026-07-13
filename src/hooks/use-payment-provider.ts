import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentProvider = "violet";
export type VioletMode = "sandbox" | "production";

export function usePaymentProvider() {
  const [provider] = useState<PaymentProvider>("violet");
  const [violetMode, setVioletMode] = useState<VioletMode>("sandbox");
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
      const value = (data?.value as { violet_mode?: string } | null) || {};
      setVioletMode(value.violet_mode === "production" ? "production" : "sandbox");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { provider, violetMode, loading };
}
