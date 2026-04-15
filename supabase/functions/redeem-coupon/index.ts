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

    // Verify user
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

    const adminClient = createClient(supabaseUrl, serviceKey);
    const couponCode = code.trim().toUpperCase();

    // Find coupon
    const { data: coupon, error: couponError } = await adminClient
      .from("coupons")
      .select("*")
      .eq("code", couponCode)
      .eq("is_active", true)
      .maybeSingle();

    if (couponError) throw couponError;
    if (!coupon) {
      return new Response(JSON.stringify({ error: "Kode kupon tidak ditemukan atau sudah tidak aktif" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Kupon sudah kedaluwarsa" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check max uses
    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
      return new Response(JSON.stringify({ error: "Kupon sudah habis digunakan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check per-user limit
    const { count } = await adminClient
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", user.id);

    if ((count ?? 0) >= coupon.max_uses_per_user) {
      return new Response(JSON.stringify({ error: "Kamu sudah pernah menggunakan kupon ini" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert redemption
    const { error: insertError } = await adminClient.from("coupon_redemptions").insert({
      coupon_id: coupon.id,
      user_id: user.id,
      benefit_type: coupon.benefit_type,
      benefit_value: coupon.benefit_value,
    });
    if (insertError) throw insertError;

    // Increment used_count
    await adminClient
      .from("coupons")
      .update({ used_count: coupon.used_count + 1 })
      .eq("id", coupon.id);

    // Apply benefit to user_coins
    const { data: userCoins } = await adminClient
      .from("user_coins")
      .select("balance, free_draws, active_discount_percent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userCoins) {
      await adminClient.from("user_coins").insert({
        user_id: user.id,
        balance: 0,
        free_draws: 0,
        active_discount_percent: 0,
      });
    }

    const currentBalance = userCoins?.balance ?? 0;
    const currentFreeDraws = userCoins?.free_draws ?? 0;
    const currentDiscount = userCoins?.active_discount_percent ?? 0;

    switch (coupon.benefit_type) {
      case "bonus_coins":
        await adminClient
          .from("user_coins")
          .update({ balance: currentBalance + coupon.benefit_value })
          .eq("user_id", user.id);
        break;
      case "free_gacha":
        await adminClient
          .from("user_coins")
          .update({ free_draws: currentFreeDraws + coupon.benefit_value })
          .eq("user_id", user.id);
        break;
      case "discount_percent":
        // Use the higher discount if one is already active
        const newDiscount = Math.max(currentDiscount, coupon.benefit_value);
        await adminClient
          .from("user_coins")
          .update({ active_discount_percent: newDiscount })
          .eq("user_id", user.id);
        break;
    }

    // Build benefit description
    let benefitDesc = "";
    switch (coupon.benefit_type) {
      case "bonus_coins":
        benefitDesc = `${coupon.benefit_value.toLocaleString()} koin bonus`;
        break;
      case "free_gacha":
        benefitDesc = `${coupon.benefit_value}x gacha gratis`;
        break;
      case "discount_percent":
        benefitDesc = `Diskon ${coupon.benefit_value}%`;
        break;
      default:
        benefitDesc = `Benefit: ${coupon.benefit_value}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        benefit_type: coupon.benefit_type,
        benefit_value: coupon.benefit_value,
        description: benefitDesc,
        coupon_description: coupon.description,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Redeem coupon error:", err);
    return new Response(JSON.stringify({ error: err.message || "Gagal redeem kupon" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
