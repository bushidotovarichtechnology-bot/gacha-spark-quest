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

    // Verify sender
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

    const { receiver_email, amount, message } = await req.json();

    if (!receiver_email || typeof receiver_email !== "string") {
      return new Response(JSON.stringify({ error: "Email penerima wajib diisi" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!amount || typeof amount !== "number" || amount < 1 || !Number.isInteger(amount)) {
      return new Response(JSON.stringify({ error: "Jumlah koin minimal 1" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (amount > 100000) {
      return new Response(JSON.stringify({ error: "Maksimal 100.000 koin per pengiriman" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find receiver by email
    const { data: { users: foundUsers }, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) throw listError;

    const receiver = foundUsers?.find((u: any) => u.email?.toLowerCase() === receiver_email.toLowerCase());
    if (!receiver) {
      return new Response(JSON.stringify({ error: "User dengan email tersebut tidak ditemukan" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (receiver.id === user.id) {
      return new Response(JSON.stringify({ error: "Tidak bisa mengirim koin ke diri sendiri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert gift record
    const { error: insertError } = await adminClient.from("coin_gifts").insert({
      sender_id: user.id,
      receiver_id: receiver.id,
      receiver_email: receiver_email.toLowerCase(),
      amount,
      message: (message || "").slice(0, 200),
    });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        receiver_id: receiver.id,
        amount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Gift error:", err);
    return new Response(JSON.stringify({ error: err.message || "Gagal mengirim gift" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
