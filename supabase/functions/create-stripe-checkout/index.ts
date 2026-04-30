import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// IDR is zero-decimal in Stripe — pass amount as-is (no *100).
// https://stripe.com/docs/currencies#zero-decimal

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const body = await req.json();
    const {
      kind,
      package_id,
      claim_id,
      shipping_cost,
      shipping_method,
      prize_name,
      environment,
      return_url,
    } = body as {
      kind: "topup" | "shipping";
      package_id?: string;
      claim_id?: string;
      shipping_cost?: number;
      shipping_method?: string;
      prize_name?: string;
      environment: StripeEnv;
      return_url: string;
    };

    if (environment !== "sandbox" && environment !== "live") {
      return new Response(JSON.stringify({ error: "Invalid environment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const stripe = createStripeClient(environment);

    let amount = 0;
    let lineName = "";
    let orderId = "";
    let metadata: Record<string, string> = { user_id: user.id, kind };

    if (kind === "topup") {
      if (!package_id) {
        return new Response(JSON.stringify({ error: "Missing package_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: pkg } = await supabaseAdmin
        .from("coin_packages")
        .select("id, name, coins, bonus_coins, price, discount_percent, discount_start, discount_end, is_active")
        .eq("id", package_id)
        .maybeSingle();

      if (!pkg || !pkg.is_active) {
        return new Response(JSON.stringify({ error: "Package not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = Date.now();
      const startOk = !pkg.discount_start || new Date(pkg.discount_start).getTime() <= now;
      const endOk = !pkg.discount_end || new Date(pkg.discount_end).getTime() >= now;
      const discountActive = (pkg.discount_percent ?? 0) > 0 && startOk && endOk;
      amount = discountActive
        ? Math.round(pkg.price * (1 - pkg.discount_percent / 100))
        : pkg.price;
      const totalCoins = (pkg.coins ?? 0) + (pkg.bonus_coins ?? 0);
      lineName = `${totalCoins} Bushido Coins`;
      orderId = `GACHA-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      metadata = { ...metadata, package_id, order_id: orderId, coins: String(totalCoins) };

      await supabaseAdmin.from("transactions").insert({
        order_id: orderId,
        user_id: user.id,
        package_id,
        coins: totalCoins,
        amount,
        status: "pending",
      });
    } else if (kind === "shipping") {
      if (!claim_id || !shipping_cost || !shipping_method) {
        return new Response(JSON.stringify({ error: "Missing shipping fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify claim belongs to user
      const { data: claim } = await supabaseAdmin
        .from("prize_claims")
        .select("id, user_id")
        .eq("id", claim_id)
        .maybeSingle();
      if (!claim || claim.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Claim not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      amount = shipping_cost;
      lineName = `Ongkir ${prize_name || "Hadiah"} (${shipping_method})`.slice(0, 80);
      orderId = `SHIP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      metadata = { ...metadata, claim_id, order_id: orderId };

      await supabaseAdmin
        .from("prize_claims")
        .update({
          shipping_cost,
          shipping_order_id: orderId,
          payment_status: "unpaid",
          shipping_paid: false,
        })
        .eq("id", claim_id)
        .eq("user_id", user.id);
    } else {
      return new Response(JSON.stringify({ error: "Invalid kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount < 1) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "idr",
            product_data: { name: lineName },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: return_url,
      customer_email: user.email,
      metadata,
    });

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret, order_id: orderId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("create-stripe-checkout error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
