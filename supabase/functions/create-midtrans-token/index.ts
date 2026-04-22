import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getMidtransConfig } from "../_shared/midtransMode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { package_id } = await req.json();

    if (!package_id || typeof package_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing package_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client to read package authoritatively (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("coin_packages")
      .select("id, name, coins, bonus_coins, price, discount_percent, discount_start, discount_end, is_active")
      .eq("id", package_id)
      .maybeSingle();

    if (pkgError || !pkg || !pkg.is_active) {
      return new Response(JSON.stringify({ error: "Package not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute final price server-side, applying any active discount window
    const now = Date.now();
    const startOk = !pkg.discount_start || new Date(pkg.discount_start).getTime() <= now;
    const endOk = !pkg.discount_end || new Date(pkg.discount_end).getTime() >= now;
    const discountActive = (pkg.discount_percent ?? 0) > 0 && startOk && endOk;
    const finalAmount = discountActive
      ? Math.round(pkg.price * (1 - pkg.discount_percent / 100))
      : pkg.price;
    const totalCoins = (pkg.coins ?? 0) + (pkg.bonus_coins ?? 0);

    const orderId = `GACHA-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
...
    await supabaseAdmin.from("transactions").insert({
      order_id: orderId,
      user_id: user.id,
      package_id,
      coins: totalCoins,
      amount: finalAmount,
      status: "pending",
      snap_token: midtransData.token,
    });

    return new Response(
      JSON.stringify({ 
        token: midtransData.token, 
        order_id: orderId,
        client_key: midtransCfg.clientKey,
        mode: midtransCfg.mode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
