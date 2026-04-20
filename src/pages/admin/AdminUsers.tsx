import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { Shield, ShieldOff, UserPlus, Trash2, Eye, Search, Ban, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AppUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "user";
  created_at: string;
}

interface DrawLog {
  id: string;
  campaign_id: string;
  tier_label: string;
  prize_name: string;
  coin_value: number;
  created_at: string;
}

interface BannedRow {
  user_id: string;
  is_banned: boolean;
  ban_reason: string;
  banned_at: string | null;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [bans, setBans] = useState<Record<string, BannedRow>>({});
  const [search, setSearch] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userDraws, setUserDraws] = useState<DrawLog[]>([]);
  const [drawsLoading, setDrawsLoading] = useState(false);

  // Add admin confirm dialog
  const [pendingAdminEmail, setPendingAdminEmail] = useState<string | null>(null);

  // Ban dialog
  const [banTarget, setBanTarget] = useState<AppUser | null>(null);
  const [banReason, setBanReason] = useState("");

  const fetchUsers = async () => {
    const { data } = await supabase.rpc("get_all_users_admin");
    if (data) setUsers(data as AppUser[]);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    if (data) setRoles(data);
  };

  const fetchBans = async () => {
    const { data } = await supabase
      .from("user_coins")
      .select("user_id, is_banned, ban_reason, banned_at")
      .eq("is_banned", true);
    const map: Record<string, BannedRow> = {};
    (data as BannedRow[] | null)?.forEach((r) => { map[r.user_id] = r; });
    setBans(map);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchBans();
  }, []);

  const getUserRole = (userId: string) => roles.find((r) => r.user_id === userId);
  const isBanned = (userId: string) => !!bans[userId];

  // ---- Add admin by email (with confirm) ----
  const requestAddAdmin = () => {
    const email = newAdminEmail.trim();
    if (!email) return;
    setPendingAdminEmail(email);
  };

  const confirmAddAdmin = async () => {
    const email = pendingAdminEmail;
    if (!email) return;
    setLoading(true);
    try {
      const { data: uid, error: rpcErr } = await supabase.rpc("find_user_id_by_email", { _email: email });
      if (rpcErr) throw rpcErr;
      if (!uid) {
        toast({ title: "User tidak ditemukan", description: `Email ${email} belum terdaftar`, variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("user_roles").insert({ user_id: uid as unknown as string, role: "admin" as const });
      if (error) throw error;
      toast({ title: "Admin role diberikan", description: email });
      setNewAdminEmail("");
      fetchRoles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
      setPendingAdminEmail(null);
    }
  };

  // ---- Remove role ----
  const removeRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role admin dicabut" });
      fetchRoles();
    }
  };

  // ---- Delete user ----
  const deleteUser = async (userId: string) => {
    const { error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: userId },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User berhasil dihapus" });
      fetchUsers();
      fetchRoles();
      fetchBans();
      if (selectedUser?.id === userId) setSelectedUser(null);
    }
  };

  // ---- Ban / Unban ----
  const submitBan = async () => {
    if (!banTarget) return;
    const { error } = await supabase.rpc("admin_set_user_banned", {
      _user_id: banTarget.id,
      _banned: true,
      _reason: banReason.trim() || "Curang",
    });
    if (error) {
      toast({ title: "Gagal banned", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User di-banned", description: banTarget.email });
      fetchBans();
    }
    setBanTarget(null);
    setBanReason("");
  };

  const unbanUser = async (user: AppUser) => {
    const { error } = await supabase.rpc("admin_set_user_banned", {
      _user_id: user.id,
      _banned: false,
      _reason: "",
    });
    if (error) {
      toast({ title: "Gagal unban", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Banned dicabut", description: user.email });
      fetchBans();
    }
  };

  const viewUserDetail = async (user: AppUser) => {
    setSelectedUser(user);
    setDrawsLoading(true);
    const { data } = await supabase
      .from("draws")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setUserDraws((data as DrawLog[]) || []);
    setDrawsLoading(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalCoinsSpent = userDraws.reduce((sum, d) => sum + (d.coin_value || 0), 0);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold tracking-wider">User Management</h1>

      {/* Add Admin */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Tambah Admin via Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") requestAddAdmin(); }}
            />
            <Button onClick={requestAddAdmin} disabled={loading || !newAdminEmail.trim()} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Add Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Registered Users ({users.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari email atau ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terdaftar</TableHead>
                  <TableHead>Login Terakhir</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Tidak ada user ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const role = getUserRole(u.id);
                    const banned = isBanned(u.id);
                    return (
                      <TableRow key={u.id} className={banned ? "bg-destructive/5" : undefined}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{u.email || "No email"}</p>
                            <p className="text-xs font-mono text-muted-foreground">{u.id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {role ? (
                            <Badge variant="destructive" className="text-xs">{role.role}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">user</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {banned ? (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <Ban className="h-3 w-3" /> BANNED
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-primary border-primary/40">Aktif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("id-ID") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewUserDetail(u)} title="Lihat detail">
                              <Eye className="h-4 w-4" />
                            </Button>

                            {role && (
                              <ConfirmDelete
                                title="Cabut role admin?"
                                description={`Role admin untuk ${u.email} akan dicabut. User tetap bisa login sebagai user biasa.`}
                                onConfirm={() => removeRole(role.id)}
                              >
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" title="Cabut role admin">
                                  <ShieldOff className="h-4 w-4" />
                                </Button>
                              </ConfirmDelete>
                            )}

                            {banned ? (
                              <ConfirmDelete
                                title="Cabut banned?"
                                description={`User ${u.email} akan bisa kembali bermain.`}
                                onConfirm={() => unbanUser(u)}
                              >
                                <Button variant="ghost" size="sm" className="text-primary hover:text-primary" title="Cabut banned">
                                  <ShieldCheck className="h-4 w-4" />
                                </Button>
                              </ConfirmDelete>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => { setBanTarget(u); setBanReason(""); }}
                                title="Banned user"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}

                            <ConfirmDelete
                              title="Hapus user ini?"
                              description="User akan dihapus permanen beserta semua datanya. Tindakan ini tidak dapat dibatalkan."
                              onConfirm={() => deleteUser(u.id)}
                            >
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" title="Hapus user">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ConfirmDelete>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Add Admin */}
      <AlertDialog open={!!pendingAdminEmail} onOpenChange={(o) => !o && setPendingAdminEmail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Berikan role admin?</AlertDialogTitle>
            <AlertDialogDescription>
              User <span className="font-semibold text-foreground">{pendingAdminEmail}</span> akan mendapat akses penuh ke admin panel (kelola campaign, user, transaksi, dll). Pastikan ini benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAddAdmin}>Ya, jadikan admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Dialog with reason */}
      <Dialog open={!!banTarget} onOpenChange={(o) => { if (!o) { setBanTarget(null); setBanReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-4 w-4" /> Banned User
            </DialogTitle>
          </DialogHeader>
          {banTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                User <span className="font-semibold text-foreground">{banTarget.email}</span> tidak akan bisa melakukan gacha selama status banned aktif.
              </p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Alasan banned</label>
                <Textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="cth: Terdeteksi curang / multi-akun / abuse"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBanTarget(null); setBanReason(""); }}>Batal</Button>
            <Button variant="destructive" onClick={submitBan} className="gap-1.5">
              <Ban className="h-4 w-4" /> Banned Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Detail User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-secondary p-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs">{selectedUser.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Terdaftar</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Draw</p>
                  <p className="font-medium">{userDraws.length} kali</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Coin Digunakan</p>
                  <p className="font-medium">{totalCoinsSpent.toLocaleString()} coin</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {isBanned(selectedUser.id) ? (
                      <span className="text-destructive">BANNED — {bans[selectedUser.id]?.ban_reason || "—"}</span>
                    ) : (
                      "Aktif"
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Riwayat Gacha</h3>
                {drawsLoading ? (
                  <p className="text-sm text-muted-foreground">Memuat...</p>
                ) : userDraws.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Belum ada riwayat gacha.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-border/50">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hadiah</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Coin</TableHead>
                          <TableHead>Tanggal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userDraws.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="text-sm font-medium">{d.prize_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{d.tier_label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{d.coin_value}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(d.created_at).toLocaleString("id-ID")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
