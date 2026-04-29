import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin-only one-shot seeder for indonesian_cities.postal_codes
// Sources: github.com/cahyadsn/wilayah + cahyadsn/wilayah_kodepos (Kemendagri 2025, MIT)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return j({ error: "Admin only" }, 403);

    const [wilayahTxt, kodeposTxt] = await Promise.all([
      fetch("https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql").then(r => r.text()),
      fetch("https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/master/db/wilayah_kodepos.sql").then(r => r.text()),
    ]);

    // kode -> nama
    const kodeToNama = new Map<string, string>();
    const reW = /\('([\d.]+)',\s*'([^']+)'\)/g;
    let m: RegExpExecArray | null;
    while ((m = reW.exec(wilayahTxt))) kodeToNama.set(m[1], m[2]);

    // kabupaten -> Set<postal>
    const kabPostals = new Map<string, Set<string>>();
    const reK = /\('(\d{2}\.\d{2})\.\d{2}\.\d{4}',\s*'(\d{5})'\)/g;
    while ((m = reK.exec(kodeposTxt))) {
      const kab = m[1];
      if (!kabPostals.has(kab)) kabPostals.set(kab, new Set());
      kabPostals.get(kab)!.add(m[2]);
    }

    const norm = (s: string) =>
      s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/\bkabupaten\b|\bkab\.?\b|\bkota\b|\badm\.?\b|\badministrasi\b|\bkep\.?\b|\bkepulauan\b|\bdan\b/g, "")
        .replace(/\boku\b/g, "ogankomeringulu")
        .replace(/[^a-z0-9]+/g, "").trim();

    type Src = { provNorm: string; postals: string[] };
    const byCity = new Map<string, Src[]>();
    for (const [kabKode, postals] of kabPostals) {
      const provName = kodeToNama.get(kabKode.split(".")[0]) ?? "";
      const kabName = kodeToNama.get(kabKode) ?? "";
      if (!provName || !kabName) continue;
      const cn = norm(kabName);
      const arr = byCity.get(cn) ?? [];
      arr.push({ provNorm: norm(provName), postals: [...postals].sort() });
      byCity.set(cn, arr);
    }

    const { data: cities, error: cErr } = await admin
      .from("indonesian_cities").select("id, province, city");
    if (cErr) throw cErr;

    let updated = 0;
    const unmatched: { province: string; city: string }[] = [];
    const updates: { id: string; postal_codes: string[] }[] = [];
    for (const row of cities!) {
      const cands = byCity.get(norm(row.city)) ?? [];
      const same = cands.filter(c => c.provNorm === norm(row.province));
      const pick = same[0] ?? cands[0];
      if (pick) updates.push({ id: row.id, postal_codes: pick.postals });
      else unmatched.push({ province: row.province, city: row.city });
    }

    // Parallel batches of 25
    const batchSize = 25;
    for (let i = 0; i < updates.length; i += batchSize) {
      const slice = updates.slice(i, i + batchSize);
      const results = await Promise.all(
        slice.map(u =>
          admin.from("indonesian_cities")
            .update({ postal_codes: u.postal_codes }).eq("id", u.id)
        )
      );
      updated += results.filter(r => !r.error).length;
    }

    return j({ ok: true, total: cities!.length, updated, unmatched_count: unmatched.length, unmatched });
  } catch (e) {
    console.error(e);
    return j({ error: (e as Error).message }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
