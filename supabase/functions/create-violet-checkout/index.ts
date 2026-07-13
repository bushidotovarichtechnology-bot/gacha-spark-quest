// Create a checkout session on Violet Media Pay (violetmediapay.com).
// STUB: Payload keys mengikuti pola gateway umum; sesuaikan dengan spec
// resmi Violet Media Pay setelah dokumentasi API dirilis / dibagikan.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getVioletConfig, violetRequest } from "../_shared/violet.ts";

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
      .eq("id", package_id)
      .maybeSingle();
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

    const orderId = `VMP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const cfg = await getVioletConfig();
    if (!cfg.apiKey || !cfg.merchantId) {
      return new Response(JSON.stringify({
        error: `Violet Media Pay ${cfg.mode} credentials not configured`,
        user_message: "Kredensial Violet Media Pay belum dikonfigurasi oleh admin.",
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
    const notifyUrl = `https://${projectRef}.supabase.co/functions/v1/violet-webhook`;
    const successReturn = return_url || `${req.headers.get("origin") || ""}/transactions`;

    // TODO: Sesuaikan skema payload berikut dengan dokumentasi Violet Media Pay.
    const payload = {
      merchant_id: cfg.merchantId,
      order_id: orderId,
      amount: finalAmount,
      currency: "IDR",
      description: `Top-up ${totalCoins} Bushido Coins`,
      customer: {
        email: user.email,
        name: user.email?.split("@")[0] || "User",
      },
      return_url: successReturn,
      cancel_url: successReturn,
      notify_url: notifyUrl,
      metadata: {
        kind: "topup",
        user_id: user.id,
        package_id,
        coins: totalCoins,
      },
    };

    const { ok, status, data } = await violetRequest<any>(cfg, "/checkout/sessions", payload);
    const redirectUrl = data?.redirect_url || data?.payment_url || data?.data?.redirect_url;
    if (!ok || !redirectUrl) {
      console.error("Violet Media Pay error:", status, data);
      const msg = data?.message || data?.error || "Failed to create Violet Media Pay session";
      return new Response(JSON.stringify({
        error: msg,
        user_message: "Gagal membuat sesi pembayaran Violet Media Pay.",
        provider_message: msg,
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin.from("transactions").insert({
      order_id: orderId,
      user_id: user.id,
      package_id,
      coins: totalCoins,
      amount: finalAmount,
      status: "pending",
      snap_token: null,
    });

    return new Response(JSON.stringify({
      provider: "violet",
      redirect_url: redirectUrl,
      order_id: orderId,
      mode: cfg.mode,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("create-violet-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
