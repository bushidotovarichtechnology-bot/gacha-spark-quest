import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeRtStatus } from "@/hooks/use-trade-notifications";

/**
 * Floating chip showing the realtime connection state for trade events.
 * Listens to the `trade-rt-status` window event emitted by useTradeNotifications.
 *
 * - `online`        → green dot, hidden after 2s of stable connection.
 * - `reconnecting`  → spinning icon (visible whenever fallback refetch runs).
 * - `missed-sync`   → destructive chip, sticky until next successful reconcile.
 */
export const TradeRealtimeIndicator = () => {
  const [status, setStatus] = useState<TradeRtStatus>("reconnecting");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent<{ status: TradeRtStatus }>).detail;
      if (!detail?.status) return;
      setStatus(detail.status);
      setVisible(true);
      if (detail.status === "online") {
        const t = window.setTimeout(() => setVisible(false), 2000);
        return () => window.clearTimeout(t);
      }
    };
    window.addEventListener("trade-rt-status", onStatus);
    return () => window.removeEventListener("trade-rt-status", onStatus);
  }, []);

  if (!visible && status === "online") return null;

  const config = {
    online: {
      icon: <Wifi className="h-3 w-3" />,
      label: "Online",
      cls: "bg-[hsl(var(--tier-b))]/15 text-[hsl(var(--tier-b))] border-[hsl(var(--tier-b))]/40",
    },
    reconnecting: {
      icon: <RefreshCw className="h-3 w-3 animate-spin" />,
      label: "Reconnecting…",
      cls: "bg-accent/15 text-accent border-accent/40",
    },
    "missed-sync": {
      icon: <WifiOff className="h-3 w-3" />,
      label: "Missed sync",
      cls: "bg-destructive/15 text-destructive border-destructive/40",
    },
  }[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-4 left-4 z-[90] flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-md backdrop-blur-sm transition-opacity",
        config.cls,
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};
