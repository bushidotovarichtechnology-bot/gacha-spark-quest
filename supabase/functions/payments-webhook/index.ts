import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const meta = session.metadata || {};
  const kind = meta.kind;
  const orderId = meta.order_id;
  const userId = meta.user_id;

  if (!orderId || !userId) {
    console.warn("Stripe checkout completed without order metadata", session.id);
    return;
  }

  const supabase = getSupabase();

  if (kind === "topup") {
    // Update transaction → settlement, credit coins (idempotent)
    const { data: tx } = await supabase
      .from("transactions")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (!tx) {
      console.error("Transaction not found for order:", orderId);
      return;
    }
    if (tx.status === "settlement") {
      console.log("Transaction already settled:", orderId);
      return;
    }

    await supabase
      .from("transactions")
      .update({ status: "settlement", payment_type: "stripe" })
      .eq("order_id", orderId);

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
      await supabase.from("user_coins").insert({ user_id: tx.user_id, balance: tx.coins });
    }
    console.log(`Stripe topup settled ${orderId}, +${tx.coins} coins for ${tx.user_id} (env=${env})`);

    // Top-up success email
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
              paymentType: "stripe",
            },
          },
        });
      }
    } catch (emailErr) {
      console.error("Failed to send top-up success email (stripe):", emailErr);
    }
  } else if (kind === "shipping") {
    const claimId = meta.claim_id;
    if (!claimId) return;
    await supabase
      .from("prize_claims")
      .update({ payment_status: "paid", shipping_paid: true })
      .eq("id", claimId)
      .eq("shipping_order_id", orderId);
    console.log(`Stripe shipping paid for claim ${claimId} (env=${env})`);
  }
}

async function handleCheckoutFailed(session: any) {
  const meta = session.metadata || {};
  const kind = meta.kind;
  const orderId = meta.order_id;
  if (!orderId) return;

  const supabase = getSupabase();
  if (kind === "topup") {
    await supabase
      .from("transactions")
      .update({ status: "failure", payment_type: "stripe" })
      .eq("order_id", orderId)
      .neq("status", "settlement");
  } else if (kind === "shipping") {
    const claimId = meta.claim_id;
    if (!claimId) return;
    await supabase
      .from("prize_claims")
      .update({ payment_status: "failed", shipping_paid: false })
      .eq("id", claimId)
      .eq("shipping_order_id", orderId);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "transaction.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
      case "transaction.payment_failed":
        await handleCheckoutFailed(event.data.object);
        break;
      default:
        console.log("Unhandled Stripe event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Webhook error:", e?.message || e);
    return new Response("Webhook error", { status: 400 });
  }
});
