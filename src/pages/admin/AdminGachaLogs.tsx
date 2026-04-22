import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Search, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import AdminOnlyGuard from "@/components/AdminOnlyGuard";

interface GachaLog {
  id: string;
  user_id: string;
  campaign_id: string;
  draw_count: number;
  status: string;
  error_message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  result_summary: any;
  created_at: string;
}

const PAGE_SIZE = 50;

const AdminGachaLogs = () => {
  const [logs, setLogs] = useState<GachaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<GachaLog | null>(null);
  const [campaigns, setCampaigns] = useState<{ id: string; title: string }[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    let q = supabase
      .from("gacha_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (userFilter.trim()) q = q.eq("user_id", userFilter.trim());
    if (campaignFilter.trim()) q = q.eq("campaign_id", campaignFilter.trim());
    if (statusFilter) q = q.eq("status", statusFilter);
    if (dateFrom) q = q.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      q = q.lt("created_at", end.toISOString());
    }

    const { data, error, count } = await q;
    if (error) {
      toast.error("Gagal memuat log: " + error.message);
    } else {
      setLogs((data ?? []) as GachaLog[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  };

  const fetchMeta = async () => {
    const [{ data: camps }, { data: users }] = await Promise.all([
      supabase.from("campaigns").select("id, title").order("title"),
      supabase.rpc("get_all_users_admin"),
    ]);
    setCampaigns(camps ?? []);
    const map: Record<string, string> = {};
    (users ?? []).forEach((u: any) => { map[u.id] = u.email; });
    setEmails(map);
  };

  useEffect(() => { fetchMeta(); }, []);
  useEffect(() => { fetchLogs(); /* eslint-disable-next-line */ }, [page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const applyFilters = () => {
    setPage(0);
    fetchLogs();
  };

  const resetFilters = () => {
    setUserFilter(""); setCampaignFilter(""); setStatusFilter("");
    setDateFrom(""); setDateTo(""); setPage(0);
    setTimeout(fetchLogs, 0);
  };

  return (
    <AdminOnlyGuard
      title="Admin only — Audit Log Gacha"
      message="Raw gacha attempt logs (including IP addresses and user agents) are restricted to administrators."
    >
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-destructive" />
        <h1 className="text-2xl font-bold">Audit Log Gacha</h1>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">User ID / Email</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="">Semua user</option>
              {Object.entries(emails).map(([id, em]) => (
                <option key={id} value={id}>{em}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
            >
              <option value="">Semua campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dari tanggal</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sampai tanggal</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={applyFilters} size="sm"><Search className="h-4 w-4 mr-1" /> Filter</Button>
          <Button onClick={resetFilters} size="sm" variant="outline">Reset</Button>
          <Button onClick={fetchLogs} size="sm" variant="ghost"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <div className="ml-auto text-sm text-muted-foreground self-center">
            Total: {total.toLocaleString()}
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-center">Draws</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="hidden lg:table-cell">User-Agent</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada log.</TableCell></TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString("id-ID")}
                </TableCell>
                <TableCell className="text-xs font-mono max-w-[160px] truncate" title={log.user_id}>
                  {emails[log.user_id] ?? log.user_id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-xs max-w-[180px] truncate" title={log.campaign_id}>
                  {campaigns.find((c) => c.id === log.campaign_id)?.title ?? log.campaign_id}
                </TableCell>
                <TableCell className="text-center">{log.draw_count}</TableCell>
                <TableCell>
                  <Badge variant={log.status === "success" ? "default" : "destructive"}>
                    {log.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">{log.ip_address ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs max-w-[240px] truncate" title={log.user_agent ?? ""}>
                  {log.user_agent ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(log)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4 border-t">
          <span className="text-sm text-muted-foreground">
            Halaman {page + 1} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Log Gacha</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Waktu</Label><div>{new Date(selected.created_at).toLocaleString("id-ID")}</div></div>
                <div><Label className="text-xs">Status</Label><div><Badge variant={selected.status === "success" ? "default" : "destructive"}>{selected.status}</Badge></div></div>
                <div className="col-span-2"><Label className="text-xs">User ID</Label><div className="font-mono text-xs break-all">{selected.user_id} {emails[selected.user_id] && `(${emails[selected.user_id]})`}</div></div>
                <div className="col-span-2"><Label className="text-xs">Campaign</Label><div className="text-xs">{campaigns.find((c) => c.id === selected.campaign_id)?.title ?? "—"} ({selected.campaign_id})</div></div>
                <div><Label className="text-xs">Draw Count</Label><div>{selected.draw_count}</div></div>
                <div><Label className="text-xs">IP</Label><div className="font-mono">{selected.ip_address ?? "—"}</div></div>
                <div className="col-span-2"><Label className="text-xs">User-Agent</Label><div className="text-xs break-all">{selected.user_agent ?? "—"}</div></div>
                {selected.error_message && (
                  <div className="col-span-2"><Label className="text-xs text-destructive">Error</Label><div className="text-xs text-destructive">{selected.error_message}</div></div>
                )}
              </div>
              <div>
                <Label className="text-xs">Hasil</Label>
                <pre className="mt-1 rounded-md bg-muted p-3 text-xs overflow-auto max-h-64">
{JSON.stringify(selected.result_summary, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AdminOnlyGuard>
  );
};

export default AdminGachaLogs;
