import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type MidtransMode = "sandbox" | "production";

export interface MidtransConfig {
  mode: MidtransMode;
  serverKey: string;
  clientKey: string;
  snapUrl: string;
  apiUrl: string;
}

export async function getMidtransConfig(): Promise<MidtransConfig> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "midtrans_mode")
    .maybeSingle();

  const rawMode = (data?.value as { mode?: string } | null)?.mode;
  const mode: MidtransMode = rawMode === "production" ? "production" : "sandbox";

  const serverKey =
    mode === "production"
      ? Deno.env.get("MIDTRANS_SERVER_KEY_PRODUCTION") || Deno.env.get("MIDTRANS_SERVER_KEY") || ""
      : Deno.env.get("MIDTRANS_SERVER_KEY_SANDBOX") || Deno.env.get("MIDTRANS_SERVER_KEY") || "";

  const clientKey =
    mode === "production"
      ? Deno.env.get("MIDTRANS_CLIENT_KEY_PRODUCTION") || Deno.env.get("MIDTRANS_CLIENT_KEY") || ""
      : Deno.env.get("MIDTRANS_CLIENT_KEY_SANDBOX") || Deno.env.get("MIDTRANS_CLIENT_KEY") || "";

  const snapUrl =
    mode === "production"
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const apiUrl =
    mode === "production"
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";

  return { mode, serverKey, clientKey, snapUrl, apiUrl };
}
