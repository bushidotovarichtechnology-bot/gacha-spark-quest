import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedProvinces: string[] | null = null;
const cityCache = new Map<string, string[]>();

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
