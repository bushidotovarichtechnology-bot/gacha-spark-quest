import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getMidtransConfig } from "../_shared/midtransMode.ts";
import { getIpaymuConfig, ipaymuRequest } from "../_shared/ipaymu.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ipaymuSetupError = (message: string | undefined, mode: string) => {
  const providerMessage = message || "Failed to create iPaymu session";
  if (providerMessage.toLowerCase().includes("invalid ip")) {
    return {
      status: 424,
      body: {
        code: "IPAYMU_INVALID_IP",
        error: "IP server pembayaran belum diizinkan oleh iPaymu.",
        user_message:
          `iPaymu menolak request karena IP server Lovable Cloud belum masuk whitelist akun iPaymu ${mode}. Tambahkan IP server/API callback di dashboard iPaymu, lalu coba lagi.`,
        provider_message: providerMessage,
      },
    };
  }

  if (providerMessage.toLowerCase().includes("invalid domain")) {
    return {
      status: 424,
      body: {
        code: "IPAYMU_INVALID_DOMAIN",
        error: "Domain pembayaran belum diizinkan oleh iPaymu.",
        user_message:
          "iPaymu menolak request karena domain return/callback belum masuk whitelist. Tambahkan bushidogacha.com dan domain preview Lovable di dashboard iPaymu.",
        provider_message: providerMessage,
      },
    };
  }

  return {
    status: 502,
    body: {
      code: "IPAYMU_REQUEST_FAILED",
      error: providerMessage,
      user_message: "Gagal membuat sesi pembayaran iPaymu. Silakan coba lagi beberapa saat.",
      provider_message: providerMessage,
    },
  };
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

    const { claim_id, shipping_cost, shipping_method, prize_name } = await req.json();

    if (!claim_id || !shipping_cost || !shipping_method) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect active payment provider
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: provRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "payment_provider")
      .maybeSingle();
    const activeProvider =
      ((provRow?.value as { active?: string; provider?: string } | null)?.active ??
        (provRow?.value as { provider?: string } | null)?.provider ??
        "midtrans") as string;

    // ===== iPaymu branch =====
    if (activeProvider === "ipaymu") {
      const cfg = await getIpaymuConfig();
      if (!cfg.va || !cfg.apiKey) {
        return new Response(JSON.stringify({ error: `iPaymu ${cfg.mode} credentials not configured` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const orderId = `IPAYMU-SHIP-${claim_id}-${Date.now()}`;
      const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
      const notifyUrl = `https://${projectRef}.supabase.co/functions/v1/ipaymu-webhook`;
      const fallbackReturn = `${req.headers.get("origin") || ""}/claims`;

      const payload = {
        product: [`Ongkir ${prize_name || "Hadiah"} (${shipping_method})`.slice(0, 60)],
        qty: [1],
        price: [shipping_cost],
        returnUrl: fallbackReturn,
        notifyUrl,
        cancelUrl: fallbackReturn,
        referenceId: orderId,
        buyerName: user.email?.split("@")[0] || "User",
        buyerEmail: user.email || "user@example.com",
        buyerPhone: "08000000000",
      };

      const { ok: ipOk, data: ipData } = await ipaymuRequest<any>(cfg, "/payment", payload);
      if (!ipOk || ipData?.Status !== 200) {
        console.error("iPaymu shipping error:", ipData);
        const setupError = ipaymuSetupError(ipData?.Message, cfg.mode);
        return new Response(JSON.stringify(setupError.body), {
          status: setupError.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      return new Response(
        JSON.stringify({
          provider: "ipaymu",
          redirect_url: ipData?.Data?.Url || "",
          session_id: ipData?.Data?.SessionID || "",
          order_id: orderId,
          mode: cfg.mode,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ===== Midtrans branch (default) =====
    const orderId = `SHIP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const midtransCfg = await getMidtransConfig();
    if (!midtransCfg.serverKey) {
      return new Response(JSON.stringify({ error: `Midtrans ${midtransCfg.mode} server key not configured` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authString = btoa(`${midtransCfg.serverKey}:`);

    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: shipping_cost,
      },
      item_details: [
        {
          id: `shipping-${shipping_method}`,
          price: shipping_cost,
          quantity: 1,
          name: `Ongkir ${prize_name || "Hadiah"} (${shipping_method})`.slice(0, 50),
        },
      ],
      customer_details: {
        email: user.email,
      },
    };

    const midtransRes = await fetch(
      midtransCfg.snapUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authString}`,
        },
        body: JSON.stringify(midtransPayload),
      }
    );

    const midtransData = await midtransRes.json();

    if (!midtransRes.ok) {
      console.error("Midtrans error:", midtransData);
      return new Response(JSON.stringify({ error: "Failed to create payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the claim with shipping order info
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

    return new Response(
      JSON.stringify({
        provider: "midtrans",
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
