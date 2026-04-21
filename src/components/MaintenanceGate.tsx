import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Maintenance from "@/pages/Maintenance";

interface MaintenanceConfig {
  enabled: boolean;
  message?: string;
  estimated_time?: string;
}

/**
 * Routes always allowed even during maintenance (admins login, contact, etc.).
 */
const ALLOWED_PREFIXES = ["/admin", "/login", "/register", "/forgot-password", "/reset-password"];

const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Subscribe to maintenance_mode changes
  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      if (!mounted) return;
      const v = (data?.value as MaintenanceConfig | null) ?? { enabled: false };
      setConfig({
        enabled: !!v.enabled,
        message: v.message || "",
        estimated_time: v.estimated_time || "",
      });
    };
    fetchConfig();

    const channel = supabase
      .channel("maintenance-mode-watch")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: "key=eq.maintenance_mode" },
        () => fetchConfig(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Check admin role for current user
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" as const })
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Wait for config + auth
  if (config === null || authLoading || (user && isAdmin === null)) {
    return <>{children}</>;
  }

  const onAllowedRoute = ALLOWED_PREFIXES.some((p) => location.pathname.startsWith(p));

  if (config.enabled && !isAdmin && !onAllowedRoute) {
    return <Maintenance message={config.message || undefined} estimatedTime={config.estimated_time || undefined} />;
  }

  return <>{children}</>;
};

export default MaintenanceGate;
