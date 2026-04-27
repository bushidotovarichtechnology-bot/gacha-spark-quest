import { useEffect, useRef, useState } from "react";
import { AtSign, Check, Loader2, ShieldCheck, Lock, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const friendlyError = (raw: string): string => {
  if (raw.includes("username_taken")) return "Username sudah dipakai user lain. Coba yang lain.";
  if (raw.includes("username_already_set")) return "Username kamu sudah pernah diset dan tidak dapat diubah.";
  if (raw.includes("invalid_username_format"))
    return "Username harus 3–20 karakter, hanya huruf kecil, angka, dan underscore.";
  if (raw.includes("unauthorized")) return "Sesi login tidak valid. Coba refresh halaman.";
  return raw;
};

/**
 * One-shot username setup card. After username is saved, the field becomes
 * permanently locked (server-enforced via trigger + RPC, also reflected in UI).
 */
const UsernameSetupCard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionReqId = useRef(0);

  // Fetch existing username on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setCurrentUsername(((data as { username?: string | null } | null)?.username) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Generate alternative username candidates from a base
  const generateCandidates = (base: string): string[] => {
    const cleaned = base.replace(/[^a-z0-9_]/g, "").slice(0, 16) || "user";
    const padded = cleaned.length < 3 ? (cleaned + "___").slice(0, 3) : cleaned;
    const out = new Set<string>();
    // Numeric suffixes
    for (let i = 0; i < 4; i++) {
      const n = Math.floor(Math.random() * 9000) + 100;
      out.add(`${padded}${n}`.slice(0, 20));
    }
    // Year-ish + underscore variants
    out.add(`${padded}_${Math.floor(Math.random() * 99) + 1}`.slice(0, 20));
    out.add(`the_${padded}`.slice(0, 20));
    out.add(`${padded}_id`.slice(0, 20));
    return Array.from(out).filter((s) => USERNAME_RE.test(s));
  };

  // Live availability check (debounced) + auto-suggest when taken
  useEffect(() => {
    if (currentUsername) return; // already locked
    const normalized = input.trim().toLowerCase();
    if (!normalized || !USERNAME_RE.test(normalized)) {
      setAvailable(null);
      setSuggestions([]);
      return;
    }
    setChecking(true);
    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_username_available", {
        _username: normalized,
      });
      if (!error) {
        const isAvailable = Boolean(data);
        setAvailable(isAvailable);
        if (!isAvailable) {
          // Generate & verify alternative suggestions
          const reqId = ++suggestionReqId.current;
          setLoadingSuggestions(true);
          setSuggestions([]);
          const candidates = generateCandidates(normalized);
          const checks = await Promise.all(
            candidates.map(async (c) => {
              const { data: ok } = await supabase.rpc("is_username_available", { _username: c });
              return ok ? c : null;
            }),
          );
          if (reqId === suggestionReqId.current) {
            setSuggestions(checks.filter((c): c is string => Boolean(c)).slice(0, 4));
            setLoadingSuggestions(false);
          }
        } else {
          setSuggestions([]);
        }
      }
      setChecking(false);
    }, 350);
    return () => {
      window.clearTimeout(timer);
      setChecking(false);
    };
  }, [input, currentUsername]);

  const handleSave = async () => {
    const normalized = input.trim().toLowerCase();
    if (!USERNAME_RE.test(normalized)) {
      toast({
        title: "Format tidak valid",
        description: "Username harus 3–20 karakter, hanya huruf kecil, angka, dan underscore.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("set_username", { _username: normalized });
      if (error) throw error;
      const result = data as { success?: boolean; username?: string } | null;
      if (!result?.success) throw new Error("Gagal menyimpan username");
      setCurrentUsername(result.username ?? normalized);
      setInput("");
      toast({
        title: "Username Aktif 🎉",
        description: `@${result.username ?? normalized} sekarang jadi identitasmu. Catatan: tidak bisa diubah lagi.`,
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Gagal menyimpan username";
      toast({ title: "Gagal", description: friendlyError(raw), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Locked state — username already set
  if (currentUsername) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <AtSign className="h-5 w-5 text-primary" /> Username
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2 min-w-0">
              <AtSign className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate font-mono text-sm font-semibold text-foreground">
                {currentUsername}
              </span>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              <Lock className="h-3 w-3" /> Permanen
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Bagikan username ini ke teman supaya mereka mudah mengirim <strong>gift coin</strong> atau
            <strong> trade prize</strong> ke kamu tanpa harus tahu emailmu.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Setup state — username not yet set
  const normalized = input.trim().toLowerCase();
  const formatValid = USERNAME_RE.test(normalized);
  const canSubmit = formatValid && available === true && !submitting;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <AtSign className="h-5 w-5 text-primary" /> Pilih Username
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="flex items-start gap-2 text-xs text-amber-200/90">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Username hanya bisa diset <strong>satu kali</strong> dan <strong>tidak bisa diubah selamanya</strong>.
              Pilih dengan hati-hati.
            </span>
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Username (3–20 karakter, huruf kecil, angka, underscore)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              @
            </span>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
              placeholder="bushido_player"
              className="bg-secondary pl-7 font-mono"
              maxLength={20}
              autoComplete="off"
              disabled={submitting}
            />
            {normalized.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : !formatValid ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : available === true ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : available === false ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : null}
              </span>
            )}
          </div>
          {normalized.length > 0 && !formatValid && (
            <p className="mt-1 text-xs text-destructive">
              Format tidak valid. Gunakan 3–20 karakter (a–z, 0–9, _).
            </p>
          )}
          {formatValid && available === false && (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-destructive">
                Username <span className="font-mono">@{normalized}</span> sudah dipakai user lain.
              </p>
              <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                  <Sparkles className="h-3 w-3" /> Saran username yang tersedia:
                </p>
                {loadingSuggestions ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> mencari alternatif…
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput(s)}
                        disabled={submitting}
                        className="rounded-full border border-primary/40 bg-background px-2.5 py-1 font-mono text-[11px] text-foreground transition hover:border-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Tidak ada saran tersedia, coba variasi lain.
                  </p>
                )}
              </div>
            </div>
          )}
          {formatValid && available === true && (
            <p className="mt-1 flex items-center gap-1 text-xs text-green-500">
              <ShieldCheck className="h-3 w-3" /> Tersedia — bisa kamu klaim
            </p>
          )}
        </div>

        <Button onClick={handleSave} disabled={!canSubmit} className="w-full">
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Klaim Username Permanen
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default UsernameSetupCard;
