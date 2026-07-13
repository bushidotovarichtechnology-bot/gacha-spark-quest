import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getVioletConfig, violetRequest } from "../_shared/violet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { claim_id, shipping_cost, shipping_method, prize_name } = await req.json();
    if (!claim_id || !shipping_cost || !shipping_method) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cfg = await getVioletConfig();
    if (!cfg.apiKey || !cfg.merchantId) {
      return new Response(JSON.stringify({
        error: `Violet Media Pay ${cfg.mode} credentials not configured`,
        user_message: "Kredensial Violet Media Pay belum dikonfigurasi oleh admin.",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orderId = `SHIP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
    const notifyUrl = `https://${projectRef}.supabase.co/functions/v1/violet-webhook`;
    const fallbackReturn = `${req.headers.get("origin") || ""}/claims`;
    const itemName = `Ongkir ${prize_name || "Hadiah"} (${shipping_method})`.slice(0, 60);

    const payload = {
      merchant_id: cfg.merchantId,
      order_id: orderId,
      amount: shipping_cost,
      currency: "IDR",
      description: itemName,
      customer: {
        email: user.email,
        name: user.email?.split("@")[0] || "User",
      },
      return_url: fallbackReturn,
      cancel_url: fallbackReturn,
      notify_url: notifyUrl,
      metadata: {
        kind: "shipping",
        user_id: user.id,
        claim_id,
      },
    };

    const { ok, status, data } = await violetRequest<any>(cfg, "/checkout/sessions", payload);
    const redirectUrl = data?.redirect_url || data?.payment_url || data?.data?.redirect_url;
    if (!ok || !redirectUrl) {
      console.error("Violet Media Pay shipping error:", status, data);
      const msg = data?.message || data?.error || "Failed to create Violet Media Pay session";
      return new Response(JSON.stringify({
        error: msg,
        user_message: "Gagal membuat sesi pembayaran ongkir.",
        provider_message: msg,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin.from("prize_claims").update({
      shipping_cost,
      shipping_order_id: orderId,
      payment_status: "unpaid",
      shipping_paid: false,
    }).eq("id", claim_id).eq("user_id", user.id);

    return new Response(JSON.stringify({
      provider: "violet",
      redirect_url: redirectUrl,
      order_id: orderId,
      mode: cfg.mode,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("create-shipping-payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
