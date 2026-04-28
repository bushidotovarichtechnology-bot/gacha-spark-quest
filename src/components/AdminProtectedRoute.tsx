import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setCheckError(null);
      return;
    }

    setIsAdmin(null);
    setCheckError(null);

    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" as const })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setCheckError(error.message || "Gagal memeriksa akses admin.");
          setIsAdmin(false);
          return;
        }
        setIsAdmin(!!data);
      })
      .catch((error) => {
        if (cancelled) return;
        setCheckError(error instanceof Error ? error.message : "Gagal memeriksa akses admin.");
        setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  if (checkError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-lg">
          <h1 className="font-display text-lg font-bold text-foreground">Admin belum bisa dibuka</h1>
          <p className="mt-2 text-sm text-muted-foreground">{checkError}</p>
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

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
