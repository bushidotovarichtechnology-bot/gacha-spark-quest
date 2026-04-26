import { useEffect, useState, useCallback } from "react";
import { Bug, X, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { tradeNotifLog } from "@/lib/tradeNotificationLog";

/**
 * Floating debug panel for verifying trade notification dedup behavior.
 *
 * Surfaces:
 *  - In-memory `firedKeys` from useTradeNotifications (reset per session/login).
 *  - Persisted `dedupKey` values on inbox items in localStorage (survive reloads).
 *  - Coverage histogram + recent log entries from tradeNotifLog.
 *
 * Mount via `?debugTrade=1` query param OR localStorage flag `trade-debug=1`.
 * Designed to be lightweight — only rendered when explicitly enabled.
 */
export const TradeNotifDebugPanel = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("debugTrade") === "1" || localStorage.getItem("trade-debug") === "1";
    if (params.get("debugTrade") === "1") localStorage.setItem("trade-debug", "1");
    setEnabled(flag);
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  if (!enabled) return null;

  const firedKeys: string[] =
    (typeof window !== "undefined" &&
      (window as unknown as { __tradeFiredKeys?: () => string[] }).__tradeFiredKeys?.()) ||
    [];

  const storageKey = user?.id ? `inbox-notifications:${user.id}` : "inbox-notifications:guest";
  let storedDedupKeys: string[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        storedDedupKeys = parsed
          .map((i: { dedupKey?: string }) => i.dedupKey)
          .filter((k): k is string => typeof k === "string");
      }
    }
  } catch {
    /* ignore */
  }

  const coverage = tradeNotifLog.coverage();
  const recent = tradeNotifLog.dump().slice(-8).reverse();

  // Suppress unused tick warning (used to force re-read of mutable refs/storage)
  void tick;

  if (!open) {
    return (
      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-4 right-4 z-[100] shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Open trade debug panel"
      >
        <Bug className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-[100] w-[360px] max-h-[70vh] shadow-2xl border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bug className="h-4 w-4" /> Trade Notif Debug
        </CardTitle>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={refresh} aria-label="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              tradeNotifLog.clear();
              refresh();
            }}
            aria-label="Clear log"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 text-xs">
        <ScrollArea className="h-[55vh] pr-2">
          <section className="mb-3">
            <div className="font-semibold mb-1">
              firedKeys (in-memory) <Badge variant="secondary">{firedKeys.length}</Badge>
            </div>
            {firedKeys.length === 0 ? (
              <p className="text-muted-foreground">Empty — resets on reload/login.</p>
            ) : (
              <ul className="space-y-0.5 font-mono">
                {firedKeys.map((k) => (
                  <li key={k} className="truncate">{k}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-3">
            <div className="font-semibold mb-1">
              localStorage dedupKeys <Badge variant="secondary">{storedDedupKeys.length}</Badge>
            </div>
            {storedDedupKeys.length === 0 ? (
              <p className="text-muted-foreground">No persisted dedupKeys.</p>
            ) : (
              <ul className="space-y-0.5 font-mono">
                {storedDedupKeys.map((k, i) => (
                  <li key={`${k}-${i}`} className="truncate">{k}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="mb-3">
            <div className="font-semibold mb-1">Coverage</div>
            {Object.keys(coverage).length === 0 ? (
              <p className="text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {Object.entries(coverage).map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span className="truncate">{k}</span>
                    <span className="text-muted-foreground">{v}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="font-semibold mb-1">Recent ({recent.length})</div>
            {recent.length === 0 ? (
              <p className="text-muted-foreground">No log entries.</p>
            ) : (
              <ul className="space-y-1">
                {recent.map((e, i) => (
                  <li key={i} className="border-l-2 border-border pl-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-mono">{e.kind}</span>
                      <span className="text-muted-foreground">{e.fired ? "✓" : "·"}</span>
                    </div>
                    <div className="text-muted-foreground truncate">
                      {e.source} · {e.prevStatus ?? "∅"}→{e.nextStatus}
                    </div>
                    {e.dedupKey && <div className="font-mono truncate text-[10px]">{e.dedupKey}</div>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </ScrollArea>
        <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
          Toggle off:{" "}
          <button
            className="underline"
            onClick={() => {
              localStorage.removeItem("trade-debug");
              setEnabled(false);
            }}
          >
            disable
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
