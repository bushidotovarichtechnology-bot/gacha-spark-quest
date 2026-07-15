import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getVioletConfig, violetPostForm, violetSignature } from "../_shared/violet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "No authorization header" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json(401, { error: "Unauthorized" });

    const { claim_id, shipping_cost, shipping_method, prize_name, channel_payment } = await req.json();
    if (!claim_id || !shipping_cost || !shipping_method) {
      return json(400, { error: "Missing required fields" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cfg = await getVioletConfig();
    if (!cfg.apiKey || !cfg.secretKey) {
      return json(500, {
        error: `Violet Media Pay ${cfg.mode} credentials not configured`,
        user_message: "Kredensial Violet Media Pay belum dikonfigurasi oleh admin.",
      });
    }

    // ref_kode must be numeric per Violet docs. Prefix "2" distinguishes
    // shipping payments from top-ups ("1") when routing webhooks.
    const refKode = `2${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
    const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
    const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/violet-webhook`;
    const origin = req.headers.get("origin") || "";
    const redirectUrl = `${origin}/claims`;
    const itemName = `Ongkir ${prize_name || "Hadiah"} (${shipping_method})`.slice(0, 60);

    const signature = await violetSignature(cfg, refKode, shipping_cost);

    const fields: Record<string, string | number> = {
      api_key: cfg.apiKey,
      secret_key: cfg.secretKey,
      channel_payment: (channel_payment && String(channel_payment).trim()) || "QRIS",
      ref_kode: refKode,
      nominal: shipping_cost,
      cus_nama: (user.user_metadata as any)?.username || user.email?.split("@")[0] || "Customer",
      cus_email: user.email || "",
      cus_phone: (user.user_metadata as any)?.phone || "",
      produk: itemName,
      url_redirect: redirectUrl,
      url_callback: callbackUrl,
      expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      signature,
    };

    const { ok, status, data } = await violetPostForm<any>(cfg, "/create", fields);

    const paymentUrl =
      data?.data?.payment_url ||
      data?.data?.redirect_url ||
      data?.data?.checkout_url ||
      data?.data?.pay_url ||
      data?.data?.url ||
      data?.payment_url ||
      data?.redirect_url ||
      data?.checkout_url ||
      data?.url ||
      null;

    const providerOk = ok && (data?.status === true || data?.status === "success" || !!paymentUrl);
    if (!providerOk || !paymentUrl) {
      console.error("Violet Media Pay shipping create failed:", status, data);
      const msg = data?.message || data?.error || data?.data?.message || "Failed to create Violet Media Pay session";
      return json(502, {
        error: msg,
        user_message: "Gagal membuat sesi pembayaran ongkir.",
        provider_message: msg,
      });
    }

    await supabaseAdmin.from("prize_claims").update({
      shipping_cost,
      shipping_order_id: refKode,
      payment_status: "unpaid",
      shipping_paid: false,
    }).eq("id", claim_id).eq("user_id", user.id);

    return json(200, {
      provider: "violet",
      redirect_url: paymentUrl,
      order_id: refKode,
      mode: cfg.mode,
    });
  } catch (err) {
    console.error("create-shipping-payment error:", err);
    return json(500, { error: "Internal server error" });
  }
});
