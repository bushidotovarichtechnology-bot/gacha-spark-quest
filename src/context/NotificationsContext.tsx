import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type NotificationKind = "success" | "error" | "info" | "warning";

export interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  kind: NotificationKind;
  createdAt: number;
  read: boolean;
  href?: string;
  /** Optional stable key used to dedupe identical notifications (e.g. gift row id + status). */
  dedupKey?: string;
}

interface NotificationsContextValue {
  items: NotificationItem[];
  unreadCount: number;
  push: (n: Omit<NotificationItem, "id" | "createdAt" | "read">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const MAX_ITEMS = 50;
const MAX_ACK_KEYS = 500;
const storageKey = (uid: string | null | undefined) =>
  uid ? `inbox-notifications:${uid}` : "inbox-notifications:guest";
const ackStorageKey = (uid: string | null | undefined) =>
  uid ? `inbox-acked-dedup:${uid}` : "inbox-acked-dedup:guest";

/** Read acknowledged dedupKeys for a user. Used by toast emitters to suppress
 *  re-firing for events the user already marked as read. */
export const getAckedDedupKeys = (uid: string | null | undefined): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ackStorageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(user?.id));
      if (raw) {
        const parsed = JSON.parse(raw) as NotificationItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setItems([]);
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(user?.id), JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, user?.id]);

  const push = useCallback<NotificationsContextValue["push"]>((n) => {
    setItems((curr) => {
      // Dedupe: if dedupKey given and an item already exists with the same key, skip insert.
      if (n.dedupKey && curr.some((i) => i.dedupKey === n.dedupKey)) {
        return curr;
      }
      const next: NotificationItem = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: Date.now(),
        read: false,
        ...n,
      };
      return [next, ...curr].slice(0, MAX_ITEMS);
    });
  }, []);

  const persistAck = useCallback(
    (keys: string[]) => {
      if (keys.length === 0) return;
      try {
        const existing = getAckedDedupKeys(user?.id);
        const merged = Array.from(new Set([...existing, ...keys])).slice(-MAX_ACK_KEYS);
        localStorage.setItem(ackStorageKey(user?.id), JSON.stringify(merged));
        // Broadcast so live hooks (e.g. useTradeNotifications) can suppress future toasts.
        window.dispatchEvent(new CustomEvent("inbox-acked", { detail: { keys } }));
      } catch {
        /* ignore quota */
      }
    },
    [user?.id],
  );

  const markAllRead = useCallback(() => {
    setItems((curr) => {
      if (!curr.some((i) => !i.read)) return curr;
      const ackKeys = curr.filter((i) => !i.read && i.dedupKey).map((i) => i.dedupKey as string);
      persistAck(ackKeys);
      return curr.map((i) => ({ ...i, read: true }));
    });
  }, [persistAck]);

  const markRead = useCallback(
    (id: string) => {
      setItems((curr) => {
        const target = curr.find((i) => i.id === id);
        if (target && !target.read && target.dedupKey) persistAck([target.dedupKey]);
        return curr.map((i) => (i.id === id ? { ...i, read: true } : i));
      });
    },
    [persistAck],
  );

  const remove = useCallback((id: string) => {
    setItems((curr) => curr.filter((i) => i.id !== id));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);

  const unreadCount = items.reduce((acc, i) => acc + (i.read ? 0 : 1), 0);

  return (
    <NotificationsContext.Provider
      value={{ items, unreadCount, push, markAllRead, markRead, remove, clearAll }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
};
