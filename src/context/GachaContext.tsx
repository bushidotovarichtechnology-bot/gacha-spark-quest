import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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
  loading: boolean;
  freeDraws: number;
  activeDiscountPercent: number;
  useFreeDraws: (count: number) => void;
  clearDiscount: () => void;
  refreshCoins: () => Promise<void>;
  refreshInventory: () => Promise<void>;
}

const PITY_THRESHOLD = 10;
const coinValues: Record<string, number> = { S: 1000, A: 200, B: 80, C: 15 };

// localStorage helpers — keyed per user so multiple accounts on same device don't collide.
const PITY_LS_PREFIX = "bushido:pity:";
const pityKey = (userId: string) => `${PITY_LS_PREFIX}${userId}`;

const readPersistedPity = (userId: string): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(pityKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: number };
    if (typeof parsed.value === "number" && Number.isFinite(parsed.value)) {
      return Math.max(0, Math.floor(parsed.value));
    }
  } catch {
    // ignore corrupt entries
  }
  return null;
};

const writePersistedPity = (userId: string, value: number) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(pityKey(userId), JSON.stringify({ value, updatedAt: Date.now() }));
  } catch {
    // quota / private mode — ignore
  }
};

const clearPersistedPity = (userId: string) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(pityKey(userId));
  } catch {
    // ignore
  }
};
const GachaContext = createContext<GachaState | null>(null);

export const useGacha = () => {
  const ctx = useContext(GachaContext);
  if (!ctx) throw new Error("useGacha must be inside GachaProvider");
  return ctx;
};

export const GachaProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalCoins, setTotalCoins] = useState<number>(0);
  const [drawsSinceTierA, setDrawsSinceTierA] = useState<number>(0);
  const [drawHistory, setDrawHistory] = useState<DrawHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [freeDraws, setFreeDraws] = useState<number>(0);
  const [activeDiscountPercent, setActiveDiscountPercent] = useState<number>(0);

  const refreshCoins = useCallback(async () => {
    if (!user) return;
    const { data: coinsData } = await supabase
      .from("user_coins")
      .select("balance, draws_since_tier_a, free_draws, active_discount_percent")
      .eq("user_id", user.id)
      .maybeSingle();
    if (coinsData) {
      setTotalCoins(coinsData.balance);
      setDrawsSinceTierA(coinsData.draws_since_tier_a);
      setFreeDraws((coinsData as any).free_draws ?? 0);
      setActiveDiscountPercent((coinsData as any).active_discount_percent ?? 0);
    }
  }, [user]);

  const refreshInventory = useCallback(async () => {
    if (!user) return;
    const { data: invData } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", user.id)
      .order("won_at", { ascending: false });
    if (invData) {
      setItems(invData.map((r) => ({
        id: r.id,
        prize: r.prize_name,
        tier: r.tier_label as "S" | "A" | "B" | "C",
        campaign: r.campaign_name,
        campaignId: r.campaign_id,
        image: r.image_url,
        coinValue: r.coin_value,
        wonAt: r.won_at,
      })));
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setTotalCoins(0);
      setDrawsSinceTierA(0);
      setDrawHistory([]);
      setFreeDraws(0);
      setActiveDiscountPercent(0);
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);

      const { data: coinsData } = await supabase
        .from("user_coins")
        .select("balance, draws_since_tier_a, free_draws, active_discount_percent")
        .eq("user_id", user.id)
        .maybeSingle();

      if (coinsData) {
        setTotalCoins(coinsData.balance);
        setDrawsSinceTierA(coinsData.draws_since_tier_a);
        setFreeDraws((coinsData as any).free_draws ?? 0);
        setActiveDiscountPercent((coinsData as any).active_discount_percent ?? 0);
      } else {
        await supabase.from("user_coins").insert({ user_id: user.id, balance: 0, draws_since_tier_a: 0 });
        setTotalCoins(0);
        setDrawsSinceTierA(0);
        setFreeDraws(0);
        setActiveDiscountPercent(0);
      }

      const { data: invData } = await supabase
        .from("user_inventory")
        .select("*")
        .eq("user_id", user.id)
        .order("won_at", { ascending: false });

      if (invData) {
        setItems(invData.map((r) => ({
          id: r.id,
          prize: r.prize_name,
          tier: r.tier_label as "S" | "A" | "B" | "C",
          campaign: r.campaign_name,
          campaignId: r.campaign_id,
          image: r.image_url,
          coinValue: r.coin_value,
          wonAt: r.won_at,
        })));
      }

      const { data: drawData } = await supabase
        .from("draws")
        .select("id, prize_name, tier_label, campaign_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (drawData) {
        setDrawHistory(drawData.map((r) => ({
          id: r.id,
          prize: r.prize_name,
          tier: r.tier_label as "S" | "A" | "B" | "C",
          campaign: "",
          campaignId: r.campaign_id,
          drawnAt: r.created_at,
        })));
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  const syncCoins = useCallback(async (balance: number, draws: number) => {
    if (!user) return;
    await supabase
      .from("user_coins")
      .update({ balance, draws_since_tier_a: draws })
      .eq("user_id", user.id);
  }, [user]);

  const addPrize = useCallback(async (prize: Omit<InventoryItem, "id" | "wonAt">) => {
    const now = new Date().toISOString();
    const cv = prize.coinValue || coinValues[prize.tier] || 15;
    const newId = crypto.randomUUID();

    setItems((prev) => [{ ...prize, coinValue: cv, id: newId, wonAt: now }, ...prev]);
    setDrawHistory((prev) => [{
      id: crypto.randomUUID(), prize: prize.prize, tier: prize.tier,
      campaign: prize.campaign, campaignId: prize.campaignId, drawnAt: now,
    }, ...prev]);

    const newDraws = (prize.tier === "S" || prize.tier === "A") ? 0 : drawsSinceTierA + 1;
    setDrawsSinceTierA(newDraws);

    // Server (secure_draw RPC) is the source of truth for inventory + coin balance.
    // This optimistic update will be reconciled by refreshInventory/refreshCoins.
    if (user) {
      void refreshInventory();
      void refreshCoins();
    }
  }, [user, drawsSinceTierA, refreshInventory, refreshCoins]);

  const recycleItem = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    const value = item?.coinValue ?? 0;
    // Optimistic UI update
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotalCoins((prev) => prev + value);
    if (user) {
      supabase.rpc("recycle_inventory_item" as any, { _item_id: id }).then(({ error }) => {
        if (error) {
          // Rollback on failure
          if (item) setItems((prev) => [item, ...prev]);
          setTotalCoins((prev) => prev - value);
        }
      });
    }
    return value;
  }, [user, items]);

  // Optimistic-only helpers — server is the source of truth.
  // Coin balance changes happen server-side (gacha RPC, gift RPC, coupon RPC, payment webhooks).
  const addCoins = useCallback((amount: number) => {
    setTotalCoins((prev) => prev + amount);
    void refreshCoins();
  }, [refreshCoins]);

  const spendCoins = useCallback((amount: number): boolean => {
    if (totalCoins < amount) return false;
    setTotalCoins((prev) => prev - amount);
    return true;
  }, [totalCoins]);

  const useFreeDraws = useCallback((count: number) => {
    setFreeDraws((prev) => Math.max(0, prev - count));
    void refreshCoins();
  }, [refreshCoins]);

  const clearDiscount = useCallback(() => {
    setActiveDiscountPercent(0);
    void refreshCoins();
  }, [refreshCoins]);

  return (
    <GachaContext.Provider value={{
      items, totalCoins, drawsSinceTierA, drawHistory, addPrize, recycleItem, addCoins, spendCoins,
      pityThreshold: PITY_THRESHOLD, loading, freeDraws, activeDiscountPercent, useFreeDraws, clearDiscount, refreshCoins, refreshInventory,
    }}>
      {children}
    </GachaContext.Provider>
  );
};
