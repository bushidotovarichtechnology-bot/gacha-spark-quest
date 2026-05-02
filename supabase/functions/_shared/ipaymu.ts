// Shared iPaymu helper: signature, mode resolution, and request wrapper.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type IpaymuMode = "sandbox" | "production";

export interface IpaymuConfig {
  mode: IpaymuMode;
  va: string;
  apiKey: string;
  baseUrl: string;
}

export function getIpaymuProviderError(message: string | undefined, mode: string) {
  const providerMessage = message || "Failed to create iPaymu session";
  if (providerMessage.toLowerCase().includes("invalid ip")) {
    return {
      status: 424,
      body: {
        code: "IPAYMU_INVALID_IP",
        error: "IP server pembayaran belum diizinkan oleh iPaymu.",
        user_message:
          `iPaymu menolak request karena IP server Lovable Cloud belum masuk whitelist akun iPaymu ${mode}. Tambahkan IP server/API callback di dashboard iPaymu, lalu coba lagi.`,
        provider_message: providerMessage,
      },
    };
  }

  if (providerMessage.toLowerCase().includes("invalid domain")) {
    return {
      status: 424,
      body: {
        code: "IPAYMU_INVALID_DOMAIN",
        error: "Domain pembayaran belum diizinkan oleh iPaymu.",
        user_message:
          "iPaymu menolak request karena domain return/callback belum masuk whitelist. Tambahkan bushidogacha.com dan domain preview Lovable di dashboard iPaymu.",
        provider_message: providerMessage,
      },
    };
  }

  return {
    status: 502,
    body: {
      code: "IPAYMU_REQUEST_FAILED",
      error: providerMessage,
      user_message: "Gagal membuat sesi pembayaran iPaymu. Silakan coba lagi beberapa saat.",
      provider_message: providerMessage,
    },
  };
}

export async function getIpaymuConfig(): Promise<IpaymuConfig> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "payment_provider")
    .maybeSingle();

  const mode: IpaymuMode = (data?.value as any)?.ipaymu_mode === "production" ? "production" : "sandbox";

  const va = mode === "production"
    ? Deno.env.get("IPAYMU_VA_PRODUCTION") ?? ""
    : Deno.env.get("IPAYMU_VA_SANDBOX") ?? "";
  const apiKey = mode === "production"
    ? Deno.env.get("IPAYMU_API_KEY_PRODUCTION") ?? ""
    : Deno.env.get("IPAYMU_API_KEY_SANDBOX") ?? "";

  const baseUrl = mode === "production"
    ? "https://my.ipaymu.com/api/v2"
    : "https://sandbox.ipaymu.com/api/v2";

  return { mode, va, apiKey, baseUrl };
}

// HMAC-SHA256(hex) of "<METHOD>:<VA>:<sha256(hex)(jsonBody)>:<apiKey>", returned as hex
async function hmacSha256Hex(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(msg: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function ipaymuRequest<T = any>(
  cfg: IpaymuConfig,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T }> {
  const jsonBody = JSON.stringify(body);
  const bodyHash = await sha256Hex(jsonBody);
  const stringToSign = `POST:${cfg.va}:${bodyHash}:${cfg.apiKey}`;
  const signature = await hmacSha256Hex(cfg.apiKey, stringToSign);
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

  const res = await fetch(`${cfg.baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      va: cfg.va,
      signature,
      timestamp,
    },
    body: jsonBody,
  });
  const data = (await res.json()) as T;
  return { ok: res.ok, status: res.status, data };
}
