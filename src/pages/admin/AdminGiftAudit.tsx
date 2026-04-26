import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Copy, CheckCircle2, XCircle, Clock, ArrowRight, RotateCw, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GiftRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  receiver_email: string;
  amount: number;
  message: string;
  request_id: string | null;
  status: string;
  error_message?: string | null;
  created_at: string;
}

interface UserMap {
  [userId: string]: { email: string };
}

const PAGE_SIZE = 50;

const AdminGiftAudit = () => {
  const { toast } = useToast();
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<GiftRow | null>(null);
  const [page, setPage] = useState(1);

  const loadAll = async () => {
    setRefreshing(true);
    try {
      const [{ data: giftRows, error: giftErr }, { data: userRows, error: userErr }] = await Promise.all([
        supabase
          .from("coin_gifts")
          .select("id, sender_id, receiver_id, receiver_email, amount, message, request_id, status, error_message, created_at" as any)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.rpc("get_all_users_admin"),
      ]);
      if (giftErr) throw giftErr;
      if (userErr) throw userErr;

      setGifts((giftRows as unknown as GiftRow[]) || []);
      const map: UserMap = {};
      (userRows || []).forEach((u: any) => {
        map[u.id] = { email: u.email || "" };
      });
      setUsers(map);
    } catch (err: any) {
      toast({ title: "Gagal memuat", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Realtime updates so audit reflects new gifts/status changes immediately
  useEffect(() => {
    const channel = supabase
      .channel("admin-gift-audit")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coin_gifts" },
        () => loadAll(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 : Infinity;

    return gifts.filter((g) => {
      const senderEmail = users[g.sender_id]?.email?.toLowerCase() || "";
      const receiverEmail = (g.receiver_email || users[g.receiver_id]?.email || "").toLowerCase();
      const ts = new Date(g.created_at).getTime();

      if (statusFilter !== "all" && (g.status || "success").toLowerCase() !== statusFilter) return false;
      if (ts < fromTs || ts > toTs) return false;

      if (!q) return true;
      return (
        senderEmail.includes(q) ||
        receiverEmail.includes(q) ||
        (g.request_id || "").toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q) ||
        g.sender_id.toLowerCase().includes(q) ||
        g.receiver_id.toLowerCase().includes(q)
      );
    });
  }, [gifts, users, search, statusFilter, dateFrom, dateTo]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const s = { total: filtered.length, success: 0, processing: 0, error: 0, totalCoins: 0 };
    filtered.forEach((g) => {
      const st = (g.status || "success").toLowerCase();
      if (st === "success") {
        s.success++;
        s.totalCoins += g.amount;
      } else if (st === "processing") s.processing++;
      else if (st === "error") s.error++;
    });
    return s;
  }, [filtered]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Disalin", description: `${label} disalin ke clipboard` });
    } catch {
      toast({ title: "Gagal menyalin", variant: "destructive" });
    }
  };

  const exportCsv = () => {
    const header = ["created_at", "status", "request_id", "gift_id", "sender_email", "sender_id", "receiver_email", "receiver_id", "amount", "error_message", "message"];
    const rows = filtered.map((g) => [
      new Date(g.created_at).toISOString(),
      g.status || "success",
      g.request_id || "",
      g.id,
      users[g.sender_id]?.email || "",
      g.sender_id,
      g.receiver_email || users[g.receiver_id]?.email || "",
      g.receiver_id,
      String(g.amount),
      (g.error_message || "").replace(/"/g, '""'),
      (g.message || "").replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gift-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const s = (status || "success").toLowerCase();
    if (s === "error") {
      return (
        <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
          <XCircle className="mr-1 h-3 w-3" /> Error
        </Badge>
      );
    }
    if (s === "processing") {
      return (
        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-500">
          <Clock className="mr-1 h-3 w-3 animate-pulse" /> Processing
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-green-500/40 bg-green-500/10 text-green-500">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Success
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider">Gift Coins Audit</h1>
          <p className="text-sm text-muted-foreground">Telusuri pengiriman gift koin berdasarkan request_id, sender, atau receiver.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAll} disabled={refreshing}>
            <RotateCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total (filter)</p>
            <p className="font-display text-2xl font-bold">{stats.total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Success</p>
            <p className="font-display text-2xl font-bold text-green-500">{stats.success.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Processing / Error</p>
            <p className="font-display text-2xl font-bold">
              <span className="text-amber-500">{stats.processing}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-destructive">{stats.error}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total Koin Sukses</p>
            <p className="font-display text-2xl font-bold text-accent">{stats.totalCoins.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" /> Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Cari (email, request_id, gift_id, user_id)</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="user@example.com atau UUID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Dari</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Sampai</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Gift className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Tidak ada pengiriman gift yang cocok.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/50 bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Waktu</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Pengirim</th>
                    <th className="px-3 py-2 font-medium" />
                    <th className="px-3 py-2 font-medium">Penerima</th>
                    <th className="px-3 py-2 text-right font-medium">Koin</th>
                    <th className="px-3 py-2 font-medium">Request ID</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((g) => {
                    const senderEmail = users[g.sender_id]?.email || "(unknown)";
                    const receiverEmail = g.receiver_email || users[g.receiver_id]?.email || "(unknown)";
                    const date = new Date(g.created_at);
                    return (
                      <tr key={g.id} className="border-b border-border/30 hover:bg-secondary/30">
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}
                          <br />
                          <span className="text-[10px]">{date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={g.status} />
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2 text-xs" title={senderEmail}>
                          {senderEmail}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <ArrowRight className="h-3 w-3" />
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2 text-xs" title={receiverEmail}>
                          {receiverEmail}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-accent">
                          {g.amount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                          {g.request_id ? (
                            <button
                              onClick={() => copy(g.request_id!, "Request ID")}
                              className="inline-flex items-center gap-1 hover:text-foreground"
                              title={g.request_id}
                            >
                              {g.request_id.slice(0, 8)}…
                              <Copy className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDetail(g);
                              setDetailOpen(true);
                            }}
                          >
                            Detail
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 border-t border-border/50 px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Halaman {page} dari {totalPages} · {filtered.length.toLocaleString()} entri
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Sebelumnya
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-accent" />
              Detail Gift
            </DialogTitle>
            <DialogDescription>Audit lengkap untuk satu pengiriman koin.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <Row label="Status">
                <StatusBadge status={detail.status} />
              </Row>
              <Row label="Waktu">{new Date(detail.created_at).toLocaleString("id-ID")}</Row>
              <Row label="Jumlah">
                <span className="font-mono font-bold text-accent">{detail.amount.toLocaleString()} koin</span>
              </Row>
              <CopyRow label="Gift ID" value={detail.id} onCopy={copy} />
              <CopyRow label="Request ID" value={detail.request_id || "—"} onCopy={copy} />
              <CopyRow label="Sender ID" value={detail.sender_id} onCopy={copy} />
              <Row label="Sender Email">{users[detail.sender_id]?.email || "(unknown)"}</Row>
              <CopyRow label="Receiver ID" value={detail.receiver_id} onCopy={copy} />
              <Row label="Receiver Email">{detail.receiver_email || users[detail.receiver_id]?.email || "(unknown)"}</Row>
              {detail.error_message && (
                <Row label="Error">
                  <span className="text-destructive">{detail.error_message}</span>
                </Row>
              )}
              {detail.message && (
                <Row label="Pesan">
                  <span className="italic text-muted-foreground">"{detail.message}"</span>
                </Row>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-3 gap-2 border-b border-border/30 pb-2">
    <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="col-span-2 break-all">{children}</span>
  </div>
);

const CopyRow = ({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string, l: string) => void }) => (
  <div className="grid grid-cols-3 gap-2 border-b border-border/30 pb-2">
    <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="col-span-2 flex items-center gap-2 break-all font-mono text-xs">
      {value}
      {value && value !== "—" && (
        <button onClick={() => onCopy(value, label)} className="text-muted-foreground hover:text-foreground" aria-label={`Copy ${label}`}>
          <Copy className="h-3 w-3" />
        </button>
      )}
    </span>
  </div>
);

export default AdminGiftAudit;
