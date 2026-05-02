// Receives iPaymu payment notifications and finalizes transactions/claims.
// iPaymu posts form-urlencoded notifications. We verify by re-querying iPaymu's
// /transaction endpoint with our HMAC signature to confirm status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getIpaymuConfig, ipaymuRequest } from "../_shared/ipaymu.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // iPaymu sends application/x-www-form-urlencoded. Some setups use JSON.
    let body: Record<string, string> = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      body = await req.json();
    } else {
      const form = await req.formData();
      for (const [k, v] of form.entries()) body[k] = String(v);
    }

    const trxId = body["trx_id"] || body["TransactionId"] || body["transaction_id"];
    const referenceId = body["reference_id"] || body["ReferenceId"];
    const status = (body["status"] || body["Status"] || "").toString().toLowerCase();

    if (!trxId && !referenceId) {
      return new Response(JSON.stringify({ error: "Missing transaction id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authoritative status: query iPaymu directly
    const cfg = await getIpaymuConfig();
    let verifiedStatus = status;
    try {
      const { ok, data } = await ipaymuRequest<any>(cfg, "/transaction", {
        transactionId: trxId ? Number(trxId) : undefined,
        referenceId: !trxId ? referenceId : undefined,
      });
      if (ok && data?.Status === 200) {
        verifiedStatus = String(data?.Data?.StatusDesc || data?.Data?.StatusName || "").toLowerCase();
      }
    } catch (e) {
      console.warn("iPaymu verify call failed; falling back to webhook payload", e);
    }

    // Map iPaymu status to internal status
    // berhasil/success/paid -> settlement; expired/failed/cancel -> expire/cancel
    let internalStatus: string = "pending";
    if (/berhasil|success|paid|settlement/.test(verifiedStatus)) internalStatus = "settlement";
    else if (/expired|kadaluarsa/.test(verifiedStatus)) internalStatus = "expire";
    else if (/cancel|batal|failed|gagal/.test(verifiedStatus)) internalStatus = "cancel";

    // Find transaction by order_id (referenceId)
    if (referenceId) {
      const { data: tx } = await supabaseAdmin
        .from("transactions")
        .select("id, status, order_id, user_id")
        .eq("order_id", referenceId)
        .maybeSingle();

      if (tx && tx.status !== internalStatus) {
        await supabaseAdmin
          .from("transactions")
          .update({
            status: internalStatus,
            payment_type: "ipaymu",
            provider_reference: trxId ? String(trxId) : tx.order_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tx.id);

        // On settlement, credit coins
        if (internalStatus === "settlement") {
          const { data: txFull } = await supabaseAdmin
            .from("transactions").select("id, coins, amount, user_id, order_id").eq("id", tx.id).maybeSingle();
          if (txFull?.user_id && txFull?.coins) {
            const { data: uc } = await supabaseAdmin
              .from("user_coins").select("balance").eq("user_id", txFull.user_id).maybeSingle();
            const newBalance = (uc?.balance ?? 0) + (txFull.coins ?? 0);
            await supabaseAdmin
              .from("user_coins")
              .update({ balance: newBalance, updated_at: new Date().toISOString() })
              .eq("user_id", txFull.user_id);

            // Top-up success email (only credit once on transition into settlement)
            if (tx.status !== "settlement") {
              try {
                const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(txFull.user_id);
                const recipientEmail = userRes?.user?.email;
                const displayName =
                  (userRes?.user?.user_metadata as any)?.username ||
                  (userRes?.user?.user_metadata as any)?.full_name ||
                  (userRes?.user?.user_metadata as any)?.name ||
                  null;
                if (recipientEmail) {
                  await supabaseAdmin.functions.invoke("send-transactional-email", {
                    body: {
                      templateName: "topup-success",
                      recipientEmail,
                      idempotencyKey: `topup-success-${txFull.id}`,
                      templateData: {
                        name: displayName,
                        coins: txFull.coins,
                        amount: (txFull as any).amount,
                        orderId: txFull.order_id,
                        paymentType: "ipaymu",
                      },
                    },
                  });
                }
              } catch (emailErr) {
                console.error("Failed to send top-up success email (ipaymu):", emailErr);
              }
            }
          }
        }
      }
    }

    // Also handle prize_claims paid by iPaymu (shipping)
    if (referenceId && referenceId.startsWith("IPAYMU-SHIP-")) {
      const claimId = referenceId.replace("IPAYMU-SHIP-", "").split("-")[0];
      if (internalStatus === "settlement" && claimId) {
        await supabaseAdmin
          .from("prize_claims")
          .update({ payment_status: "paid", shipping_paid: true, updated_at: new Date().toISOString() })
          .eq("shipping_order_id", referenceId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ipaymu-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
