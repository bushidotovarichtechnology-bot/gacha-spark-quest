import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Sign out from Supabase (global scope clears all sessions/refresh tokens)
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (e) {
      // Continue cleanup even if remote sign-out fails
      console.warn("Supabase signOut error (continuing cleanup):", e);
    }

    // Clear local auth state immediately
    setSession(null);
    setUser(null);

    // Purge any persisted Supabase auth tokens & related caches from storage
    try {
      const purgeKeys = (storage: Storage) => {
        const toRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;
          if (
            key.startsWith("sb-") ||
            key.startsWith("supabase.") ||
            key.includes("supabase.auth") ||
            key.startsWith("lovable.auth") ||
            key.startsWith("lovable-auth") ||
            key.includes("oauth")
          ) {
            toRemove.push(key);
          }
        }
        toRemove.forEach((k) => storage.removeItem(k));
      };
      purgeKeys(localStorage);
      purgeKeys(sessionStorage);
    } catch (e) {
      console.warn("Storage purge error:", e);
    }

    // Best-effort: clear Cache Storage entries that might hold auth responses
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => /auth|supabase|oauth|lovable/i.test(k))
            .map((k) => caches.delete(k))
        );
      }
    } catch (e) {
      console.warn("Cache purge error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
