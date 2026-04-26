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
const storageKey = (uid: string | null | undefined) =>
  uid ? `inbox-notifications:${uid}` : "inbox-notifications:guest";

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

  const markAllRead = useCallback(() => {
    setItems((curr) => (curr.some((i) => !i.read) ? curr.map((i) => ({ ...i, read: true })) : curr));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((curr) => curr.map((i) => (i.id === id ? { ...i, read: true } : i)));
  }, []);

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
