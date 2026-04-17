import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { claim_id, reason } = await req.json();
    if (!claim_id) {
      return new Response(JSON.stringify({ error: "claim_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: claim, error: claimErr } = await supabase
      .from("prize_claims").select("*").eq("id", claim_id).maybeSingle();
    if (claimErr || !claim) {
      return new Response(JSON.stringify({ error: "Claim not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!claim.shipping_order_id) {
      return new Response(JSON.stringify({ error: "Klaim ini belum punya order Biteship" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("BITESHIP_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Biteship API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cancelReason = (typeof reason === "string" && reason.trim()) || "Cancelled by admin";
    const url = `https://api.biteship.com/v1/orders/${claim.shipping_order_id}?cancellation_reason=${encodeURIComponent(cancelReason)}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.success === false) {
      console.error("Biteship cancel error:", data);
      return new Response(
        JSON.stringify({ error: data?.error || data?.message || "Failed to cancel Biteship order" }),
        { status: res.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updErr } = await supabase
      .from("prize_claims")
      .update({
        status: "pending",
        shipping_order_id: null,
        tracking_number: null,
        tracking_url: null,
        shipped_at: null,
        notes: claim.notes ? `${claim.notes}\n[Biteship dibatalkan: ${cancelReason}]` : `[Biteship dibatalkan: ${cancelReason}]`,
      })
      .eq("id", claim_id);

    if (updErr) {
      return new Response(JSON.stringify({
        error: "Order Biteship dibatalkan tapi gagal update database",
        biteship: data,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, raw: data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
