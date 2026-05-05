// Receives DOKU notifications and finalizes transactions/claims.
// DOKU posts JSON with HMAC signature in the `Signature` header.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getDokuConfig, verifyDokuWebhookSignature } from "../_shared/doku.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, client-id, request-id, request-timestamp, signature",
};

const WEBHOOK_PATH = "/functions/v1/doku-webhook";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const cfg = await getDokuConfig();

    const verified = await verifyDokuWebhookSignature({
      cfg, headers: req.headers, rawBody, requestTarget: WEBHOOK_PATH,
    });
    if (!verified) {
      console.warn("DOKU webhook signature mismatch");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try { body = JSON.parse(rawBody); } catch { body = {}; }

    const order = body?.order || {};
    const transaction = body?.transaction || {};
    const referenceId: string = order.invoice_number || transaction.original_request_id || "";
    const trxId: string = transaction.id || transaction.original_request_id || "";
    const status: string = String(transaction.status || body?.status || "").toUpperCase();

    if (!referenceId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map DOKU status -> internal
    let internalStatus = "pending";
    if (/SUCCESS|SETTLE|PAID/.test(status)) internalStatus = "settlement";
    else if (/EXPIRE|EXPIRED/.test(status)) internalStatus = "expire";
    else if (/FAIL|CANCEL|VOID|DECLINE/.test(status)) internalStatus = "cancel";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Top-up transactions
    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("id, status, order_id, user_id, coins, amount")
      .eq("order_id", referenceId)
      .maybeSingle();

    if (tx && tx.status !== internalStatus) {
      const wasNotSettled = tx.status !== "settlement";
      await supabaseAdmin
        .from("transactions")
        .update({
          status: internalStatus,
          payment_type: "doku",
          provider_reference: trxId || tx.order_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      if (internalStatus === "settlement" && wasNotSettled && tx.user_id && tx.coins) {
        const { data: uc } = await supabaseAdmin
          .from("user_coins").select("balance").eq("user_id", tx.user_id).maybeSingle();
        const newBalance = (uc?.balance ?? 0) + tx.coins;
        await supabaseAdmin
          .from("user_coins")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("user_id", tx.user_id);

        try {
          const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(tx.user_id);
          const recipientEmail = userRes?.user?.email;
          const displayName =
            (userRes?.user?.user_metadata as any)?.username ||
            (userRes?.user?.user_metadata as any)?.full_name ||
            (userRes?.user?.user_metadata as any)?.name || null;
          if (recipientEmail) {
            await supabaseAdmin.functions.invoke("send-transactional-email", {
              body: {
                templateName: "topup-success",
                recipientEmail,
                idempotencyKey: `topup-success-${tx.id}`,
                templateData: {
                  name: displayName,
                  coins: tx.coins,
                  amount: tx.amount,
                  orderId: tx.order_id,
                  paymentType: "doku",
                },
              },
            });
          }
        } catch (emailErr) {
          console.error("Failed to send top-up success email (doku):", emailErr);
        }
      }
    }

    // Shipping claims
    if (referenceId.startsWith("DOKU-SHIP-") && internalStatus === "settlement") {
      await supabaseAdmin
        .from("prize_claims")
        .update({ payment_status: "paid", shipping_paid: true, updated_at: new Date().toISOString() })
        .eq("shipping_order_id", referenceId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("doku-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
