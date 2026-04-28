import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AdminCheck =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "denied" }
  | { status: "error"; message: string };

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [check, setCheck] = useState<AdminCheck>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;

    void (async () => {
      try {
        setCheck({ status: "checking" });

        let currentUser = user;
        if (!currentUser) {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (cancelled) return;
          if (sessionError) {
            setCheck({ status: "error", message: sessionError.message || "Gagal memulihkan sesi admin." });
            return;
          }
          currentUser = sessionData.session?.user ?? null;
        }

        if (!currentUser) {
          setCheck({ status: "denied" });
          return;
        }

        const { data, error } = await supabase.rpc("has_role", { _user_id: currentUser.id, _role: "admin" as const });
        if (cancelled) return;
        if (error) {
          setCheck({ status: "error", message: error.message || "Gagal memeriksa akses admin." });
          return;
        }
        setCheck(data ? { status: "allowed" } : { status: "denied" });
      } catch (error) {
        if (cancelled) return;
        setCheck({ status: "error", message: error instanceof Error ? error.message : "Gagal memeriksa akses admin." });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  if (check.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-lg">
          <h1 className="font-display text-lg font-bold text-foreground">Admin belum bisa dibuka</h1>
          <p className="mt-2 text-sm text-muted-foreground">{check.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Muat ulang
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || check.status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
      </div>
    );
  }

  if (check.status === "denied") {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
