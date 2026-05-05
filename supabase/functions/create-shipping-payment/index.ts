import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getMidtransConfig } from "../_shared/midtransMode.ts";
import { getIpaymuConfig, getIpaymuProviderError, ipaymuRequest } from "../_shared/ipaymu.ts";
import { getDokuConfig, dokuRequest } from "../_shared/doku.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
        const setupError = getIpaymuProviderError(ipData?.Message, cfg.mode);
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

    // ===== DOKU branch =====
    if (activeProvider === "doku") {
      const cfg = await getDokuConfig();
      if (!cfg.clientId || !cfg.secretKey) {
        return new Response(JSON.stringify({ error: `DOKU ${cfg.mode} credentials not configured` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const orderId = `DOKU-SHIP-${claim_id}-${Date.now()}`;
      const fallbackReturn = `${req.headers.get("origin") || ""}/claims`;
      const itemName = `Ongkir ${prize_name || "Hadiah"} (${shipping_method})`.slice(0, 60);

      const payload = {
        order: {
          amount: shipping_cost,
          invoice_number: orderId,
          currency: "IDR",
          callback_url: fallbackReturn,
          line_items: [{ name: itemName, price: shipping_cost, quantity: 1 }],
        },
        payment: { payment_due_date: 60 },
        customer: {
          name: user.email?.split("@")[0] || "User",
          email: user.email || "user@example.com",
        },
      };

      const { ok: dOk, status: dStatus, data: dData } = await dokuRequest<any>(cfg, "/checkout/v1/payment", payload);
      if (!dOk || !dData?.response?.payment?.url) {
        console.error("DOKU shipping error:", dStatus, dData);
        const msg = dData?.message || dData?.error?.message || "Failed to create DOKU session";
        return new Response(JSON.stringify({
          error: msg, user_message: "Gagal membuat sesi pembayaran DOKU.", provider_message: msg,
        }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabaseAdmin
        .from("prize_claims")
        .update({ shipping_cost, shipping_order_id: orderId, payment_status: "unpaid", shipping_paid: false })
        .eq("id", claim_id).eq("user_id", user.id);

      return new Response(JSON.stringify({
        provider: "doku",
        redirect_url: dData.response.payment.url,
        session_id: dData.response?.order?.session_id || "",
        order_id: orderId,
        mode: cfg.mode,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
