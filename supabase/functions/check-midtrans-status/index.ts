import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { getMidtransConfig } from "../_shared/midtransMode.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("order_id", order_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tx.status === "settlement") {
      return new Response(JSON.stringify({ success: true, status: "settlement", credited: false, already: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const midtransCfg = await getMidtransConfig();
    const serverKey = midtransCfg.serverKey?.trim();
    if (!serverKey) {
      return new Response(JSON.stringify({ success: false, status: tx.status, credited: false, retriable: false, error: "midtrans_server_key_missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${serverKey}:`);
    const baseUrl = midtransCfg.apiUrl;

    const resp = await fetch(`${baseUrl}/${order_id}/status`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      const errText = await resp.text();

      if (resp.status === 401) {
        console.warn("Midtrans status unavailable for current credentials", { order_id, status: resp.status });
        return new Response(JSON.stringify({
          success: false,
          status: tx.status,
          credited: false,
          retriable: false,
          error: "midtrans_credentials_mismatch",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.error("Midtrans status error:", resp.status, errText);
      return new Response(JSON.stringify({
        success: false,
        status: tx.status,
        credited: false,
        retriable: true,
        error: "midtrans_status_unavailable",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let status = data.transaction_status as string;
    const fraud = data.fraud_status as string | undefined;
    const paymentType = data.payment_type as string | undefined;

    if (status === "capture") {
      status = fraud === "accept" ? "settlement" : "deny";
    }

    await supabase
      .from("transactions")
      .update({ status, payment_type: paymentType ?? tx.payment_type ?? null })
      .eq("order_id", order_id);

    let credited = false;
    if (status === "settlement" && tx.status !== "settlement") {
      const { data: userCoins } = await supabase
        .from("user_coins")
        .select("balance")
        .eq("user_id", tx.user_id)
        .maybeSingle();

      if (userCoins) {
        await supabase
          .from("user_coins")
          .update({ balance: (userCoins.balance || 0) + tx.coins })
          .eq("user_id", tx.user_id);
      } else {
        await supabase
          .from("user_coins")
          .insert({ user_id: tx.user_id, balance: tx.coins });
      }

      credited = true;
      console.log(`Credited ${tx.coins} coins for order ${order_id} via status check`);
    }

    return new Response(JSON.stringify({ success: true, status, credited, retriable: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-midtrans-status error:", err);
    return new Response(JSON.stringify({
      success: false,
      credited: false,
      retriable: true,
      error: "internal_server_error",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
