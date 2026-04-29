// One-shot admin tool: generate AI product images for tier_prizes that lack image_url,
// upload to storage bucket `reward-images` under path `tier-prizes/...`, and update DB.
// Auth: shared secret (LOVABLE_API_KEY via x-seed-token) OR admin JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-token",
};

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BUCKET = "reward-images";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function genImage(name: string, campaignTitle: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const prompt = `Professional product photography of "${name}" (item from "${campaignTitle}" collection), centered on a clean solid white background, studio lighting, sharp focus, high detail, e-commerce catalog style, square 1:1 composition, no text, no watermark, no logos.`;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url || !url.startsWith("data:")) throw new Error("no image returned");
  const [hdr, b64] = url.split(",", 2);
  const mime = hdr.replace("data:", "").split(";")[0] || "image/png";
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { bytes: bin, mime };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const seedToken = req.headers.get("x-seed-token") || "";
    let authorized = !!seedToken && seedToken === LOVABLE_KEY;
    if (!authorized) {
      const authHeader = req.headers.get("Authorization") || "";
      const userClient = createClient(SUPA_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      const user = userData?.user;
      if (user) {
        const adminCheck = createClient(SUPA_URL, SERVICE_KEY);
        const { data: roleRow } = await adminCheck
          .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (roleRow) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPA_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({} as any));
    const limit = Math.min(Number(body.limit ?? 30), 50);
    const overwrite: boolean = body.overwrite === true;
    const campaignId: string | undefined = body.campaign_id;

    let q = admin
      .from("tier_prizes")
      .select("id, name, image_url, tier_id, campaign_tiers!inner(campaign_id, label, campaigns!inner(id, title, image_url))")
      .order("id", { ascending: true })
      .limit(limit);
    if (!overwrite) q = q.or("image_url.is.null,image_url.eq.");
    if (campaignId) q = q.eq("campaign_tiers.campaign_id", campaignId);

    const { data: prizes, error } = await q;
    if (error) throw error;

    const results: any[] = [];
    let ok = 0, fail = 0;

    for (const pr of (prizes ?? []) as any[]) {
      const campaignTitle = pr.campaign_tiers?.campaigns?.title ?? "";
      const campaignIdVal = pr.campaign_tiers?.campaign_id ?? "unknown";
      try {
        const { bytes, mime } = await genImage(pr.name, campaignTitle);
        const ext = mime.includes("png") ? "png" : mime.includes("jpeg") ? "jpg" : "webp";
        const path = `tier-prizes/${campaignIdVal}/${pr.id}-${slugify(pr.name)}.${ext}`;
        const up = await admin.storage.from(BUCKET).upload(path, bytes, {
          contentType: mime, upsert: true, cacheControl: "31536000",
        });
        if (up.error) throw up.error;
        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        const upd = await admin.from("tier_prizes").update({ image_url: publicUrl }).eq("id", pr.id);
        if (upd.error) throw upd.error;
        results.push({ id: pr.id, name: pr.name, status: "ok", url: publicUrl });
        ok++;
      } catch (e) {
        results.push({ id: pr.id, name: pr.name, status: "fail", error: String(e).slice(0, 200) });
        fail++;
      }
    }

    const { count: remaining } = await admin
      .from("tier_prizes")
      .select("id", { count: "exact", head: true })
      .or("image_url.is.null,image_url.eq.");

    return new Response(JSON.stringify({ ok, fail, processed: (prizes ?? []).length, remaining, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
