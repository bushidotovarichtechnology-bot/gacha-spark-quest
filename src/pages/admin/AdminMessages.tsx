import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2, Eye, X, Trash2, User, FileText, Clock, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

const AdminMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setMessages(data as ContactMessage[]);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  useEffect(() => {
    if (selected) setReplyText(selected.reply || "");
  }, [selected]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus pesan");
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Pesan dihapus");
    }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("contact_messages")
      .update({ reply: replyText.trim(), replied_at: new Date().toISOString() } as any)
      .eq("id", selected.id);
    setSending(false);
    if (error) {
      toast.error("Gagal mengirim balasan");
    } else {
      const updated = { ...selected, reply: replyText.trim(), replied_at: new Date().toISOString() };
      setMessages((prev) => prev.map((m) => m.id === selected.id ? updated : m));
      setSelected(updated);
      toast.success("Balasan berhasil disimpan");
    }
  };

  const fmtTime = (d: string) => {
    try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return d; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Contact Messages</h1>
        <p className="text-sm text-muted-foreground">{messages.length} total messages</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Sender</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Subject</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{msg.name}</p>
                    <p className="text-xs text-muted-foreground">{msg.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground line-clamp-1">{msg.subject}</p>
                  </td>
                  <td className="px-4 py-3">
                    {msg.replied_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                        <CheckCircle2 className="h-3 w-3" /> Replied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {fmtTime(msg.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(msg)} className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <ConfirmDelete onConfirm={() => handleDelete(msg.id)}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ConfirmDelete>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        )}
      </div>

      {/* Detail & Reply modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-bold text-foreground">Message Detail</h2>
              <button onClick={() => setSelected(null)} className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">{selected.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium text-foreground">{selected.subject}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">{fmtTime(selected.created_at)}</p>
                </div>
              </div>

              {/* Original message */}
              <div className="rounded-xl bg-muted/30 p-4">
                <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pesan</p>
                <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{selected.message}</p>
              </div>

              {/* Existing reply */}
              {selected.reply && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                  <div className="mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-xs font-semibold text-green-500 uppercase tracking-wider">Balasan Admin</p>
                    {selected.replied_at && (
                      <span className="text-xs text-muted-foreground ml-auto">{fmtTime(selected.replied_at)}</span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{selected.reply}</p>
                </div>
              )}

              {/* Reply form */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {selected.reply ? "Edit Balasan" : "Tulis Balasan"}
                </p>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Tulis balasan untuk pesan ini..."
                  className="min-h-[100px]"
                />
                <div className="flex items-center justify-between">
                  <ConfirmDelete onConfirm={() => handleDelete(selected.id)}>
                    <Button variant="destructive" size="sm" className="gap-1.5">
                      <Trash2 className="h-4 w-4" /> Hapus
                    </Button>
                  </ConfirmDelete>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!replyText.trim() || sending}
                    onClick={handleReply}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {selected.reply ? "Update Balasan" : "Kirim Balasan"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;
