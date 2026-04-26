import { supabase } from "@/integrations/supabase/client";

export const TRADE_GAS_FEE = 5;
export const TRADABLE_TIERS = ["S", "A", "B"] as const;
export type TradableTier = (typeof TRADABLE_TIERS)[number];

export const isTradableTier = (tier: string): tier is TradableTier =>
  (TRADABLE_TIERS as readonly string[]).includes(tier);

export const setSecurityPin = async (pin: string) => {
  const { data, error } = await supabase.rpc("set_security_pin", { _pin: pin });
  if (error) throw error;
  return data;
};

export const hasSecurityPin = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc("has_security_pin");
  if (error) throw error;
  return Boolean(data);
};

export interface TradeRow {
  id: string;
  token: string;
  initiator_id: string;
  responder_id: string | null;
  recipient_id: string | null;
  initiator_items: string[];
  responder_items: string[];
  tier_label: TradableTier;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  message: string;
  expires_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new pending trade via the `trade-create` edge function.
 * Routing through the function lets the server capture the initiator's
 * IP + user-agent so `trade_history.initiator_ip` is never NULL.
 */
export const createTrade = async (params: {
  inventoryIds: string[];
  tier: TradableTier;
  message?: string;
}): Promise<TradeRow> => {
  const { data, error } = await supabase.functions.invoke("trade-create", {
    body: {
      inventory_ids: params.inventoryIds,
      tier: params.tier,
      message: params.message ?? "",
    },
  });
  if (error) throw error;
  if (!data?.success || !data?.trade) {
    throw new Error(data?.error ?? "trade_create_failed");
  }
  return data.trade as TradeRow;
};

export const fetchTradeByToken = async (token: string): Promise<TradeRow | null> => {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TradeRow) ?? null;
};

export const cancelTrade = async (tradeId: string) => {
  const { error } = await supabase
    .from("trades")
    .update({ status: "cancelled" })
    .eq("id", tradeId);
  if (error) throw error;
};

export const rejectTrade = async (tradeId: string) => {
  const { error } = await supabase
    .from("trades")
    .update({ status: "rejected", responded_at: new Date().toISOString() })
    .eq("id", tradeId);
  if (error) throw error;
};
