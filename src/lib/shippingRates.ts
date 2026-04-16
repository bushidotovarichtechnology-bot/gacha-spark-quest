// Zone-based shipping rates for Indonesian provinces
// Zone 1: Jawa (cheapest)
// Zone 2: Sumatera, Bali, NTB
// Zone 3: Kalimantan, Sulawesi, NTT
// Zone 4: Papua, Maluku (most expensive)

type ShippingZone = 1 | 2 | 3 | 4;

const PROVINCE_ZONES: Record<string, ShippingZone> = {
  // Zone 1 - Jawa
  "DKI Jakarta": 1,
  "Jawa Barat": 1,
  "Jawa Tengah": 1,
  "Jawa Timur": 1,
  "DI Yogyakarta": 1,
  "Banten": 1,
  // Zone 2 - Sumatera, Bali, NTB
  "Aceh": 2,
  "Sumatera Utara": 2,
  "Sumatera Barat": 2,
  "Riau": 2,
  "Kepulauan Riau": 2,
  "Jambi": 2,
  "Sumatera Selatan": 2,
  "Bangka Belitung": 2,
  "Bengkulu": 2,
  "Lampung": 2,
  "Bali": 2,
  "Nusa Tenggara Barat": 2,
  // Zone 3 - Kalimantan, Sulawesi, NTT
  "Kalimantan Barat": 3,
  "Kalimantan Tengah": 3,
  "Kalimantan Selatan": 3,
  "Kalimantan Timur": 3,
  "Kalimantan Utara": 3,
  "Sulawesi Utara": 3,
  "Sulawesi Tengah": 3,
  "Sulawesi Selatan": 3,
  "Sulawesi Tenggara": 3,
  "Sulawesi Barat": 3,
  "Gorontalo": 3,
  "Nusa Tenggara Timur": 3,
  // Zone 4 - Papua, Maluku
  "Maluku": 4,
  "Maluku Utara": 4,
  "Papua": 4,
  "Papua Barat": 4,
  "Papua Selatan": 4,
  "Papua Tengah": 4,
  "Papua Pegunungan": 4,
  "Papua Barat Daya": 4,
};

// Prices in Rupiah
const ZONE_RATES: Record<ShippingZone, { regular: number; express: number; same_day: number }> = {
  1: { regular: 9000, express: 18000, same_day: 30000 },
  2: { regular: 15000, express: 28000, same_day: 0 }, // no same-day outside Java
  3: { regular: 22000, express: 38000, same_day: 0 },
  4: { regular: 35000, express: 55000, same_day: 0 },
};

export const PROVINCES = Object.keys(PROVINCE_ZONES);

export function getZone(province: string): ShippingZone {
  return PROVINCE_ZONES[province] || 3;
}

export function getShippingRate(province: string, method: string): number {
  const zone = getZone(province);
  const rates = ZONE_RATES[zone];
  return rates[method as keyof typeof rates] ?? rates.regular;
}

export function getAvailableMethods(province: string) {
  const zone = getZone(province);
  const rates = ZONE_RATES[zone];
  
  const methods = [
    { id: "regular", label: "Reguler", eta: zone <= 2 ? "3-5 hari" : zone === 3 ? "5-7 hari" : "7-14 hari", price: rates.regular },
    { id: "express", label: "Express", eta: zone <= 2 ? "1-2 hari" : "2-4 hari", price: rates.express },
  ];
  
  if (rates.same_day > 0) {
    methods.push({ id: "same_day", label: "Same Day", eta: "Hari ini", price: rates.same_day });
  }
  
  return methods;
}
