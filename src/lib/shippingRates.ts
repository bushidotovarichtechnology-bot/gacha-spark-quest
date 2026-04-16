import { supabase } from "@/integrations/supabase/client";

export type ShippingZone = {
  id: string;
  zone_name: string;
  zone_number: number;
  provinces: string[];
  regular_price: number;
  regular_eta: string;
  express_price: number;
  express_eta: string;
  same_day_price: number;
  same_day_eta: string;
  same_day_available: boolean;
};

let cachedZones: ShippingZone[] | null = null;

export async function fetchShippingZones(): Promise<ShippingZone[]> {
  if (cachedZones) return cachedZones;
  const { data } = await supabase
    .from("shipping_zones")
    .select("*")
    .order("zone_number");
  cachedZones = (data as ShippingZone[]) || [];
  return cachedZones;
}

export function clearShippingCache() {
  cachedZones = null;
}

export function findZone(zones: ShippingZone[], province: string): ShippingZone | undefined {
  return zones.find(z => z.provinces.includes(province));
}

export function getProvincesList(zones: ShippingZone[]): string[] {
  return zones.flatMap(z => z.provinces).sort();
}

export function getShippingRateFromZones(zones: ShippingZone[], province: string, method: string): number {
  const zone = findZone(zones, province);
  if (!zone) return 0;
  switch (method) {
    case "express": return zone.express_price;
    case "same_day": return zone.same_day_price;
    default: return zone.regular_price;
  }
}

export function getAvailableMethodsFromZones(zones: ShippingZone[], province: string) {
  const zone = findZone(zones, province);
  if (!zone) return [{ id: "regular", label: "Reguler", eta: "3-5 hari", price: 0 }];

  const methods = [
    { id: "regular", label: "Reguler", eta: zone.regular_eta, price: zone.regular_price },
    { id: "express", label: "Express", eta: zone.express_eta, price: zone.express_price },
  ];

  if (zone.same_day_available && zone.same_day_price > 0) {
    methods.push({ id: "same_day", label: "Same Day", eta: zone.same_day_eta, price: zone.same_day_price });
  }

  return methods;
}
