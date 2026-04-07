import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff, UserPlus } from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "user";
  created_at: string;
}

const AdminUsers = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRoles = async () => {
    const { data } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
    if (data) setRoles(data);
  };

  useEffect(() => { fetchRoles(); }, []);

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

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold tracking-wider">User Management</h1>

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
          <p className="mt-2 text-xs text-muted-foreground">
            Paste the user's UUID from the authentication system to grant admin access.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Current Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-sm font-mono">{r.user_id}</p>
                      <p className="text-xs text-muted-foreground">Role: {r.role} • {new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeRole(r.id)} className="text-destructive hover:text-destructive">
                    <ShieldOff className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
