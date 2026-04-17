// Mock tracking manifest generator — meniru response RajaOngkir Pro waybill
// Nanti diganti dengan call ke edge function `track-shipment`.

export interface ManifestEntry {
  date: string; // ISO
  city: string;
  description: string;
}

export interface TrackingResult {
  waybill: string;
  courier: string;
  status: "pending" | "on_process" | "in_transit" | "delivered";
  origin: string;
  destination: string;
  receiver?: string;
  manifest: ManifestEntry[];
}

const CITIES = ["Jakarta", "Bandung", "Semarang", "Surabaya", "Yogyakarta", "Denpasar", "Medan"];

// Deterministic pseudo-random based on waybill string so refresh stays stable
function seeded(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return () => {
    h = (h * 1103515245 + 12345) | 0;
    return ((h >>> 0) % 1000) / 1000;
  };
}

export function generateMockTracking(
  waybill: string,
  courier: string,
  shippedAt: string | null,
  destinationCity: string,
  isDelivered: boolean,
): TrackingResult {
  const rand = seeded(waybill);
  const start = shippedAt ? new Date(shippedAt) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);
  const origin = CITIES[Math.floor(rand() * CITIES.length)];
  const transit1 = CITIES[Math.floor(rand() * CITIES.length)];
  const transit2 = CITIES[Math.floor(rand() * CITIES.length)];

  const hop = (h: number) => new Date(start.getTime() + h * 60 * 60 * 1000).toISOString();

  const manifest: ManifestEntry[] = [
    { date: hop(0), city: origin, description: `Paket diterima di gerai ${courier} ${origin}` },
    { date: hop(2), city: origin, description: `Paket diproses di hub ${origin}` },
    { date: hop(6), city: origin, description: `Keluar dari hub ${origin}` },
    { date: hop(14), city: transit1, description: `Tiba di transit ${transit1}` },
    { date: hop(20), city: transit1, description: `Keluar dari transit ${transit1}` },
    { date: hop(28), city: transit2, description: `Tiba di transit ${transit2}` },
    { date: hop(36), city: destinationCity, description: `Tiba di gerai tujuan ${destinationCity}` },
    { date: hop(40), city: destinationCity, description: `Paket sedang diantar kurir` },
  ];

  if (isDelivered) {
    manifest.push({
      date: hop(44),
      city: destinationCity,
      description: `Paket diterima oleh penerima`,
    });
  }

  // Reverse: latest first (mirip RajaOngkir)
  manifest.reverse();

  return {
    waybill,
    courier,
    status: isDelivered ? "delivered" : "in_transit",
    origin,
    destination: destinationCity,
    receiver: isDelivered ? "YBS (Yang Bersangkutan)" : undefined,
    manifest,
  };
}
