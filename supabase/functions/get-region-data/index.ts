// Edge function: get districts (kecamatan) or villages (kelurahan)
// from public Indonesian region API (emsifa/api-wilayah-indonesia).
// Maps province + city -> regency_id internally so the client only
// needs to send human-readable names.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const API_BASE = "https://www.emsifa.com/api-wilayah-indonesia/api";

// In-memory caches (per edge instance lifetime)
let provincesCache: Array<{ id: string; name: string }> | null = null;
const regenciesCache = new Map<string, Array<{ id: string; name: string }>>();
const districtsCache = new Map<string, Array<{ id: string; name: string }>>();
const villagesCache = new Map<string, Array<{ id: string; name: string }>>();

const norm = (s: string) =>
  s
    .toUpperCase()
    .replace(/^(KABUPATEN|KAB\.?|KOTA|KOTA ADM\.?|KOTA ADMINISTRASI)\s+/i, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function getProvinces() {
  if (provincesCache) return provincesCache;
  const res = await fetch(`${API_BASE}/provinces.json`);
  provincesCache = await res.json();
  return provincesCache!;
}

async function getRegencies(provinceId: string) {
  if (regenciesCache.has(provinceId)) return regenciesCache.get(provinceId)!;
  const res = await fetch(`${API_BASE}/regencies/${provinceId}.json`);
  const data = await res.json();
  regenciesCache.set(provinceId, data);
  return data;
}

async function getDistricts(regencyId: string) {
  if (districtsCache.has(regencyId)) return districtsCache.get(regencyId)!;
  const res = await fetch(`${API_BASE}/districts/${regencyId}.json`);
  const data = await res.json();
  districtsCache.set(regencyId, data);
  return data;
}

async function getVillages(districtId: string) {
  if (villagesCache.has(districtId)) return villagesCache.get(districtId)!;
  const res = await fetch(`${API_BASE}/villages/${districtId}.json`);
  const data = await res.json();
  villagesCache.set(districtId, data);
  return data;
}

async function findProvinceId(name: string): Promise<string | null> {
  const provinces = await getProvinces();
  const target = norm(name);
  const found = provinces.find((p) => norm(p.name) === target);
  return found?.id ?? null;
}

async function findRegencyId(provinceId: string, cityName: string): Promise<string | null> {
  const regencies = await getRegencies(provinceId);
  const target = norm(cityName);
  const found = regencies.find((r: any) => norm(r.name) === target);
  return found?.id ?? null;
}

async function findDistrictId(regencyId: string, districtName: string): Promise<string | null> {
  const districts = await getDistricts(regencyId);
  const target = norm(districtName);
  const found = districts.find((d: any) => norm(d.name) === target);
  return found?.id ?? null;
}

const toTitleCase = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bDki\b/g, "DKI")
    .replace(/\bDi\b/g, "DI");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const type = String(body.type || "");
    const province = String(body.province || "").trim();
    const city = String(body.city || "").trim();
    const district = String(body.district || "").trim();

    if (type === "districts") {
      if (!province || !city) {
        return new Response(JSON.stringify({ districts: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const provinceId = await findProvinceId(province);
      if (!provinceId) {
        return new Response(JSON.stringify({ districts: [], reason: "province_not_found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const regencyId = await findRegencyId(provinceId, city);
      if (!regencyId) {
        return new Response(JSON.stringify({ districts: [], reason: "city_not_found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const districts = await getDistricts(regencyId);
      const list = districts
        .map((d: any) => toTitleCase(d.name))
        .sort((a: string, b: string) => a.localeCompare(b));
      return new Response(JSON.stringify({ districts: list }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "villages") {
      if (!province || !city || !district) {
        return new Response(JSON.stringify({ villages: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const provinceId = await findProvinceId(province);
      if (!provinceId) {
        return new Response(JSON.stringify({ villages: [], reason: "province_not_found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const regencyId = await findRegencyId(provinceId, city);
      if (!regencyId) {
        return new Response(JSON.stringify({ villages: [], reason: "city_not_found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const districtId = await findDistrictId(regencyId, district);
      if (!districtId) {
        return new Response(JSON.stringify({ villages: [], reason: "district_not_found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const villages = await getVillages(districtId);
      const list = villages
        .map((v: any) => toTitleCase(v.name))
        .sort((a: string, b: string) => a.localeCompare(b));
      return new Response(JSON.stringify({ villages: list }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "invalid type, use 'districts' or 'villages'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
