// @ts-nocheck
// supabase/functions/trade-create/index.ts
//
// Creates a new pending P2P trade on behalf of the authenticated user and
// captures the initiator's IP + user-agent at creation time so the audit
// log (`trade_history.initiator_ip`) is never NULL.

import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CreatePayload {
  inventory_ids: string[];
  tier: "S" | "A" | "B";
  message?: string;
  recipient_id?: string | null;
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
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json(401, { error: "unauthorized" });
  const callerId = claims.claims.sub as string;

  let payload: CreatePayload;
  try {
    payload = (await req.json()) as CreatePayload;
  } catch {
    return json(400, { error: "invalid_json" });
  }

  if (!Array.isArray(payload.inventory_ids) || payload.inventory_ids.length === 0) {
    return json(400, { error: "missing_inventory_ids" });
  }
  if (!["S", "A", "B"].includes(payload.tier)) {
    return json(400, { error: "invalid_tier" });
  }
  const message = (payload.message ?? "").slice(0, 200);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Generate token via existing RPC.
  const { data: tradeToken, error: tokenErr } = await admin.rpc("generate_trade_token");
  if (tokenErr || !tradeToken) {
    console.error("[trade-create] token error", tokenErr);
    return json(500, { error: "token_generation_failed" });
  }

  // Verify ownership + tier of all offered items (defense-in-depth).
  const { data: rows, error: invErr } = await admin
    .from("user_inventory")
    .select("id, user_id, tier_label")
    .in("id", payload.inventory_ids);
  if (invErr) {
    console.error("[trade-create] inv error", invErr);
    return json(500, { error: "inventory_check_failed" });
  }
  if (!rows || rows.length !== payload.inventory_ids.length) {
    return json(400, { error: "items_ownership_failed" });
  }
  for (const r of rows) {
    if (r.user_id !== callerId) return json(403, { error: "items_ownership_failed" });
    if (r.tier_label !== payload.tier) return json(400, { error: "tier_mismatch" });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const { data: trade, error: insertErr } = await admin
    .from("trades")
    .insert({
      token: tradeToken as string,
      initiator_id: callerId,
      initiator_items: payload.inventory_ids,
      tier_label: payload.tier,
      message,
      initiator_ip: ip,
      initiator_user_agent: userAgent,
    })
    .select("*")
    .single();

  if (insertErr) {
    console.error("[trade-create] insert error", insertErr);
    return json(500, { error: "trade_insert_failed", detail: insertErr.message });
  }

  return json(200, { success: true, trade });
});
