import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SEO from "@/components/SEO";

type Status =
  | "checking"
  | "valid"
  | "already"
  | "invalid"
  | "submitting"
  | "done"
  | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("checking");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: anon } },
        );
        const json = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          setErrMsg(json?.error || "Token tidak valid.");
          return;
        }
        if (json?.valid === false && json?.reason === "already_unsubscribed") {
          setStatus("already");
        } else if (json?.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch (e) {
        setStatus("error");
        setErrMsg(e instanceof Error ? e.message : "Terjadi kesalahan.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setStatus("submitting");
    const { data, error } = await supabase.functions.invoke(
      "handle-email-unsubscribe",
      { body: { token } },
    );
    if (error) {
      setStatus("error");
      setErrMsg(error.message);
      return;
    }
    if ((data as any)?.success || (data as any)?.reason === "already_unsubscribed") {
      setStatus("done");
    } else {
      setStatus("error");
      setErrMsg("Gagal memproses unsubscribe.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <SEO title="Berhenti Berlangganan Email" description="Kelola preferensi email Bushido Gacha." />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Berhenti berlangganan email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "checking" && (
            <p className="text-sm text-muted-foreground">Memeriksa token…</p>
          )}
          {status === "valid" && (
            <>
              <p className="text-sm text-muted-foreground">
                Klik tombol di bawah untuk berhenti menerima email dari Bushido Gacha.
                Email auth (reset password, verifikasi) tetap akan kamu terima.
              </p>
              <Button onClick={confirm} className="w-full">
                Konfirmasi Berhenti
              </Button>
            </>
          )}
          {status === "submitting" && (
            <p className="text-sm text-muted-foreground">Memproses…</p>
          )}
          {status === "done" && (
            <>
              <p className="text-sm">Kamu berhasil berhenti berlangganan. 👋</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Kembali ke beranda</Link>
              </Button>
            </>
          )}
          {status === "already" && (
            <>
              <p className="text-sm">Email kamu sudah berhenti berlangganan sebelumnya.</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Kembali ke beranda</Link>
              </Button>
            </>
          )}
          {status === "invalid" && (
            <p className="text-sm text-destructive">
              Token tidak valid atau sudah kedaluwarsa.{errMsg ? ` ${errMsg}` : ""}
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">
              Terjadi kesalahan. {errMsg}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
