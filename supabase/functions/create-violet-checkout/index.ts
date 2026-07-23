// Create a transaction on Violet Media Pay (POST /create).
// Payload format & signature per the official Violet Media Pay REST API docs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getVioletConfig, violetPostForm, violetSignature } from "../_shared/violet.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "No authorization header" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json(401, { error: "Unauthorized" });

    const { package_id, return_url, channel_payment } = await req.json();
    if (!package_id || typeof package_id !== "string") {
      return json(400, { error: "Missing package_id" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("coin_packages")
      .select("id, name, coins, bonus_coins, price, discount_percent, discount_start, discount_end, is_active")
      .eq("id", package_id)
      .maybeSingle();
    if (pkgError || !pkg || !pkg.is_active) {
      return json(404, { error: "Package not found or inactive" });
    }

    const now = Date.now();
    const startOk = !pkg.discount_start || new Date(pkg.discount_start).getTime() <= now;
    const endOk = !pkg.discount_end || new Date(pkg.discount_end).getTime() >= now;
    const discountActive = (pkg.discount_percent ?? 0) > 0 && startOk && endOk;
    const finalAmount = discountActive
      ? Math.round(pkg.price * (1 - pkg.discount_percent / 100))
      : pkg.price;
    const totalCoins = (pkg.coins ?? 0) + (pkg.bonus_coins ?? 0);

    // ref_kode must be numeric per Violet docs. Prefix "1" distinguishes
    // top-ups from shipping payments ("2") when routing webhooks.
    const refKode = `1${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    const cfg = await getVioletConfig();
    if (!cfg.apiKey || !cfg.secretKey) {
      return json(500, {
        error: `Violet Media Pay ${cfg.mode} credentials not configured`,
        user_message: "Kredensial Violet Media Pay belum dikonfigurasi oleh admin.",
      });
    }

    const projectRef = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
    const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/violet-webhook`;
    const origin = req.headers.get("origin") || "";
    const redirectUrl = return_url || `${origin}/transactions`;

    const signature = await violetSignature(cfg, refKode, finalAmount);

    const fields: Record<string, string | number> = {
      api_key: cfg.apiKey,
      secret_key: cfg.secretKey,
      channel_payment: (channel_payment && String(channel_payment).trim()) || "QRIS",
      ref_kode: refKode,
      nominal: finalAmount,
      cus_nama: (user.user_metadata as any)?.username || user.email?.split("@")[0] || "Customer",
      cus_email: user.email || "",
      cus_phone: (user.user_metadata as any)?.phone || "",
      produk: `Top-up ${totalCoins} Bushido Coins`,
      url_redirect: redirectUrl,
      url_callback: callbackUrl,
      expired_time: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      signature,
    };

    const { ok, status, data } = await violetPostForm<any>(cfg, "/create", fields);

    const payload = data?.data ?? data ?? {};

    // Common response shapes across gateways: try a few likely fields.
    const paymentUrl =
      payload?.payment_url ||
      payload?.redirect_url ||
      payload?.checkout_url ||
      payload?.pay_url ||
      payload?.url ||
      data?.payment_url ||
      data?.redirect_url ||
      data?.checkout_url ||
      data?.url ||
      null;

    // Method-specific instruction fields.
    const qrString =
      payload?.qr_string || payload?.qris_string || payload?.qr_code || payload?.qrString || null;
    let qrImageUrl =
      payload?.qr_image || payload?.qr_url || payload?.qris_image || payload?.qr_image_url || null;

    // Violet's /create only returns `checkout_url` for QRIS. Fetch that page
    // server-side and extract the QR image URL so we can render it inline
    // instead of forcing an iframe/new tab.
    const channelStr = String(fields.channel_payment || "").toUpperCase();
    const isQris = channelStr.includes("QRIS") || channelStr.includes("QRISC");
    if (!qrImageUrl && !qrString && isQris && paymentUrl) {
      try {
        const html = await (await fetch(paymentUrl, {
          headers: { "User-Agent": "Mozilla/5.0 BushidoVault" },
        })).text();
        // Look for an <img> whose src points to a QR (data URI, /qr, or qris in path)
        const imgMatches = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map((m) => m[1]);
        const qrCandidate = imgMatches.find((src) =>
          src.startsWith("data:image") ||
          /qr(is)?|barcode|chart\?/i.test(src)
        );
        if (qrCandidate) {
          qrImageUrl = qrCandidate.startsWith("http") || qrCandidate.startsWith("data:")
            ? qrCandidate
            : new URL(qrCandidate, paymentUrl).toString();
        }
      } catch (e) {
        console.warn("QR extraction failed:", e);
      }
    }
    const vaNumber =
      payload?.va_number || payload?.virtual_account || payload?.no_va || payload?.va || null;
    const vaBank =
      payload?.bank || payload?.bank_code || payload?.va_bank || null;
    const expiredAt =
      payload?.expired_time || payload?.expired_at || payload?.expiry || payload?.expire_time || null;

    const hasInstruction = !!(paymentUrl || qrString || qrImageUrl || vaNumber);
    const providerOk = ok && (data?.status === true || data?.status === "success" || hasInstruction);
    if (!providerOk || !hasInstruction) {
      console.error("Violet Media Pay create failed:", status, data);
      const msg = data?.message || data?.error || data?.data?.message || "Failed to create Violet Media Pay session";
      const isSslHandshake = status === 525 || status === 526;
      const isProviderDown = status >= 500;
      const userMessage = isSslHandshake
        ? "Layanan pembayaran Violet Media Pay sedang tidak dapat diakses (SSL handshake gagal di sisi provider). Silakan coba beberapa saat lagi."
        : isProviderDown
          ? "Layanan Violet Media Pay sedang bermasalah. Silakan coba lagi nanti."
          : "Gagal membuat sesi pembayaran Violet Media Pay. Periksa kembali data pembayaran Anda.";
      return json(200, {
        error: msg,
        user_message: userMessage,
        provider_message: msg,
        provider_status: status,
        fallback: isProviderDown,
      });
    }

    await supabaseAdmin.from("transactions").insert({
      order_id: refKode,
      user_id: user.id,
      package_id,
      coins: totalCoins,
      amount: finalAmount,
      status: "pending",
      payment_type: fields.channel_payment as string,
      snap_token: null,
    });

    return json(200, {
      provider: "violet",
      redirect_url: paymentUrl,
      order_id: refKode,
      mode: cfg.mode,
      amount: finalAmount,
      channel: fields.channel_payment,
      instruction: {
        qr_string: qrString,
        qr_image_url: qrImageUrl,
        va_number: vaNumber,
        va_bank: vaBank,
        expired_at: expiredAt,
        payment_url: paymentUrl,
      },
      raw: payload,
    });
  } catch (err) {
    console.error("create-violet-checkout error:", err);
    return json(500, { error: "Internal server error" });
  }
});
