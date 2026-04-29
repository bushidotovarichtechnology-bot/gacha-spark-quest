import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// One-shot seeder for indonesian_cities.postal_codes
// Sources: github.com/cahyadsn/wilayah + cahyadsn/wilayah_kodepos (Kemendagri 2025)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return j({ error: "Admin only" }, 403);

    // Fetch raw datasets
    const [wilayahTxt, kodeposTxt] = await Promise.all([
      fetch("https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql").then(r => r.text()),
      fetch("https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/master/db/wilayah_kodepos.sql").then(r => r.text()),
    ]);

    // Parse kode -> nama
    const kodeToNama = new Map<string, string>();
    const reW = /\('([\d.]+)',\s*'([^']+)'\)/g;
    let m: RegExpExecArray | null;
    while ((m = reW.exec(wilayahTxt))) kodeToNama.set(m[1], m[2]);

    // Aggregate kabupaten -> postal codes
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

    // Index by city_norm with province context
    type Src = { provNorm: string; cityNorm: string; postals: string[] };
    const byCity = new Map<string, Src[]>();
    for (const [kabKode, postals] of kabPostals) {
      const provKode = kabKode.split(".")[0];
      const provName = kodeToNama.get(provKode) ?? "";
      const kabName = kodeToNama.get(kabKode) ?? "";
      if (!provName || !kabName) continue;
      const cn = norm(kabName);
      const item: Src = { provNorm: norm(provName), cityNorm: cn, postals: [...postals].sort() };
      if (!byCity.has(cn)) byCity.set(cn, []);
      byCity.get(cn)!.push(item);
    }

    // Fetch DB rows
    const { data: cities, error: cErr } = await admin
      .from("indonesian_cities").select("id, province, city");
    if (cErr) throw cErr;

    let updated = 0, skipped = 0;
    const unmatched: { province: string; city: string }[] = [];

    // Update in batches
    const updates: { id: string; postal_codes: string[] }[] = [];
    for (const row of cities!) {
      const cands = byCity.get(norm(row.city)) ?? [];
      const same = cands.filter(c => c.provNorm === norm(row.province));
      const pick = same[0] ?? cands[0];
      if (pick) updates.push({ id: row.id, postal_codes: pick.postals });
      else { unmatched.push({ province: row.province, city: row.city }); skipped++; }
    }

    // Apply updates one by one (520 rows, fast enough); could be parallelized
    for (const u of updates) {
      const { error } = await admin
        .from("indonesian_cities")
        .update({ postal_codes: u.postal_codes })
        .eq("id", u.id);
      if (!error) updated++;
    }

    return j({ ok: true, total: cities!.length, updated, skipped, unmatched });
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
