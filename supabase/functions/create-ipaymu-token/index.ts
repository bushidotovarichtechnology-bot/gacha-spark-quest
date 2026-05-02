// Creates an iPaymu redirect-page session for top-up coin packages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getIpaymuConfig, ipaymuRequest } from "../_shared/ipaymu.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { package_id, return_url } = await req.json();
    if (!package_id || typeof package_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing package_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("coin_packages")
      .select("id, name, coins, bonus_coins, price, discount_percent, discount_start, discount_end, is_active")
      .eq("id", package_id).maybeSingle();

    if (pkgError || !pkg || !pkg.is_active) {
      return new Response(JSON.stringify({ error: "Package not found or inactive" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const startOk = !pkg.discount_start || new Date(pkg.discount_start).getTime() <= now;
    const endOk = !pkg.discount_end || new Date(pkg.discount_end).getTime() >= now;
    const discountActive = (pkg.discount_percent ?? 0) > 0 && startOk && endOk;
    const finalAmount = discountActive
      ? Math.round(pkg.price * (1 - pkg.discount_percent / 100))
      : pkg.price;
    const totalCoins = (pkg.coins ?? 0) + (pkg.bonus_coins ?? 0);

    const orderId = `IPAYMU-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const cfg = await getIpaymuConfig();
    if (!cfg.va || !cfg.apiKey) {
      return new Response(JSON.stringify({ error: `iPaymu ${cfg.mode} credentials not configured` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
    const notifyUrl = `https://${projectRef}.supabase.co/functions/v1/ipaymu-webhook`;
    const fallbackReturn = return_url || `${req.headers.get("origin") || ""}/transactions`;

    const payload = {
      product: [`${totalCoins} Gacha Coins`],
      qty: [1],
      price: [finalAmount],
      returnUrl: fallbackReturn,
      notifyUrl,
      cancelUrl: fallbackReturn,
      referenceId: orderId,
      buyerName: user.email?.split("@")[0] || "User",
      buyerEmail: user.email || "user@example.com",
      buyerPhone: "08000000000",
    };

    const { ok, data } = await ipaymuRequest<any>(cfg, "/payment", payload);
    if (!ok || data?.Status !== 200) {
      console.error("iPaymu error:", data);
      return new Response(JSON.stringify({ error: data?.Message || "Failed to create iPaymu session" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionId: string = data?.Data?.SessionID || "";
    const redirectUrl: string = data?.Data?.Url || "";

    await supabaseAdmin.from("transactions").insert({
      order_id: orderId,
      user_id: user.id,
      package_id,
      coins: totalCoins,
      amount: finalAmount,
      status: "pending",
      provider: "ipaymu",
      provider_reference: sessionId,
    });

    return new Response(
      JSON.stringify({ redirect_url: redirectUrl, session_id: sessionId, order_id: orderId, mode: cfg.mode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-ipaymu-token error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
