import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ERR_MAP: Record<string, string> = {
  unauthorized: "Unauthorized",
  invalid_code: "Kode kupon tidak valid",
  coupon_not_found: "Kode kupon tidak ditemukan atau sudah tidak aktif",
  coupon_expired: "Kupon sudah kedaluwarsa",
  coupon_exhausted: "Kupon sudah habis digunakan",
  already_redeemed: "Kamu sudah pernah menggunakan kupon ini",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Kode kupon tidak valid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomic redemption — FOR UPDATE inside the function prevents races
    const { data, error } = await userClient.rpc("redeem_coupon_atomic" as any, { _code: code });

    if (error) {
      const key = Object.keys(ERR_MAP).find((k) => error.message?.includes(k));
      const msg = key ? ERR_MAP[key] : "Gagal redeem kupon";
      const status = key === "coupon_not_found" ? 404 : key === "unauthorized" ? 401 : 400;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Redeem coupon error:", err);
    return new Response(JSON.stringify({ error: err.message || "Gagal redeem kupon" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
