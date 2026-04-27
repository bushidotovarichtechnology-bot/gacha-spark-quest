import { supabase } from "@/integrations/supabase/client";

export const TRADE_GAS_FEE = 1;
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
  recipientId?: string | null;
}): Promise<TradeRow> => {
  const { data, error } = await supabase.functions.invoke("trade-create", {
    body: {
      inventory_ids: params.inventoryIds,
      tier: params.tier,
      message: params.message ?? "",
      recipient_id: params.recipientId ?? null,
    },
  });
  if (error) throw error;
  if (!data?.success || !data?.trade) {
    throw new Error(data?.error ?? "trade_create_failed");
  }
  return data.trade as TradeRow;
};

export type TradeFetchReason =
  | "invalid_token"
  | "not_authenticated"
  | "not_found_or_forbidden"
  | "network_error";

export class TradeFetchError extends Error {
  reason: TradeFetchReason;
  constructor(reason: TradeFetchReason, message?: string) {
    super(message ?? reason);
    this.reason = reason;
  }
}

const TOKEN_RE = /^[a-z0-9]{8,32}$/i;

export const fetchTradeByToken = async (token: string): Promise<TradeRow> => {
  if (!token || !TOKEN_RE.test(token)) {
    throw new TradeFetchError("invalid_token");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new TradeFetchError("not_authenticated");
  }
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    throw new TradeFetchError("network_error", error.message);
  }
  if (!data) {
    // Either the token doesn't exist OR RLS hid the row because the
    // current user is not the initiator/responder/recipient.
    throw new TradeFetchError("not_found_or_forbidden");
  }
  return data as unknown as TradeRow;
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
