import { useState } from "react";
import { Loader2, UserCheck, UserPlus, X, AlertTriangle, AtSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ResolvedRecipient {
  userId: string;
  /** Display label for the resolved recipient (email or @username) */
  email: string;
}

interface Props {
  value: ResolvedRecipient | null;
  onChange: (recipient: ResolvedRecipient | null) => void;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRe = /^[a-z0-9_]{3,20}$/;

const RecipientPicker = ({ value, onChange }: Props) => {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Masukkan email atau @username.");
      return;
    }

    // Detect mode: starts with "@" OR matches username regex (no "@" sign in string)
    const isUsernameMode =
      trimmed.startsWith("@") ||
      (!trimmed.includes("@") && usernameRe.test(trimmed.toLowerCase()));

    setLoading(true);
    try {
      if (isUsernameMode) {
        const username = trimmed.replace(/^@/, "").toLowerCase();
        if (!usernameRe.test(username)) {
          setError("Format username tidak valid (3–20 karakter, a–z, 0–9, _).");
          return;
        }
        const { data, error: rpcErr } = await supabase.rpc("find_user_id_by_username", {
          _username: username,
        });
        if (rpcErr) throw rpcErr;
        if (!data) {
          setError("Username tidak ditemukan.");
          return;
        }
        if (data === user?.id) {
          setError("Tidak bisa target diri sendiri.");
          return;
        }
        onChange({ userId: data as string, email: `@${username}` });
        setInput("");
        return;
      }

      // Email mode
      const lower = trimmed.toLowerCase();
      if (!emailRe.test(lower)) {
        setError("Format email atau username tidak valid.");
        return;
      }
      if (user?.email && lower === user.email.toLowerCase()) {
        setError("Tidak bisa target diri sendiri.");
        return;
      }
      const { data, error: rpcErr } = await supabase.rpc("find_user_id_by_email", {
        _email: lower,
      });
      if (rpcErr) throw rpcErr;
      if (!data) {
        setError("User dengan email tersebut tidak ditemukan.");
        return;
      }
      onChange({ userId: data as string, email: lower });
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mencari user.");
    } finally {
      setLoading(false);
    }
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-hacker bg-hacker-bg p-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <UserCheck className="h-4 w-4 shrink-0 text-hacker-green" />
          <div className="min-w-0">
            <div className="truncate text-hacker-green text-glow-hacker">{value.email}</div>
            <div className="truncate text-[10px] text-muted-foreground">
              uid: {value.userId.slice(0, 8)}…
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-muted-foreground hover:text-destructive"
          onClick={() => onChange(null)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!loading) handleResolve();
            }
          }}
          placeholder="@username atau email@target.com"
          className="border-hacker bg-hacker-bg font-mono-hacker text-xs text-foreground placeholder:text-muted-foreground/60"
          disabled={loading}
        />
        <Button
          type="button"
          onClick={handleResolve}
          disabled={loading || input.trim().length === 0}
          className="bg-hacker-green text-hacker-bg hover:bg-hacker-green/90 font-mono-hacker text-xs"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="mr-1 h-3.5 w-3.5" />
              resolve
            </>
          )}
        </Button>
      </div>
      {error && (
        <div className="flex items-start gap-1.5 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        // Pakai <span className="text-hacker-green inline-flex items-center gap-0.5"><AtSign className="h-2.5 w-2.5" />username</span> untuk
        cara cepat, atau email lengkap. Kosongkan untuk membuat{" "}
        <span className="text-hacker-green">open trade link</span> (siapa saja dengan link bisa respond).
      </p>
    </div>
  );
};

export default RecipientPicker;
