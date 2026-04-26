/**
 * User-tunable preferences for trade notification toasts.
 * Persisted in localStorage, broadcast via window event so live hooks can react
 * without remounting.
 */

const STORAGE_KEY = "trade-notif-prefs:v1";
const EVENT_NAME = "trade-notif-prefs-changed";

export interface TradeNotifPrefs {
  /** Toast on trade accepted/rejected. When false, only inbox push fires. */
  toastDecisions: boolean;
  /** Show cancelled/expired in toast as well. When false (default) → inbox only. */
  toastPassive: boolean;
}

export const DEFAULT_TRADE_NOTIF_PREFS: TradeNotifPrefs = {
  toastDecisions: true,
  toastPassive: false,
};

export const getTradeNotifPrefs = (): TradeNotifPrefs => {
  if (typeof window === "undefined") return { ...DEFAULT_TRADE_NOTIF_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRADE_NOTIF_PREFS };
    const parsed = JSON.parse(raw);
    return {
      toastDecisions:
        typeof parsed?.toastDecisions === "boolean"
          ? parsed.toastDecisions
          : DEFAULT_TRADE_NOTIF_PREFS.toastDecisions,
      toastPassive:
        typeof parsed?.toastPassive === "boolean"
          ? parsed.toastPassive
          : DEFAULT_TRADE_NOTIF_PREFS.toastPassive,
    };
  } catch {
    return { ...DEFAULT_TRADE_NOTIF_PREFS };
  }
};

export const setTradeNotifPrefs = (next: Partial<TradeNotifPrefs>) => {
  if (typeof window === "undefined") return;
  const merged = { ...getTradeNotifPrefs(), ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: merged }));
  } catch {
    /* ignore quota */
  }
};

export const subscribeTradeNotifPrefs = (cb: (prefs: TradeNotifPrefs) => void) => {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<TradeNotifPrefs>).detail;
    if (detail) cb(detail);
    else cb(getTradeNotifPrefs());
  };
  window.addEventListener(EVENT_NAME, handler);
  // Cross-tab sync via storage event
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb(getTradeNotifPrefs());
  };
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener("storage", storageHandler);
  };
};
