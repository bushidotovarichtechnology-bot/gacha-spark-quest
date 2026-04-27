import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Loader2, ArrowLeftRight, Coins, CheckCircle2, XCircle, Clock, Ban, RefreshCw, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TradeRow {
  id: string;
  token: string;
  initiator_id: string;
  responder_id: string | null;
  recipient_id: string | null;
  initiator_items: unknown;
  responder_items: unknown;
  tier_label: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

interface PartyProfile {
  user_id: string;
  username: string | null;
  display_name: string;
}

interface CacheEntry {
  rows: TradeRow[];
  profiles: Record<string, PartyProfile>;
  hasMore: boolean;
  fetchedAt: number;
}

const COMPLETED_STATUSES = ["accepted", "rejected", "cancelled", "expired"] as const;
const PAGE_SIZE = 10;
const CACHE_TTL_MS = 60_000; // 1 minute

// Module-level in-memory cache, keyed by user id.
const historyCache = new Map<string, CacheEntry>();

const statusMeta = (status: string) => {
  switch (status) {
    case "accepted":
      return { label: "Berhasil", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" };
    case "rejected":
      return { label: "Ditolak", icon: XCircle, className: "bg-destructive/15 text-destructive border-destructive/30" };
    case "cancelled":
      return { label: "Dibatalkan", icon: Ban, className: "bg-muted text-muted-foreground border-border" };
    case "expired":
      return { label: "Kedaluwarsa", icon: Clock, className: "bg-muted text-muted-foreground border-border" };
    default:
      return { label: status, icon: Clock, className: "bg-muted text-muted-foreground border-border" };
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const TradeHistoryList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PartyProfile>>({});
  const [hasMore, setHasMore] = useState(false);
  const reqIdRef = useRef(0);

  const fetchPage = useCallback(
    async (
      userId: string,
      beforeUpdatedAt: string | null,
      currentProfiles: Record<string, PartyProfile>,
    ): Promise<{ rows: TradeRow[]; profiles: Record<string, PartyProfile>; hasMore: boolean }> => {
      let query = supabase
        .from("trades")
        .select("*")
        .in("status", COMPLETED_STATUSES as unknown as string[])
        .or(`initiator_id.eq.${userId},responder_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("updated_at", { ascending: false })
        .limit(PAGE_SIZE + 1);
      if (beforeUpdatedAt) {
        query = query.lt("updated_at", beforeUpdatedAt);
      }
      const { data, error } = await query;
      if (error) throw error;
      const all = (data ?? []) as unknown as TradeRow[];
      const more = all.length > PAGE_SIZE;
      const rows = more ? all.slice(0, PAGE_SIZE) : all;

      // Resolve missing partner profiles only.
      const ids = new Set<string>();
      rows.forEach((r) => {
        ids.add(r.initiator_id);
        if (r.responder_id) ids.add(r.responder_id);
        if (r.recipient_id) ids.add(r.recipient_id);
      });
      ids.delete(userId);
      const missing = Array.from(ids).filter((id) => !currentProfiles[id]);
      const nextProfiles = { ...currentProfiles };
      if (missing.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", missing);
        profs?.forEach((p) => {
          nextProfiles[p.user_id] = p as PartyProfile;
        });
      }

      return { rows, profiles: nextProfiles, hasMore: more };
    },
    [],
  );

  const loadInitial = useCallback(
    async (userId: string, force = false) => {
      const reqId = ++reqIdRef.current;
      const cached = historyCache.get(userId);
      const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

      if (cached && !force) {
        setTrades(cached.rows);
        setProfiles(cached.profiles);
        setHasMore(cached.hasMore);
        setLoading(false);
        if (fresh) return; // Skip refetch when cache is still warm.
      } else {
        setLoading(true);
      }

      if (force) setRefreshing(true);
      try {
        const { rows, profiles: nextProfiles, hasMore: more } = await fetchPage(userId, null, {});
        if (reqId !== reqIdRef.current) return;
        historyCache.set(userId, { rows, profiles: nextProfiles, hasMore: more, fetchedAt: Date.now() });
        setTrades(rows);
        setProfiles(nextProfiles);
        setHasMore(more);
      } catch {
        if (reqId !== reqIdRef.current) return;
        if (!cached) {
          setTrades([]);
          setHasMore(false);
        }
      } finally {
        if (reqId === reqIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    if (!user) return;
    loadInitial(user.id);
  }, [user, loadInitial]);

  // --- Search state ---
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const partnerIdOf = useCallback(
    (row: TradeRow): string | null => {
      if (!user) return null;
      return row.initiator_id === user.id
        ? row.responder_id ?? row.recipient_id
        : row.initiator_id;
    },
    [user],
  );

  const matchesQuery = useCallback(
    (row: TradeRow, q: string) => {
      if (!q) return true;
      const pid = partnerIdOf(row);
      if (!pid) return false;
      if (pid.toLowerCase().includes(q)) return true;
      const p = profiles[pid];
      if (!p) return false;
      return (
        (p.username ?? "").toLowerCase().includes(q) ||
        (p.display_name ?? "").toLowerCase().includes(q)
      );
    },
    [partnerIdOf, profiles],
  );

  const filteredTrades = useMemo(
    () => trades.filter((r) => matchesQuery(r, searchQuery)),
    [trades, searchQuery, matchesQuery],
  );

  const handleLoadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore || trades.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = trades[trades.length - 1].updated_at;
      const { rows, profiles: nextProfiles, hasMore: more } = await fetchPage(user.id, cursor, profiles);
      const merged = [...trades, ...rows];
      setTrades(merged);
      setProfiles(nextProfiles);
      setHasMore(more);
      historyCache.set(user.id, { rows: merged, profiles: nextProfiles, hasMore: more, fetchedAt: Date.now() });
    } catch {
      // keep existing list on error
    } finally {
      setLoadingMore(false);
    }
  }, [user, loadingMore, hasMore, trades, profiles, fetchPage]);

  // When searching: if filtered list is empty but more pages exist,
  // auto-fetch next page so search keeps drilling deeper.
  useEffect(() => {
    if (!searchQuery) return;
    if (loading || loadingMore) return;
    if (filteredTrades.length > 0) return;
    if (!hasMore) return;
    handleLoadMore();
  }, [searchQuery, filteredTrades.length, hasMore, loading, loadingMore, handleLoadMore]);

  const handleRefresh = () => {
    if (!user) return;
    historyCache.delete(user.id);
    loadInitial(user.id, true);
  };

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Memuat riwayat trade…
      </Card>
    );
  }

  if (trades.length === 0) {
    return (
      <Card className="p-8 text-center">
        <ArrowLeftRight className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Belum ada riwayat trade</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Trade yang sudah selesai (berhasil/ditolak/dibatalkan/expired) akan tampil di sini.
        </p>
      </Card>
    );
  }

  const partnerLabel = (row: TradeRow) => {
    if (!user) return "—";
    const pid = partnerIdOf(row);
    if (!pid) return "Belum ada partner";
    const p = profiles[pid];
    if (!p) return "Pengguna";
    if (p.username) return `@${p.username}`;
    return p.display_name || "Pengguna";
  };

  const itemCount = (val: unknown) => (Array.isArray(val) ? val.length : 0);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari berdasarkan username atau ID partner…"
          className="pl-9 pr-9"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Hapus pencarian"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {searchQuery
            ? `${filteredTrades.length} cocok dari ${trades.length} dimuat${hasMore ? "+" : ""}`
            : `Menampilkan ${trades.length} riwayat${hasMore ? "+" : ""}`}
        </p>
        <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-1 h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {filteredTrades.length === 0 && searchQuery && !hasMore && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Tidak ada partner yang cocok dengan "{searchInput}".
        </Card>
      )}

      {filteredTrades.map((row) => {
        const meta = statusMeta(row.status);
        const Icon = meta.icon;
        const isInitiator = user?.id === row.initiator_id;
        const myItems = isInitiator ? itemCount(row.initiator_items) : itemCount(row.responder_items);
        const partnerItems = isInitiator ? itemCount(row.responder_items) : itemCount(row.initiator_items);
        return (
          <Card key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={meta.className}>
                    <Icon className="mr-1 h-3 w-3" />
                    {meta.label}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">Tier {row.tier_label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {isInitiator ? "Kamu sebagai pengirim" : "Kamu sebagai responder"}
                  </span>
                </div>
                <div className="mt-2 truncate text-sm text-foreground">
                  Partner: <span className="font-semibold text-primary">{partnerLabel(row)}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {myItems} item kamu ↔ {partnerItems} item partner
                  </span>
                  <span>{formatDate(row.updated_at)}</span>
                </div>
                {row.message && (
                  <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">
                    "{row.message}"
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/trade/req/${row.token}`)}
              >
                Detail
              </Button>
            </div>
          </Card>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memuat…
              </>
            ) : searchQuery ? (
              "Cari lebih dalam"
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TradeHistoryList;

