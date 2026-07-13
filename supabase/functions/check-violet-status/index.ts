// Poll Violet Media Pay for the current status of a pending transaction.
// STUB: Endpoint dan field parsing menyesuaikan dokumentasi resmi.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getVioletConfig } from "../_shared/violet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!cfg.apiKey) {
      return new Response(JSON.stringify({
        success: false, status: tx.status, credited: false, retriable: false, error: "violet_api_key_missing",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // TODO: sesuaikan path dan format response dengan dokumentasi resmi.
    const resp = await fetch(`${cfg.baseUrl}/checkout/sessions/${encodeURIComponent(order_id)}`, {
      headers: {
        "Authorization": `Bearer ${cfg.apiKey}`,
        "X-Merchant-Id": cfg.merchantId,
        "Accept": "application/json",
      },
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({
        success: false, status: tx.status, credited: false, retriable: resp.status !== 401,
        error: resp.status === 401 ? "violet_credentials_mismatch" : "violet_status_unavailable",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const status = mapStatus(data?.status || data?.data?.status);
    const paymentType = data?.payment_method || data?.data?.payment_method;

    await supabase.from("transactions")
      .update({ status, payment_type: paymentType ?? tx.payment_type ?? null })
      .eq("order_id", order_id);

    let credited = false;
    if (status === "settlement" && tx.status !== "settlement") {
      const { data: userCoins } = await supabase
        .from("user_coins").select("balance").eq("user_id", tx.user_id).maybeSingle();
      if (userCoins) {
        await supabase.from("user_coins").update({ balance: (userCoins.balance || 0) + tx.coins }).eq("user_id", tx.user_id);
      } else {
        await supabase.from("user_coins").insert({ user_id: tx.user_id, balance: tx.coins });
      }
      credited = true;
    }

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
