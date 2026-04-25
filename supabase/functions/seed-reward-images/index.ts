// One-shot admin tool: generate AI product images for redeem rewards,
// upload to storage, and update redeem_rewards.image_url.
// Auth: requires caller to be an admin (verified via JWT + has_role()).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BUCKET = "reward-images";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function genImage(name: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const prompt = `Professional product photography of ${name}, centered on a clean solid white background, studio lighting, sharp focus, high detail, e-commerce catalog style, square 1:1 composition, no text, no watermark.`;
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
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPA_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(SUPA_URL, SERVICE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const startSort = Number(body.start_sort ?? 1001);
    const endSort = Number(body.end_sort ?? 1100);
    const limit = Math.min(Number(body.limit ?? 100), 100);
    const overwrite: boolean = body.overwrite === true;

    let q = admin
      .from("redeem_rewards")
      .select("id,name,sort_order,image_url")
      .gte("sort_order", startSort)
      .lte("sort_order", endSort)
      .order("sort_order", { ascending: true })
      .limit(limit);

    const { data: rewards, error } = await q;
    if (error) throw error;

    const targets = (rewards ?? []).filter((r: any) => overwrite || !r.image_url || r.image_url === "");
    const results: any[] = [];
    let ok = 0, fail = 0;

    // Process sequentially to respect AI rate limits
    for (const rw of targets) {
      try {
        const { bytes, mime } = await genImage(rw.name);
        const ext = mime.includes("png") ? "png" : mime.includes("jpeg") ? "jpg" : "webp";
        const path = `redeem/${rw.sort_order}-${slugify(rw.name)}.${ext}`;
        const up = await admin.storage.from(BUCKET).upload(path, bytes, {
          contentType: mime, upsert: true, cacheControl: "31536000",
        });
        if (up.error) throw up.error;
        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
        const publicUrl = pub.publicUrl;
        const upd = await admin.from("redeem_rewards").update({ image_url: publicUrl }).eq("id", rw.id);
        if (upd.error) throw upd.error;
        results.push({ sort_order: rw.sort_order, name: rw.name, status: "ok", url: publicUrl });
        ok++;
      } catch (e) {
        results.push({ sort_order: rw.sort_order, name: rw.name, status: "fail", error: String(e).slice(0, 200) });
        fail++;
      }
    }

    return new Response(JSON.stringify({ ok, fail, processed: targets.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
