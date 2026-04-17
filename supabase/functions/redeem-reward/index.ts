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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !userData?.user?.id) return json(401, { error: "unauthorized" });

    let body: { reward_id?: string };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "invalid_json" });
    }
    const rewardId = (body.reward_id ?? "").toString().trim();
    if (!rewardId || !UUID_RE.test(rewardId)) {
      return json(400, { error: "invalid_reward_id" });
    }

    const { data, error } = await supabase.rpc("redeem_reward", { _reward_id: rewardId });

    if (error) {
      const msg = error.message || "redeem_failed";
      if (msg.includes("unauthorized")) return json(401, { error: "unauthorized" });
      if (msg.includes("reward_not_found")) return json(404, { error: "reward_not_found" });
      if (msg.includes("reward_inactive")) return json(400, { error: "reward_inactive" });
      if (msg.includes("out_of_stock")) return json(409, { error: "out_of_stock" });
      if (msg.includes("insufficient_tickets")) return json(402, { error: "insufficient_tickets" });
      console.error("redeem_reward error:", error);
      return json(500, { error: msg });
    }

    return json(200, data);
  } catch (err) {
    console.error("redeem-reward fatal:", err);
    return json(500, { error: "internal_error" });
  }
});
