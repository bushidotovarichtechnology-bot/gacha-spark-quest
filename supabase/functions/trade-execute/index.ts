// @ts-nocheck
// supabase/functions/trade-execute/index.ts
//
// Executes a P2P trade atomically.
// - Verifies caller is the responder (or initiator confirming).
// - Checks PIN of caller via verify_security_pin.
// - Locks both users' user_coins rows + inventory rows.
// - Validates tier equality (S/A/B), ownership, no Tier C.
// - Checks gas fee balance for both parties (5 coins each).
// - Reassigns user_inventory rows to swap items between users.
// - Decrements gas fee + writes ledger entries.
// - Updates trades.status = 'accepted', writes trade_history audit.
//
// All steps run inside a single Postgres transaction via the
// `_internal_execute_trade` SECURITY DEFINER RPC. The service role only
// orchestrates: PIN check, IP capture, then a single RPC call.

import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ExecutePayload {
  trade_id: string;
  pin: string;
  /** 'submit' (responder pilih item), 'approve' (initiator setuju & swap), 'reject' (initiator tolak) */
  action: "submit" | "approve" | "reject";
  /** Inventory ids the responder is offering. Required for 'submit'. */
  responder_items?: string[];
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "unauthorized" });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json(401, { error: "unauthorized" });
  const callerId = claims.claims.sub as string;

  let payload: ExecutePayload;
  try {
    payload = (await req.json()) as ExecutePayload;
  } catch {
    return json(400, { error: "invalid_json" });
  }

  if (!payload.trade_id || typeof payload.trade_id !== "string") {
    return json(400, { error: "missing_trade_id" });
  }
  if (!payload.action || !["submit", "approve", "reject"].includes(payload.action)) {
    return json(400, { error: "invalid_action" });
  }
  if (!payload.pin || !/^\d{6}$/.test(payload.pin)) {
    return json(400, { error: "invalid_pin_format" });
  }
  if (payload.responder_items && !Array.isArray(payload.responder_items)) {
    return json(400, { error: "invalid_responder_items" });
  }

  // Service-role admin client for verification + atomic execution.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify PIN of the caller.
  const { data: pinOk, error: pinErr } = await admin.rpc("verify_security_pin", {
    _user_id: callerId,
    _pin: payload.pin,
  });
  if (pinErr) {
    console.error("[trade-execute] verify_pin error", pinErr);
    return json(500, { error: "pin_verify_failed" });
  }
  if (!pinOk) return json(403, { error: "invalid_pin" });

  // Capture IPs for audit (best-effort).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  // Single atomic RPC: see migration `_internal_execute_trade`.
  const { data: result, error: rpcErr } = await admin.rpc("_internal_execute_trade", {
    _trade_id: payload.trade_id,
    _caller_id: callerId,
    _responder_items: payload.responder_items ?? null,
    _caller_ip: ip,
    _user_agent: userAgent,
  });

  if (rpcErr) {
    console.error("[trade-execute] rpc error", rpcErr);
    const code = (rpcErr as { message?: string })?.message ?? "";
    // Surface known business errors as 400, unknown as 500.
    const known = [
      "trade_not_found",
      "trade_not_pending",
      "not_a_party",
      "tier_locked",
      "tier_mismatch",
      "missing_responder_items",
      "items_ownership_failed",
      "insufficient_gas_fee",
      "self_trade_forbidden",
    ];
    if (known.some((k) => code.includes(k))) {
      return json(400, { error: code });
    }
    return json(500, { error: "execution_failed", detail: code });
  }

  return json(200, { success: true, result });
});
