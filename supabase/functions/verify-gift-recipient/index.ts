import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rawEmail = (body?.email ?? "").toString().trim().toLowerCase();
    const rawUsername = (body?.username ?? "").toString().trim().toLowerCase().replace(/^@/, "");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-z0-9_]{3,20}$/;

    const adminClient = createClient(supabaseUrl, serviceKey);

    let normalizedEmail = "";
    let receiver: any = null;

    // Mode 1: lookup by username (faster, exact match via profiles)
    if (rawUsername && usernameRegex.test(rawUsername)) {
      const { data: profileRow } = await adminClient
        .from("profiles")
        .select("user_id")
        .eq("username", rawUsername)
        .maybeSingle();
      if (!profileRow?.user_id) {
        return new Response(JSON.stringify({ found: false, error: "Username tidak ditemukan" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: authUser, error: authErr } = await adminClient.auth.admin.getUserById(
        profileRow.user_id as string,
      );
      if (authErr || !authUser?.user) {
        return new Response(JSON.stringify({ found: false, error: "User tidak ditemukan" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      receiver = authUser.user;
      normalizedEmail = (receiver.email ?? "").toLowerCase();
    } else {
      // Mode 2: lookup by email
      if (!rawEmail || !emailRegex.test(rawEmail)) {
        return new Response(JSON.stringify({ found: false, error: "Format email tidak valid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      normalizedEmail = rawEmail;
      let page = 1;
      const perPage = 1000;
      while (page <= 10) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const found = data?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
        if (found) { receiver = found; break; }
        if (!data?.users || data.users.length < perPage) break;
        page++;
      }

      if (!receiver) {
        return new Response(JSON.stringify({
          found: false,
          error: "Email tidak terdaftar di Bushido Gacha",
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    if (receiver.id === user.id) {
      return new Response(JSON.stringify({
        found: false,
        error: "Tidak bisa mengirim koin ke diri sendiri",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get receiver display name, avatar & username (best-effort)
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name, avatar_url, username")
      .eq("user_id", receiver.id)
      .maybeSingle();

    // Mask email for privacy: a***@domain.com
    const [local, domain] = normalizedEmail.split("@");
    const maskedEmail = local.length <= 2
      ? local[0] + "***@" + domain
      : local[0] + "***" + local[local.length - 1] + "@" + domain;

    return new Response(JSON.stringify({
      found: true,
      // Echo back which mode resolved so the client can show username chip
      resolved_via: rawUsername ? "username" : "email",
      resolved_email: normalizedEmail,
      receiver: {
        id: receiver.id,
        masked_email: maskedEmail,
        display_name: profile?.display_name || "Player",
        avatar_url: profile?.avatar_url || "",
        username: profile?.username || null,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Verify recipient error:", err);
    return new Response(JSON.stringify({ error: err.message || "Gagal verifikasi" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
