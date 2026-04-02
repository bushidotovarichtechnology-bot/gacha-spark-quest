import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface InventoryItem {
  id: string;
  prize: string;
  tier: "S" | "A" | "B" | "C";
  campaign: string;
  campaignId: string;
  image: string;
  coinValue: number;
  wonAt: string;
}

interface GachaState {
  items: InventoryItem[];
  totalCoins: number;
  drawsSinceTierA: number;
  addPrize: (prize: Omit<InventoryItem, "id" | "wonAt">) => void;
  recycleItem: (id: string) => number;
  pityThreshold: number;
}

const PITY_THRESHOLD = 10;
const STORAGE_KEY = "bushido-gacha-state";

const coinValues: Record<string, number> = { S: 1000, A: 200, B: 80, C: 15 };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(items: InventoryItem[], totalCoins: number, drawsSinceTierA: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, totalCoins, drawsSinceTierA }));
}

const GachaContext = createContext<GachaState | null>(null);

export const useGacha = () => {
  const ctx = useContext(GachaContext);
  if (!ctx) throw new Error("useGacha must be inside GachaProvider");
  return ctx;
};

export const GachaProvider = ({ children }: { children: ReactNode }) => {
  const saved = loadState();
  const [items, setItems] = useState<InventoryItem[]>(saved?.items ?? []);
  const [totalCoins, setTotalCoins] = useState<number>(saved?.totalCoins ?? 0);
  const [drawsSinceTierA, setDrawsSinceTierA] = useState<number>(saved?.drawsSinceTierA ?? 0);

  useEffect(() => {
    saveState(items, totalCoins, drawsSinceTierA);
  }, [items, totalCoins, drawsSinceTierA]);

  const addPrize = useCallback((prize: Omit<InventoryItem, "id" | "wonAt">) => {
    const newItem: InventoryItem = {
      ...prize,
      coinValue: prize.coinValue || coinValues[prize.tier] || 15,
      id: crypto.randomUUID(),
      wonAt: new Date().toISOString(),
    };
    setItems((prev) => [newItem, ...prev]);

    if (prize.tier === "S" || prize.tier === "A") {
      setDrawsSinceTierA(0);
    } else {
      setDrawsSinceTierA((prev) => prev + 1);
    }
  }, []);

  const recycleItem = useCallback((id: string) => {
    let value = 0;
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) value = item.coinValue;
      return prev.filter((i) => i.id !== id);
    });
    setTotalCoins((prev) => prev + value);
    return value;
  }, []);

  return (
    <GachaContext.Provider value={{ items, totalCoins, drawsSinceTierA, addPrize, recycleItem, pityThreshold: PITY_THRESHOLD }}>
      {children}
    </GachaContext.Provider>
  );
};
