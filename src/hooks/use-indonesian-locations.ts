import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedProvinces: string[] | null = null;
const cityCache = new Map<string, string[]>();
const postalCodeCache = new Map<string, string[]>(); // key: `${province}::${city}`

export function useProvinces() {
  const [provinces, setProvinces] = useState<string[]>(cachedProvinces || []);
  const [loading, setLoading] = useState(!cachedProvinces);

  useEffect(() => {
    if (cachedProvinces) return;
    supabase
      .from("indonesian_cities")
      .select("province")
      .order("province")
      .then(({ data }) => {
        const list = Array.from(new Set((data || []).map((r: any) => r.province as string)));
        cachedProvinces = list;
        setProvinces(list);
        setLoading(false);
      });
  }, []);

  return { provinces, loading };
}

export function useCitiesForProvince(province: string) {
  const [cities, setCities] = useState<string[]>(province && cityCache.has(province) ? cityCache.get(province)! : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!province) {
      setCities([]);
      return;
    }
    if (cityCache.has(province)) {
      setCities(cityCache.get(province)!);
      return;
    }
    setLoading(true);
    supabase
      .from("indonesian_cities")
      .select("city")
      .eq("province", province)
      .order("city")
      .then(({ data }) => {
        const list = (data || []).map((r: any) => r.city as string);
        cityCache.set(province, list);
        setCities(list);
        setLoading(false);
      });
  }, [province]);

  return { cities, loading };
}

const districtsCache = new Map<string, string[]>(); // key: `${province}::${city}`
const villagesCache = new Map<string, string[]>(); // key: `${province}::${city}::${district}`

export function useDistrictsForCity(province: string, city: string) {
  const cacheKey = `${province}::${city}`;
  const [districts, setDistricts] = useState<string[]>(
    province && city && districtsCache.has(cacheKey) ? districtsCache.get(cacheKey)! : []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!province || !city) {
      setDistricts([]);
      return;
    }
    if (districtsCache.has(cacheKey)) {
      setDistricts(districtsCache.get(cacheKey)!);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("get-region-data", { body: { type: "districts", province, city } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = ((data as any)?.districts as string[] | null) || [];
        districtsCache.set(cacheKey, list);
        setDistricts(list);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [province, city, cacheKey]);

  return { districts, loading };
}

export function useVillagesForDistrict(province: string, city: string, district: string) {
  const cacheKey = `${province}::${city}::${district}`;
  const [villages, setVillages] = useState<string[]>(
    province && city && district && villagesCache.has(cacheKey) ? villagesCache.get(cacheKey)! : []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!province || !city || !district) {
      setVillages([]);
      return;
    }
    if (villagesCache.has(cacheKey)) {
      setVillages(villagesCache.get(cacheKey)!);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("get-region-data", { body: { type: "villages", province, city, district } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = ((data as any)?.villages as string[] | null) || [];
        villagesCache.set(cacheKey, list);
        setVillages(list);
      })
      .catch(() => {
        if (!cancelled) setVillages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [province, city, district, cacheKey]);

  return { villages, loading };
}

export function usePostalCodesForCity(province: string, city: string) {
  const cacheKey = `${province}::${city}`;
  const [postalCodes, setPostalCodes] = useState<string[]>(
    province && city && postalCodeCache.has(cacheKey) ? postalCodeCache.get(cacheKey)! : []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!province || !city) {
      setPostalCodes([]);
      return;
    }
    if (postalCodeCache.has(cacheKey)) {
      setPostalCodes(postalCodeCache.get(cacheKey)!);
      return;
    }
    setLoading(true);
    supabase
      .from("indonesian_cities")
      .select("postal_codes")
      .eq("province", province)
      .eq("city", city)
      .maybeSingle()
      .then(({ data }) => {
        const list = ((data as any)?.postal_codes as string[] | null) || [];
        const sorted = [...list].sort();
        postalCodeCache.set(cacheKey, sorted);
        setPostalCodes(sorted);
        setLoading(false);
      });
  }, [province, city, cacheKey]);

  return { postalCodes, loading };
}
