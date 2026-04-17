import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map kurir lokal -> kode courier Biteship
const COURIER_MAP: Record<string, string> = {
  jne: "jne",
  "j&t": "jnt",
  jnt: "jnt",
  sicepat: "sicepat",
  anteraja: "anteraja",
  pos: "pos",
  ninja: "ninja",
  tiki: "tiki",
  ide: "ide",
  sap: "sap",
  rpx: "rpx",
  jet: "jet",
  lion: "lion",
  rex: "rex",
  paxel: "paxel",
  gojek: "gojek",
  grab: "grab",
};

function normalizeCourier(name: string): string {
  const lower = (name || "").toLowerCase().trim().replace(/\s+/g, "");
  return COURIER_MAP[lower] || lower;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { waybill_id, courier_code } = await req.json();
    if (!waybill_id || !courier_code) {
      return new Response(JSON.stringify({ error: "waybill_id and courier_code are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("BITESHIP_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Biteship API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const courier = normalizeCourier(courier_code);
    const waybill = String(waybill_id).trim();

    const url = `https://api.biteship.com/v1/trackings/${encodeURIComponent(waybill)}/couriers/${encodeURIComponent(courier)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok || data?.success === false) {
      console.error("Biteship error:", data);
      return new Response(
        JSON.stringify({
          error: data?.error || data?.message || "Failed to fetch tracking",
          code: data?.code,
        }),
        { status: res.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
