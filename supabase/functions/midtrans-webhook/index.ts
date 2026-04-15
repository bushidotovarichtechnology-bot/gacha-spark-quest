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
    const body = await req.json();
    const { order_id, transaction_status, payment_type, fraud_status } = body;

    console.log("Webhook received:", { order_id, transaction_status, payment_type, fraud_status });

    if (!order_id || !transaction_status) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let status = transaction_status;
    if (transaction_status === "capture") {
      status = fraud_status === "accept" ? "settlement" : "deny";
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get transaction
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (!tx) {
      console.error("Transaction not found:", order_id);
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction status
    await supabase
      .from("transactions")
      .update({ status, payment_type: payment_type || null })
      .eq("order_id", order_id);

    console.log(`Transaction ${order_id} updated to status: ${status} (was: ${tx.status})`);

    // If settlement and not already credited, add coins to user
    if (status === "settlement" && tx.status !== "settlement") {
      const { data: userCoins } = await supabase
        .from("user_coins")
        .select("balance")
        .eq("user_id", tx.user_id)
        .single();

      if (userCoins) {
        const newBalance = (userCoins.balance || 0) + tx.coins;
        await supabase
          .from("user_coins")
          .update({ balance: newBalance })
          .eq("user_id", tx.user_id);
        console.log(`Credited ${tx.coins} coins to user ${tx.user_id}. New balance: ${newBalance}`);
      } else {
        // Create user_coins row if it doesn't exist
        await supabase
          .from("user_coins")
          .insert({ user_id: tx.user_id, balance: tx.coins });
        console.log(`Created user_coins for ${tx.user_id} with balance: ${tx.coins}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
