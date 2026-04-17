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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { destination_area_id, weight, items } = await req.json();
    if (!destination_area_id) {
      return new Response(JSON.stringify({ error: "destination_area_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load Biteship settings (origin + couriers + default weight)
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "biteship_origin")
      .maybeSingle();
    const settings: any = settingsRow?.value || {};

    if (!settings.area_id) {
      return new Response(JSON.stringify({ error: "Origin area_id belum diatur admin" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const couriers: string =
      Array.isArray(settings.couriers) && settings.couriers.length > 0
        ? settings.couriers.join(",")
        : "jne,jnt,sicepat,anteraja,pos,tiki,ide";

    const finalWeight = Number(weight) || Number(settings.default_weight) || 1000;
    const finalItems = Array.isArray(items) && items.length > 0
      ? items
      : [{ name: "Hadiah", description: "Prize item", value: 1, weight: finalWeight, quantity: 1 }];

    const apiKey = Deno.env.get("BITESHIP_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Biteship API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      origin_area_id: settings.area_id,
      destination_area_id,
      couriers,
      items: finalItems,
    };

    const res = await fetch("https://api.biteship.com/v1/rates/couriers", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok || data?.success === false) {
      console.error("Biteship rates error:", data);
      return new Response(
        JSON.stringify({ error: data?.error || data?.message || "Failed to fetch rates" }),
        { status: res.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ pricing: data.pricing || [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
