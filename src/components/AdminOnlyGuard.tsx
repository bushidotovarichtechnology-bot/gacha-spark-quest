import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * AdminOnlyGuard
 *
 * Wraps sensitive admin-only content (e.g. stock audit, gacha logs) and renders
 * one of three states:
 *  1. Loading → spinner placeholder while we verify the role.
 *  2. Unauthorized → an explicit "Admin only" card with a link back home /
 *     to the admin login. **Children are NOT rendered.**
 *  3. Authorized → renders children.
 *
 * This is intentionally a *visible* guard (vs. AdminProtectedRoute which only
 * redirects). Useful for nested panels, audit dashboards, or any UI that
 * should make the access boundary obvious to the viewer.
 */
const AdminOnlyGuard = ({
  children,
  title = "Admin only",
  message = "You don't have permission to view this content. This area is restricted to administrators.",
}: {
  children: React.ReactNode;
  title?: string;
  message?: string;
}) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" as const })
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/40 bg-destructive/5">
          <CardHeader className="items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="flex items-center gap-2 font-display tracking-wider">
              <Lock className="h-4 w-4" /> {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild variant="outline" size="sm">
                <Link to="/">
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back to home
                </Link>
              </Button>
              {!user && (
                <Button asChild size="sm">
                  <Link to="/admin/login">Admin login</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminOnlyGuard;
