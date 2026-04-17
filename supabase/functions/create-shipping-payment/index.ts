import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const orderId = `SHIP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!;
    const authString = btoa(`${serverKey}:`);

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
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const clientKey = Deno.env.get("MIDTRANS_CLIENT_KEY") || "";

    return new Response(
      JSON.stringify({
        token: midtransData.token,
        order_id: orderId,
        client_key: clientKey,
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
