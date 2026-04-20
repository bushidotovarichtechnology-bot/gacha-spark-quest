import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPTS: Record<string, { text: string; duration: number }> = {
  S: {
    text: "Epic legendary fanfare with bright golden brass, triumphant orchestral hit, magical sparkle chimes, and powerful bass impact. Grand prize victory celebration sound.",
    duration: 3,
  },
  A: {
    text: "Magical mystical chime burst with shimmering crystal bells, ethereal ascending sparkle, and rare item reveal sound. Purple magic energy.",
    duration: 2,
  },
};

// In-memory cache (per function instance)
const cache = new Map<string, string>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tier } = await req.json();
    if (tier !== "S" && tier !== "A") {
      return new Response(JSON.stringify({ error: "invalid_tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cache.has(tier)) {
      return new Response(JSON.stringify({ audioContent: cache.get(tier) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "missing_api_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, duration } = PROMPTS[tier];
    const resp = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        duration_seconds: duration,
        prompt_influence: 0.5,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("ElevenLabs error:", errText);
      return new Response(JSON.stringify({ error: "elevenlabs_failed", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = await resp.arrayBuffer();
    const b64 = base64Encode(buf);
    cache.set(tier, b64);

    return new Response(JSON.stringify({ audioContent: b64 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tier-sfx error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
