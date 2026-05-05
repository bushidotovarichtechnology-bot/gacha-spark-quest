// Shared DOKU Checkout (Jokul) helper.
// Docs: https://jokul-docs.doku.com / https://sandbox.doku.com
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type DokuMode = "sandbox" | "production";

export interface DokuConfig {
  mode: DokuMode;
  clientId: string;
  secretKey: string;
  baseUrl: string;
}

export async function getDokuConfig(): Promise<DokuConfig> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "payment_provider")
    .maybeSingle();

  const mode: DokuMode =
    (data?.value as any)?.doku_mode === "production" ? "production" : "sandbox";

  const clientId = mode === "production"
    ? Deno.env.get("DOKU_CLIENT_ID_PRODUCTION") ?? ""
    : Deno.env.get("DOKU_CLIENT_ID_SANDBOX") ?? "";
  const secretKey = mode === "production"
    ? Deno.env.get("DOKU_SECRET_KEY_PRODUCTION") ?? ""
    : Deno.env.get("DOKU_SECRET_KEY_SANDBOX") ?? "";

  const baseUrl = mode === "production"
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";

  return { mode, clientId, secretKey, baseUrl };
}

async function sha256Base64(msg: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function hmacSha256Base64(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function buildDokuSignature(opts: {
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  jsonBody: string;
  secretKey: string;
}): Promise<string> {
  const digest = await sha256Base64(opts.jsonBody);
  const stringToSign =
    `Client-Id:${opts.clientId}\n` +
    `Request-Id:${opts.requestId}\n` +
    `Request-Timestamp:${opts.timestamp}\n` +
    `Request-Target:${opts.requestTarget}\n` +
    `Digest:${digest}`;
  const sig = await hmacSha256Base64(opts.secretKey, stringToSign);
  return `HMACSHA256=${sig}`;
}

export async function dokuRequest<T = any>(
  cfg: DokuConfig,
  requestTarget: string, // e.g. "/checkout/v1/payment"
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T }> {
  const jsonBody = JSON.stringify(body);
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const signature = await buildDokuSignature({
    clientId: cfg.clientId,
    requestId,
    timestamp,
    requestTarget,
    jsonBody,
    secretKey: cfg.secretKey,
  });

  const res = await fetch(`${cfg.baseUrl}${requestTarget}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": cfg.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      "Signature": signature,
    },
    body: jsonBody,
  });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

export async function verifyDokuWebhookSignature(opts: {
  cfg: DokuConfig;
  headers: Headers;
  rawBody: string;
  requestTarget: string; // path of webhook URL configured at DOKU
}): Promise<boolean> {
  const clientId = opts.headers.get("Client-Id") || opts.headers.get("client-id");
  const requestId = opts.headers.get("Request-Id") || opts.headers.get("request-id");
  const timestamp = opts.headers.get("Request-Timestamp") || opts.headers.get("request-timestamp");
  const signature = opts.headers.get("Signature") || opts.headers.get("signature");
  if (!clientId || !requestId || !timestamp || !signature) return false;
  if (clientId !== opts.cfg.clientId) return false;

  const expected = await buildDokuSignature({
    clientId,
    requestId,
    timestamp,
    requestTarget: opts.requestTarget,
    jsonBody: opts.rawBody,
    secretKey: opts.cfg.secretKey,
  });
  return expected === signature;
}
