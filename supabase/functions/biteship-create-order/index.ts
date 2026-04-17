import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COURIER_TRACKING_URL: Record<string, string> = {
  jne: "https://www.jne.co.id/id/tracking/trace",
  jnt: "https://www.jet.co.id/track",
  sicepat: "https://www.sicepat.com/checkAwb",
  anteraja: "https://www.anteraja.id/tracking",
  pos: "https://www.posindonesia.co.id/id/tracking",
  tiki: "https://www.tiki.id/id/tracking",
  ide: "https://www.id-express.com/tracking",
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

    // Verify admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { claim_id } = await req.json();
    if (!claim_id) {
      return new Response(JSON.stringify({ error: "claim_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load claim
    const { data: claim, error: claimErr } = await supabase
      .from("prize_claims")
      .select("*")
      .eq("id", claim_id)
      .maybeSingle();
    if (claimErr || !claim) {
      return new Response(JSON.stringify({ error: "Claim not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (claim.tracking_number) {
      return new Response(JSON.stringify({ error: "Order Biteship sudah pernah dibuat untuk klaim ini" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!claim.destination_area_id) {
      return new Response(JSON.stringify({ error: "destination_area_id kosong. Klaim lama yang belum punya area Biteship tidak bisa di-order otomatis." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!claim.courier_company || !claim.courier_service) {
      return new Response(JSON.stringify({ error: "courier_company / courier_service kosong di klaim" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load Biteship origin settings
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "biteship_origin")
      .maybeSingle();
    const settings: any = settingsRow?.value || {};

    if (!settings.area_id || !settings.contact_name || !settings.contact_phone || !settings.address) {
      return new Response(JSON.stringify({ error: "Setting origin gudang belum lengkap. Isi di /admin/biteship dulu." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("BITESHIP_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Biteship API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve per-prize weight (fallback to default settings weight or 1000g)
    let weight = Number(settings.default_weight) || 1000;
    try {
      const { data: prizeRow } = await supabase
        .from("tier_prizes")
        .select("weight_grams, campaign_tiers!inner(campaign_id, label)")
        .eq("name", claim.prize_name)
        .eq("campaign_tiers.campaign_id", claim.campaign_id)
        .eq("campaign_tiers.label", claim.tier_label)
        .maybeSingle();
      if (prizeRow && (prizeRow as any).weight_grams) {
        weight = Number((prizeRow as any).weight_grams) || weight;
      }
    } catch { /* fallback */ }

    const payload = {
      shipper_contact_name: settings.contact_name,
      shipper_contact_phone: settings.contact_phone,
      shipper_contact_email: settings.contact_email || "noreply@example.com",
      shipper_organization: settings.organization || settings.contact_name,
      origin_contact_name: settings.contact_name,
      origin_contact_phone: settings.contact_phone,
      origin_address: settings.address,
      origin_note: settings.note || "",
      origin_postal_code: settings.postal_code ? Number(settings.postal_code) : undefined,
      origin_area_id: settings.area_id,
      destination_contact_name: claim.recipient_name,
      destination_contact_phone: claim.phone,
      destination_contact_email: settings.contact_email || "noreply@example.com",
      destination_address: claim.address,
      destination_postal_code: claim.postal_code ? Number(claim.postal_code) : undefined,
      destination_area_id: claim.destination_area_id,
      destination_note: claim.notes || "",
      courier_company: claim.courier_company,
      courier_type: claim.courier_service,
      courier_insurance: 0,
      delivery_type: "now",
      order_note: `Hadiah ${claim.prize_name} (Tier ${claim.tier_label})`,
      items: [{
        name: claim.prize_name || "Hadiah",
        description: `Tier ${claim.tier_label}`,
        category: "others",
        value: Math.max(claim.coin_value || 10000, 10000),
        quantity: 1,
        weight,
      }],
    };

    const res = await fetch("https://api.biteship.com/v1/orders", {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok || data?.success === false) {
      console.error("Biteship create order error:", data);
      return new Response(
        JSON.stringify({ error: data?.error || data?.message || "Failed to create Biteship order" }),
        { status: res.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = data.id || data.order?.id;
    const waybill = data.courier?.waybill_id || data.courier?.tracking_id || data.waybill_id || null;
    const courierCode = (claim.courier_company || "").toLowerCase();
    const trackingUrl = COURIER_TRACKING_URL[courierCode] || null;

    // Update claim
    const updateData: Record<string, any> = {
      shipping_order_id: orderId,
      tracking_number: waybill,
      tracking_url: trackingUrl,
      courier_name: claim.courier_company,
      status: "shipped",
      shipped_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabase
      .from("prize_claims")
      .update(updateData)
      .eq("id", claim_id);

    if (updErr) {
      console.error("Update claim failed:", updErr);
      return new Response(JSON.stringify({
        error: "Order Biteship berhasil dibuat tapi gagal update database",
        biteship: data,
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: orderId,
      waybill_id: waybill,
      tracking_url: trackingUrl,
      raw: data,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
