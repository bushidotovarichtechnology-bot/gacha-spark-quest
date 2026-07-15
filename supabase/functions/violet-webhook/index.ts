// Webhook handler for Violet Media Pay.
// STUB: Field names (status, order_id, dll) mengikuti pola gateway umum;
// sesuaikan dengan dokumentasi resmi Violet Media Pay.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { verifyVioletWebhook } from "../_shared/violet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map provider status string → internal transaction status.
function mapStatus(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (["paid", "success", "successful", "settlement", "completed", "capture"].includes(s)) return "settlement";
  if (["failed", "failure", "deny", "denied"].includes(s)) return "deny";
  if (["cancel", "cancelled", "canceled"].includes(s)) return "cancel";
  if (["expire", "expired"].includes(s)) return "expire";
  if (["pending", "waiting"].includes(s)) return "pending";
  return s || "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const signatureOk = await verifyVioletWebhook({ headers: req.headers, rawBody });
    if (!signatureOk) {
      console.error("Invalid Violet Media Pay webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(rawBody || "{}");
    // TODO: sesuaikan dengan struktur payload Violet Media Pay
    const orderId: string = body.order_id || body.reference_id || body.data?.order_id;
    const rawStatus: string = body.status || body.transaction_status || body.data?.status;
    const paymentType: string | undefined = body.payment_method || body.payment_type || body.data?.payment_method;

    if (!orderId || !rawStatus) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = mapStatus(rawStatus);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // === Shipping payments (order_id starts with "SHIP-") ===
    if (orderId.startsWith("SHIP-")) {
      const { data: claim } = await supabase
        .from("prize_claims")
        .select("id, payment_status, shipping_paid")
        .eq("shipping_order_id", orderId)
        .maybeSingle();
      if (!claim) {
        return new Response(JSON.stringify({ error: "Claim not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let newPaymentStatus = claim.payment_status;
      let newShippingPaid = claim.shipping_paid;
      if (status === "settlement") { newPaymentStatus = "paid"; newShippingPaid = true; }
      else if (["deny", "cancel", "expire"].includes(status)) { newPaymentStatus = "failed"; newShippingPaid = false; }
      else if (status === "pending") { newPaymentStatus = "unpaid"; newShippingPaid = false; }

      if (newPaymentStatus !== claim.payment_status || newShippingPaid !== claim.shipping_paid) {
        await supabase.from("prize_claims").update({
          payment_status: newPaymentStatus, shipping_paid: newShippingPaid,
        }).eq("id", claim.id);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tx first (needed for email context / user_id lookup).
    const { data: tx } = await supabase
      .from("transactions").select("*").eq("order_id", orderId).maybeSingle();
    if (!tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomic settlement — server-side function guarantees single credit even
    // under concurrent webhook/status-check races.
    const { data: settleRes, error: settleErr } = await supabase.rpc(
      "settle_transaction_atomic" as any,
      { _order_id: orderId, _new_status: status, _payment_type: paymentType || tx.payment_type || "violet" },
    );
    if (settleErr) {
      console.error("settle_transaction_atomic error:", settleErr);
      return new Response(JSON.stringify({ error: "settlement_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((settleRes as any)?.credited === true) {

      // Fire-and-forget top-up success email
      try {
        const { data: userRes } = await supabase.auth.admin.getUserById(tx.user_id);
        const recipientEmail = userRes?.user?.email;
        const displayName =
          (userRes?.user?.user_metadata as any)?.username ||
          (userRes?.user?.user_metadata as any)?.full_name ||
          (userRes?.user?.user_metadata as any)?.name || null;
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
                paymentType: paymentType || "violet",
              },
            },
          });
        }
      } catch (emailErr) {
        console.error("Failed to send top-up success email (violet):", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("violet-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
