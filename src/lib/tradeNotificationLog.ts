/**
 * Internal ring-buffer logger for trade realtime/notification events.
 *
 * Goals:
 *  - Inspect dedupKey coverage for every accepted/rejected/cancelled/expired
 *    transition + responder-claim event without polluting console output in
 *    production.
 *  - Compare realtime vs. fallback-polling sources to spot missed broadcasts.
 *  - Survive reloads via sessionStorage so we can verify dedup across tab
 *    refreshes within the same browser session.
 *
 * Access from the browser console:
 *   window.__tradeNotifLog.dump()              // tabular log
 *   window.__tradeNotifLog.coverage()          // event-kind histogram
 *   window.__tradeNotifLog.byTrade(tradeId)    // filter to one trade
 *   window.__tradeNotifLog.clear()             // wipe buffer
 */

export type TradeNotifSource =
  | "realtime-insert"
  | "realtime-update"
  | "reconcile-poll"
  | "reconcile-init"
  | "reconcile-visibility"
  | "reconcile-online";

export type TradeNotifKind =
  | "incoming"
  | "claimed"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "expired"
  | "skipped-init"
  | "skipped-no-change"
  | "deduped";

export interface TradeNotifLogEntry {
  ts: string;
  tradeId: string;
  tier: string;
  kind: TradeNotifKind;
  source: TradeNotifSource;
  dedupKey: string | null;
  prevStatus: string | null;
  nextStatus: string;
  fired: boolean;
  note?: string;
}

const MAX_ENTRIES = 200;
const STORAGE_KEY = "trade_notif_log_v1";

let buffer: TradeNotifLogEntry[] = [];

const loadInitial = () => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) buffer = parsed.slice(-MAX_ENTRIES);
  } catch {
    /* corrupt storage — ignore, fresh buffer */
  }
};
loadInitial();

const persist = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    /* quota exceeded — drop silently */
  }
};

export const logTradeNotif = (entry: Omit<TradeNotifLogEntry, "ts">) => {
  const full: TradeNotifLogEntry = { ts: new Date().toISOString(), ...entry };
  buffer.push(full);
  if (buffer.length > MAX_ENTRIES) buffer = buffer.slice(-MAX_ENTRIES);
  persist();
  // Mirror to console under a debug flag so power-users can opt in.
  if (typeof window !== "undefined" && (window as unknown as { __tradeNotifDebug?: boolean }).__tradeNotifDebug) {
    // eslint-disable-next-line no-console
    console.debug("[tradeNotif]", full);
  }
};

const coverage = () => {
  const buckets: Record<string, number> = {};
  buffer.forEach((e) => {
    const k = `${e.kind}:${e.fired ? "fired" : "skipped"}`;
    buckets[k] = (buckets[k] ?? 0) + 1;
  });
  return buckets;
};

const byTrade = (tradeId: string) => buffer.filter((e) => e.tradeId === tradeId);

const dump = () => buffer.slice();

const clear = () => {
  buffer = [];
  persist();
};

// Expose in browser for console-level debugging. No-ops on SSR.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__tradeNotifLog = {
    dump,
    coverage,
    byTrade,
    clear,
    enableConsole: () => { (window as unknown as { __tradeNotifDebug?: boolean }).__tradeNotifDebug = true; },
    disableConsole: () => { (window as unknown as { __tradeNotifDebug?: boolean }).__tradeNotifDebug = false; },
  };
}

export const tradeNotifLog = { dump, coverage, byTrade, clear };
