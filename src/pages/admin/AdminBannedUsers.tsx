import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { useToast } from "@/hooks/use-toast";
import { Ban, Search, ShieldOff, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface BannedUser {
  user_id: string;
  email: string;
  ban_reason: string;
  banned_at: string | null;
  total_draws: number;
  last_draw_at: string | null;
}

const AdminBannedUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [unbanningId, setUnbanningId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_banned_users");
    if (error) {
      toast({ title: "Gagal memuat", description: error.message, variant: "destructive" });
    } else {
      setUsers((data as BannedUser[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUnban = async (userId: string) => {
    setUnbanningId(userId);
    const { error } = await supabase.rpc("admin_set_user_banned", {
      _user_id: userId,
      _banned: false,
      _reason: "",
    });
    setUnbanningId(null);
    if (error) {
      toast({ title: "Gagal unban", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "User berhasil di-unban" });
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.ban_reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider flex items-center gap-2">
            <Ban className="h-6 w-6 text-destructive" />
            BANNED USERS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar user yang sedang dilarang bermain. Total: {users.length}
          </p>
        </div>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari email atau alasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {users.length === 0 ? "Tidak ada user yang di-banned." : "Tidak ada hasil yang cocok."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Tanggal Banned</TableHead>
                <TableHead className="text-right">Total Draws</TableHead>
                <TableHead>Last Draw</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell className="text-muted-foreground max-w-md">
                    {u.ban_reason || <span className="italic">Tanpa alasan</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.banned_at ? format(new Date(u.banned_at), "dd MMM yyyy, HH:mm") : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {u.total_draws.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.last_draw_at ? format(new Date(u.last_draw_at), "dd MMM yyyy, HH:mm") : <span className="italic">Belum pernah</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmDelete
                      title="Unban user ini?"
                      description={`User ${u.email} akan kembali dapat bermain gacha.`}
                      onConfirm={() => handleUnban(u.user_id)}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={unbanningId === u.user_id}
                      >
                        {unbanningId === u.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldOff className="h-4 w-4" />
                        )}
                        Unban
                      </Button>
                    </ConfirmDelete>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default AdminBannedUsers;
