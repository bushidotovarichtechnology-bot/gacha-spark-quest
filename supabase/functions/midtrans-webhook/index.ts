import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getMidtransConfig } from "../_shared/midtransMode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SHA-512(order_id + status_code + gross_amount + ServerKey) — Midtrans signature spec
async function sha512Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
      fraud_status,
    } = body;

    console.log("Webhook received:", { order_id, transaction_status, payment_type, fraud_status });

    if (!order_id || !transaction_status || !signature_key || !status_code || !gross_amount) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === SIGNATURE VERIFICATION ===
    // Try active mode first, then fall back to the other env (covers webhooks for legacy mode).
    const cfg = await getMidtransConfig();
    const candidateKeys = [
      cfg.serverKey,
      Deno.env.get("MIDTRANS_SERVER_KEY_SANDBOX") || "",
      Deno.env.get("MIDTRANS_SERVER_KEY_PRODUCTION") || "",
      Deno.env.get("MIDTRANS_SERVER_KEY") || "",
    ].filter((k, i, arr) => k && arr.indexOf(k) === i);

    let signatureValid = false;
    for (const key of candidateKeys) {
      const expected = await sha512Hex(`${order_id}${status_code}${gross_amount}${key}`);
      if (expected === signature_key) {
        signatureValid = true;
        break;
      }
    }
    if (!signatureValid) {
      console.error("Invalid Midtrans signature for order:", order_id);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
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

    // === SHIPPING PAYMENTS (order_id starts with "SHIP-") ===
    if (order_id.startsWith("SHIP-")) {
      const { data: claim } = await supabase
        .from("prize_claims")
        .select("id, payment_status, shipping_paid")
        .eq("shipping_order_id", order_id)
        .maybeSingle();

      if (!claim) {
        console.error("Shipping claim not found for order:", order_id);
        return new Response(JSON.stringify({ error: "Claim not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let newPaymentStatus = claim.payment_status;
      let newShippingPaid = claim.shipping_paid;

      if (status === "settlement") {
        newPaymentStatus = "paid";
        newShippingPaid = true;
      } else if (status === "deny" || status === "cancel" || status === "expire" || status === "failure") {
        newPaymentStatus = "failed";
        newShippingPaid = false;
      } else if (status === "pending") {
        newPaymentStatus = "unpaid";
        newShippingPaid = false;
      }

      if (newPaymentStatus !== claim.payment_status || newShippingPaid !== claim.shipping_paid) {
        await supabase
          .from("prize_claims")
          .update({
            payment_status: newPaymentStatus,
            shipping_paid: newShippingPaid,
          })
          .eq("id", claim.id);
        console.log(`Shipping claim ${claim.id} → payment_status=${newPaymentStatus}, shipping_paid=${newShippingPaid}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === COIN TOP-UP TRANSACTIONS ===
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

    await supabase
      .from("transactions")
      .update({ status, payment_type: payment_type || null })
      .eq("order_id", order_id);

    console.log(`Transaction ${order_id} updated to status: ${status} (was: ${tx.status})`);

    // Only credit coins on settlement and only once
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
        await supabase
          .from("user_coins")
          .insert({ user_id: tx.user_id, balance: tx.coins });
        console.log(`Created user_coins for ${tx.user_id} with balance: ${tx.coins}`);
      }

      // Fire-and-forget top-up success email
      try {
        const { data: userRes } = await supabase.auth.admin.getUserById(tx.user_id);
        const recipientEmail = userRes?.user?.email;
        const displayName =
          (userRes?.user?.user_metadata as any)?.username ||
          (userRes?.user?.user_metadata as any)?.full_name ||
          (userRes?.user?.user_metadata as any)?.name ||
          null;
        if (recipientEmail) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "topup-success",
              recipientEmail,
              idempotencyKey: `topup-success-${tx.id}`,
              templateData: {
                name: displayName,
                coins: tx.coins,
                amount: tx.amount,
                orderId: tx.order_id,
                paymentType: payment_type || tx.payment_type || "midtrans",
              },
            },
          });
        }
      } catch (emailErr) {
        console.error("Failed to send top-up success email (midtrans):", emailErr);
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
