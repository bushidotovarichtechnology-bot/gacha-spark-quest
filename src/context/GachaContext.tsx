import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export interface DrawHistoryEntry {
  id: string;
  prize: string;
  tier: "S" | "A" | "B" | "C";
  campaign: string;
  campaignId: string;
  drawnAt: string;
}

interface GachaState {
  items: InventoryItem[];
  totalCoins: number;
  drawsSinceTierA: number;
  drawHistory: DrawHistoryEntry[];
  addPrize: (prize: Omit<InventoryItem, "id" | "wonAt">) => void;
  recycleItem: (id: string) => number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
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

function saveState(items: InventoryItem[], totalCoins: number, drawsSinceTierA: number, drawHistory: DrawHistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, totalCoins, drawsSinceTierA, drawHistory }));
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
  const [drawHistory, setDrawHistory] = useState<DrawHistoryEntry[]>(saved?.drawHistory ?? []);

  useEffect(() => {
    saveState(items, totalCoins, drawsSinceTierA, drawHistory);
  }, [items, totalCoins, drawsSinceTierA, drawHistory]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setItems([]);
        setTotalCoins(0);
        setDrawsSinceTierA(0);
        setDrawHistory([]);
        localStorage.removeItem(STORAGE_KEY);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const addPrize = useCallback((prize: Omit<InventoryItem, "id" | "wonAt">) => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...prize,
      coinValue: prize.coinValue || coinValues[prize.tier] || 15,
      id: crypto.randomUUID(),
      wonAt: now,
    };
    setItems((prev) => [newItem, ...prev]);

    const historyEntry: DrawHistoryEntry = {
      id: crypto.randomUUID(),
      prize: prize.prize,
      tier: prize.tier,
      campaign: prize.campaign,
      campaignId: prize.campaignId,
      drawnAt: now,
    };
    setDrawHistory((prev) => [historyEntry, ...prev]);

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

  const addCoins = useCallback((amount: number) => {
    setTotalCoins((prev) => prev + amount);
  }, []);

  const spendCoins = useCallback((amount: number): boolean => {
    if (totalCoins < amount) return false;
    setTotalCoins((prev) => prev - amount);
    return true;
  }, [totalCoins]);

  return (
    <GachaContext.Provider value={{ items, totalCoins, drawsSinceTierA, drawHistory, addPrize, recycleItem, addCoins, spendCoins, pityThreshold: PITY_THRESHOLD }}>
      {children}
    </GachaContext.Provider>
  );
};
