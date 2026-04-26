import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Structured audit logger — emits one JSON line per event for easy grep/parse
function audit(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: "gift_coins_audit", event, ts: new Date().toISOString(), ...data }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Generate request_id (use incoming header if provided, else create one)
  const requestId =
    req.headers.get("x-request-id") ||
    (globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      audit("unauthorized_no_header", { request_id: requestId, ip });
      return new Response(JSON.stringify({ error: "Unauthorized", request_id: requestId }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify sender (use sender's JWT so the RPC runs as them)
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      audit("unauthorized_invalid_token", { request_id: requestId, ip });
      return new Response(JSON.stringify({ error: "Unauthorized", request_id: requestId }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { receiver_email, amount, message } = body;
    // Idempotency key: prefer client-provided request_id (in body or header), else use generated one
    const idempotencyKey: string =
      (typeof body?.request_id === "string" && body.request_id.trim()) ||
      req.headers.get("x-idempotency-key") ||
      requestId;

    audit("request_received", {
      request_id: requestId,
      sender_id: user.id,
      receiver_email: typeof receiver_email === "string" ? receiver_email.toLowerCase() : null,
      amount,
      message_length: typeof message === "string" ? message.length : 0,
      ip,
      user_agent: userAgent,
    });

    if (!receiver_email || typeof receiver_email !== "string") {
      audit("validation_failed", { request_id: requestId, sender_id: user.id, reason: "missing_email" });
      return new Response(JSON.stringify({ error: "Email penerima wajib diisi", request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!amount || typeof amount !== "number" || amount < 1 || !Number.isInteger(amount)) {
      audit("validation_failed", { request_id: requestId, sender_id: user.id, reason: "invalid_amount", amount });
      return new Response(JSON.stringify({ error: "Jumlah koin minimal 1", request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (amount > 100000) {
      audit("validation_failed", { request_id: requestId, sender_id: user.id, reason: "exceeds_max", amount });
      return new Response(JSON.stringify({ error: "Maksimal 100.000 koin per pengiriman", request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Idempotency check: if a gift with this request_id already exists for this sender, return success without re-processing
    const { data: existingGift } = await adminClient
      .from("coin_gifts")
      .select("id, sender_id, receiver_id, amount")
      .eq("request_id", idempotencyKey)
      .maybeSingle();
    if (existingGift) {
      if (existingGift.sender_id !== user.id) {
        audit("idempotency_key_conflict", { request_id: requestId, idempotency_key: idempotencyKey, sender_id: user.id });
        return new Response(JSON.stringify({ error: "Idempotency key conflict", request_id: requestId }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      audit("idempotent_replay", {
        request_id: requestId,
        idempotency_key: idempotencyKey,
        gift_id: existingGift.id,
        sender_id: user.id,
      });
      return new Response(
        JSON.stringify({
          success: true,
          replayed: true,
          receiver_id: existingGift.receiver_id,
          amount: existingGift.amount,
          request_id: requestId,
          gift_id: existingGift.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId } }
      );
    }


    // Find receiver by email
    const { data: { users: foundUsers }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    const receiver = foundUsers?.find((u: any) => u.email?.toLowerCase() === receiver_email.toLowerCase());
    if (!receiver) {
      audit("receiver_not_found", { request_id: requestId, sender_id: user.id, receiver_email: receiver_email.toLowerCase() });
      return new Response(JSON.stringify({ error: "User dengan email tersebut tidak ditemukan", request_id: requestId }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (receiver.id === user.id) {
      audit("self_send_blocked", { request_id: requestId, sender_id: user.id });
      return new Response(JSON.stringify({ error: "Tidak bisa mengirim koin ke diri sendiri", request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Insert the gift row FIRST as the idempotency lock (unique request_id).
    // Status starts as "processing" — flips to "success" after transfer or "error" on failure.
    const { data: giftRow, error: insertError } = await adminClient
      .from("coin_gifts")
      .insert({
        sender_id: user.id,
        receiver_id: receiver.id,
        receiver_email: receiver_email.toLowerCase(),
        amount,
        message: (message || "").slice(0, 200),
        request_id: idempotencyKey,
        status: "processing",
      } as any)
      .select("id")
      .single();

    if (insertError) {
      const isUniqueViolation = (insertError as any)?.code === "23505" || /duplicate key|unique/i.test(insertError.message || "");
      if (isUniqueViolation) {
        // Concurrent retry won the race — return the already-processed gift as a replay
        audit("idempotent_race_detected", { request_id: requestId, idempotency_key: idempotencyKey, sender_id: user.id });
        const { data: existing } = await adminClient
          .from("coin_gifts")
          .select("id, receiver_id, amount, sender_id")
          .eq("request_id", idempotencyKey)
          .maybeSingle();
        if (existing && existing.sender_id !== user.id) {
          return new Response(JSON.stringify({ error: "Idempotency key conflict", request_id: requestId }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            success: true,
            replayed: true,
            receiver_id: existing?.receiver_id ?? receiver.id,
            amount: existing?.amount ?? amount,
            request_id: requestId,
            gift_id: existing?.id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId } }
        );
      }
      throw insertError;
    }

    // Step 2: Atomic balance transfer via RPC (runs as the sender; FOR UPDATE prevents balance races)
    const { error: rpcError } = await userClient.rpc("transfer_gift_coins" as any, {
      _receiver_id: receiver.id,
      _amount: amount,
    });
    if (rpcError) {
      // Roll back the gift row so the idempotency key can be retried with a corrected amount/balance
      await adminClient.from("coin_gifts").delete().eq("id", giftRow!.id);
      audit("transfer_rpc_failed", {
        request_id: requestId,
        sender_id: user.id,
        receiver_id: receiver.id,
        amount,
        error: rpcError.message,
      });
      const msg = rpcError.message?.includes("insufficient_coins")
        ? "Koin tidak cukup"
        : rpcError.message?.includes("cannot_send_to_self")
        ? "Tidak bisa mengirim koin ke diri sendiri"
        : "Gagal memproses transfer";
      return new Response(JSON.stringify({ error: msg, request_id: requestId }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // Write ledger entries for both sender (debit) and receiver (credit) — full audit trail
    const { data: senderCoins } = await adminClient
      .from("user_coins")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    const { data: receiverCoins } = await adminClient
      .from("user_coins")
      .select("balance")
      .eq("user_id", receiver.id)
      .single();

    const ledgerMeta = {
      request_id: requestId,
      gift_id: giftRow?.id,
      ip,
      user_agent: userAgent,
    };

    await adminClient.from("coin_ledger").insert([
      {
        user_id: user.id,
        entry_type: "gift_sent",
        amount: -amount,
        balance_after: senderCoins?.balance ?? null,
        description: `Kirim gift koin ke ${receiver_email.toLowerCase()}`,
        reference_id: giftRow?.id ?? null,
        metadata: { ...ledgerMeta, counterparty_id: receiver.id, counterparty_email: receiver_email.toLowerCase(), message: (message || "").slice(0, 200) },
      },
      {
        user_id: receiver.id,
        entry_type: "gift_received",
        amount: amount,
        balance_after: receiverCoins?.balance ?? null,
        description: `Terima gift koin dari pengirim`,
        reference_id: giftRow?.id ?? null,
        metadata: { ...ledgerMeta, counterparty_id: user.id, message: (message || "").slice(0, 200) },
      },
    ]);

    audit("gift_completed", {
      request_id: requestId,
      gift_id: giftRow?.id,
      sender_id: user.id,
      receiver_id: receiver.id,
      receiver_email: receiver_email.toLowerCase(),
      amount,
      sender_balance_after: senderCoins?.balance ?? null,
      receiver_balance_after: receiverCoins?.balance ?? null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        receiver_id: receiver.id,
        amount,
        request_id: requestId,
        gift_id: giftRow?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": requestId } }
    );
  } catch (err: any) {
    audit("unhandled_error", { request_id: requestId, error: err?.message, stack: err?.stack });
    console.error("Gift error:", err);
    return new Response(JSON.stringify({ error: err.message || "Gagal mengirim gift", request_id: requestId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
