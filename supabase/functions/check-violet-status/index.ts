// Poll Violet Media Pay for the current status of a pending transaction.
// Uses GET /transactions?api_key=...&ref_kode=... per official docs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getVioletConfig, violetGet } from "../_shared/violet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function mapStatus(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (["paid", "success", "successful", "settlement", "completed", "capture", "berhasil", "sukses", "lunas"].includes(s)) return "settlement";
  if (["failed", "failure", "deny", "denied", "gagal"].includes(s)) return "deny";
  if (["cancel", "cancelled", "canceled", "batal", "dibatalkan"].includes(s)) return "cancel";
  if (["expire", "expired", "kadaluarsa", "kadaluwarsa"].includes(s)) return "expire";
  if (["pending", "waiting", "menunggu"].includes(s)) return "pending";
  return s || "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tx } = await supabase
      .from("transactions").select("*")
      .eq("order_id", order_id).eq("user_id", user.id).maybeSingle();
    if (!tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (tx.status === "settlement") {
      return new Response(JSON.stringify({ success: true, status: "settlement", credited: false, already: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = await getVioletConfig();
    if (!cfg.apiKey || !cfg.secretKey) {
      return new Response(JSON.stringify({
        success: false, status: tx.status, credited: false, retriable: false, error: "violet_credentials_missing",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET /transactions with api_key + ref_kode (per Violet Media Pay docs).
    const { ok, status: httpStatus, data } = await violetGet<any>(cfg, "/transactions", {
      api_key: cfg.apiKey,
      ref_kode: order_id,
    });
    if (!ok) {
      return new Response(JSON.stringify({
        success: false, status: tx.status, credited: false,
        retriable: httpStatus !== 401,
        error: httpStatus === 401 ? "violet_credentials_mismatch" : "violet_status_unavailable",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rawStatus =
      data?.data?.status_transaksi || data?.data?.status ||
      data?.status_transaksi || data?.status || "";
    const status = mapStatus(String(rawStatus));
    const paymentType =
      data?.data?.channel_payment || data?.data?.payment_method ||
      data?.channel_payment || data?.payment_method || null;

    const { data: settleRes, error: settleErr } = await supabase.rpc(
      "settle_transaction_atomic" as any,
      { _order_id: order_id, _new_status: status, _payment_type: paymentType ?? tx.payment_type ?? null },
    );
    if (settleErr) {
      console.error("settle_transaction_atomic error:", settleErr);
      return new Response(JSON.stringify({
        success: false, status: tx.status, credited: false, retriable: true, error: "settlement_failed",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const credited = (settleRes as any)?.credited === true;

    return new Response(JSON.stringify({ success: true, status, credited, retriable: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-violet-status error:", err);
    return new Response(JSON.stringify({ success: false, credited: false, retriable: true, error: "internal_server_error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
