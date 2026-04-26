import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Trash2, CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, NotificationKind } from "@/context/NotificationsContext";
import { cn } from "@/lib/utils";

const KindIcon = ({ kind }: { kind: NotificationKind }) => {
  const className = "h-4 w-4 shrink-0";
  if (kind === "success") return <CheckCircle2 className={cn(className, "text-green-500")} />;
  if (kind === "error") return <XCircle className={cn(className, "text-destructive")} />;
  if (kind === "warning") return <AlertTriangle className={cn(className, "text-orange-400")} />;
  return <Info className={cn(className, "text-primary")} />;
};

const formatRelative = (ts: number) => {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hr lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

interface InboxBellProps {
  variant?: "desktop" | "mobile";
}

const InboxBell = ({ variant = "desktop" }: InboxBellProps) => {
  const { items, unreadCount, markAllRead, markRead, remove, clearAll } = useNotifications();
  const [shake, setShake] = useState(false);
  const prevUnreadRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 650);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const trigger =
    variant === "desktop" ? (
      <button
        aria-label={`Inbox notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground origin-center",
              shake && "animate-badge-shake",
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    ) : (
      <button
        aria-label="Inbox notifikasi"
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="relative inline-flex">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground origin-center",
                shake && "animate-badge-shake",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        Inbox
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Inbox</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="Tandai semua dibaca"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </button>
            )}
            {items.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                title="Hapus semua"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Belum ada notifikasi</p>
            <p className="mt-1 text-xs text-muted-foreground/80">
              Status gift dan update penting akan muncul di sini.
            </p>

            <div className="mt-4 rounded-md border border-border/60 bg-secondary/40 p-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Tentang trade
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Notifikasi inbox hanya muncul saat <span className="font-medium text-foreground">trade direct-target</span> dibuat untuk kamu, atau saat trade kamu di-accept / reject / cancel / expired.
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Untuk <span className="font-medium text-foreground">trade link terbuka</span>, partner harus membuka link kamu — kamu akan dapat ping di sini begitu mereka mengkliknya.
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y divide-border/50">
              {items.map((n) => {
                const Body = (
                  <div className="flex items-start gap-2.5 px-3 py-2.5">
                    <KindIcon kind={n.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            n.read ? "text-muted-foreground" : "font-semibold text-foreground",
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      {n.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.description}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground/70">
                          {formatRelative(n.createdAt)}
                        </span>
                        <div className="flex items-center gap-2">
                          {!n.read && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markRead(n.id);
                              }}
                              className="text-[10px] font-semibold text-primary transition-colors hover:text-primary/80"
                            >
                              Baca
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              remove(n.id);
                            }}
                            className="text-[10px] text-muted-foreground/70 transition-colors hover:text-destructive"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <li key={n.id} className={cn(!n.read && "bg-primary/5")}>
                    {n.href ? (
                      <Link to={n.href} onClick={() => markRead(n.id)} className="block hover:bg-secondary/50">
                        {Body}
                      </Link>
                    ) : (
                      <button
                        onClick={() => markRead(n.id)}
                        className="block w-full text-left hover:bg-secondary/50"
                      >
                        {Body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InboxBell;
