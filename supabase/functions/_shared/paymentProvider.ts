import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type PaymentProvider = "midtrans" | "stripe";

export async function getActivePaymentProvider(): Promise<PaymentProvider> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "payment_provider")
      .maybeSingle();
    const provider = (data?.value as { provider?: string } | null)?.provider;
    return provider === "stripe" ? "stripe" : "midtrans";
  } catch (e) {
    console.error("Failed to read payment_provider setting:", e);
    return "midtrans";
  }
}
