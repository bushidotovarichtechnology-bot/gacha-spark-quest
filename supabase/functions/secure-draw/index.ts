import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "unauthorized" });
    }

    // Auth client (uses caller's JWT — RLS + auth.uid() apply)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: claimErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (claimErr || !userData?.user?.id) {
      return json(401, { error: "unauthorized" });
    }
    const userId = userData.user.id;

    // Validate body
    let body: { campaign_id?: string; draw_count?: number };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "invalid_json" });
    }
    const campaignId = (body.campaign_id ?? "").toString().trim();
    const drawCount = Number(body.draw_count);
    if (!campaignId || !Number.isInteger(drawCount) || drawCount < 1 || drawCount > 10) {
      return json(400, { error: "invalid_params" });
    }

    // Capture IP + UA for audit
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    // Service-role client for atomic RPC + log writes (bypasses RLS for gacha_logs)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Call atomic secure_draw RPC (runs as caller via SECURITY DEFINER + auth.uid())
    const { data, error } = await supabase.rpc("secure_draw", {
      _campaign_id: campaignId,
      _draw_count: drawCount,
    });

    if (error) {
      const msg = error.message || "draw_failed";
      // Log failure
      await admin.from("gacha_logs").insert({
        user_id: userId,
        campaign_id: campaignId,
        draw_count: drawCount,
        ip_address: ip,
        user_agent: userAgent,
        status: "failed",
        error_message: msg,
        result_summary: [],
      });

      // Map known errors to HTTP codes
      if (msg.includes("rate_limited")) return json(429, { error: "rate_limited" });
      if (msg.includes("insufficient_coins")) return json(402, { error: "insufficient_coins" });
      if (msg.includes("unauthorized")) return json(401, { error: "unauthorized" });
      if (msg.includes("campaign_not_found")) return json(404, { error: "campaign_not_found" });
      if (msg.includes("invalid_draw_count")) return json(400, { error: "invalid_draw_count" });
      console.error("secure_draw error:", error);
      return json(500, { error: msg });
    }

    // Log success (best effort)
    await admin.from("gacha_logs").insert({
      user_id: userId,
      campaign_id: campaignId,
      draw_count: drawCount,
      ip_address: ip,
      user_agent: userAgent,
      status: "success",
      result_summary: (data as any)?.results ?? [],
    });

    // Update last_draw_ip (audit only)
    await admin.from("user_coins").update({ last_draw_ip: ip }).eq("user_id", userId);

    return json(200, data);
  } catch (err) {
    console.error("secure-draw fatal:", err);
    return json(500, { error: "internal_error" });
  }
});
