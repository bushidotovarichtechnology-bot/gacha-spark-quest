import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface RateUpStatus {
  is_rate_up: boolean;
  user_index: number | null;
  multiplier: number;
  limit: number;
  ends_at: string | null;
  expired: boolean;
}

const DEFAULT: RateUpStatus = {
  is_rate_up: false,
  user_index: null,
  multiplier: 1.0,
  limit: 100,
  ends_at: null,
  expired: false,
};

/**
 * Cek apakah user termasuk 100 pendaftar pertama yang berhak rate-up 1.5x.
 * Validasi sepenuhnya server-side via SECURITY DEFINER function.
 */
export function useRateUpStatus() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<RateUpStatus>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus(DEFAULT);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc("get_rate_up_status" as any, { _user_id: user.id })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setStatus(DEFAULT);
        } else {
          const d = data as any;
          setStatus({
            is_rate_up: !!d.is_rate_up,
            user_index: d.user_index ?? null,
            multiplier: Number(d.multiplier ?? 1.0),
            limit: Number(d.limit ?? 100),
          });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { ...status, loading };
}
