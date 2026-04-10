import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { Shield, ShieldOff, UserPlus, Trash2, Eye, Search } from "lucide-react";
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

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [search, setSearch] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userDraws, setUserDraws] = useState<DrawLog[]>([]);
  const [drawsLoading, setDrawsLoading] = useState(false);

  const fetchUsers = async () => {
    const { data } = await supabase.rpc("get_all_users_admin");
    if (data) setUsers(data as AppUser[]);
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    if (data) setRoles(data);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const getUserRole = (userId: string) => {
    return roles.find((r) => r.user_id === userId);
  };

  const addAdmin = async () => {
    if (!newUserId.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: newUserId.trim(), role: "admin" as const });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Admin role assigned!" });
      setNewUserId("");
      fetchRoles();
    }
    setLoading(false);
  };

  const removeRole = async (id: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role removed" });
      fetchRoles();
    }
  };

  const deleteUser = async (userId: string) => {
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: userId },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User berhasil dihapus" });
      fetchUsers();
      fetchRoles();
      if (selectedUser?.id === userId) setSelectedUser(null);
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
          <CardTitle className="text-sm">Add Admin by User ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="User UUID"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addAdmin} disabled={loading} className="gap-1.5">
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
                  <TableHead>Terdaftar</TableHead>
                  <TableHead>Login Terakhir</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Tidak ada user ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const role = getUserRole(u.id);
                    return (
                      <TableRow key={u.id}>
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
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_sign_in_at
                            ? new Date(u.last_sign_in_at).toLocaleDateString("id-ID")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewUserDetail(u)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {role && (
                              <Button variant="ghost" size="sm" onClick={() => removeRole(role.id)} className="text-muted-foreground hover:text-foreground">
                                <ShieldOff className="h-4 w-4" />
                              </Button>
                            )}
                            <ConfirmDelete
                              title="Hapus user ini?"
                              description="User akan dihapus permanen beserta semua datanya. Tindakan ini tidak dapat dibatalkan."
                              onConfirm={() => deleteUser(u.id)}
                            >
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{getUserRole(selectedUser.id)?.role || "user"}</p>
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
