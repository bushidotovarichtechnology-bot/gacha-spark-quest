// Shared Violet Media Pay (violetmediapay.com) helper.
//
// Docs: https://violetmediapay.com — MERCHANT REST API
//   Sandbox base : https://violetmediapay.com/api/sanbox
//   Production   : https://violetmediapay.com/api/live
//
// Signature spec (per docs, HMAC-SHA256 hex):
//   signature = hex_hmac_sha256( ref_kode + api_key + nominal , secret_key )
//
// Callbacks arrive as POST with header `X-Callback-Signature` computed the
// same way from the callback payload's ref_kode/api_key/amount fields.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type VioletMode = "sandbox" | "production";

export interface VioletConfig {
  mode: VioletMode;
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

const SANDBOX_BASE = "https://violetmediapay.com/api/sanbox";
const PRODUCTION_BASE = "https://violetmediapay.com/api/live";

export async function getVioletConfig(): Promise<VioletConfig> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: providerRow } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "payment_provider")
    .maybeSingle();

  const mode: VioletMode =
    (providerRow?.value as any)?.violet_mode === "production" ? "production" : "sandbox";

  const apiKey = mode === "production"
    ? Deno.env.get("VIOLETMEDIAPAY_API_KEY_PRODUCTION") ?? ""
    : Deno.env.get("VIOLETMEDIAPAY_API_KEY_SANDBOX") ?? "";
  const secretKey = mode === "production"
    ? Deno.env.get("VIOLETMEDIAPAY_SECRET_KEY_PRODUCTION") ??
      Deno.env.get("VIOLETMEDIAPAY_API_SECRET_PRODUCTION") ?? ""
    : Deno.env.get("VIOLETMEDIAPAY_SECRET_KEY_SANDBOX") ??
      Deno.env.get("VIOLETMEDIAPAY_WEBHOOK_SECRET") ?? "";

  // Optional endpoint overrides stored in app_settings.violet_endpoints
  const { data: epRow } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "violet_endpoints")
    .maybeSingle();
  const ep = (epRow?.value as { sandbox_base_url?: string; production_base_url?: string } | null) || {};
  const baseUrl = mode === "production"
    ? (ep.production_base_url?.trim() || PRODUCTION_BASE)
    : (ep.sandbox_base_url?.trim() || SANDBOX_BASE);

  return { mode, apiKey, secretKey, baseUrl };
}

// Hex HMAC-SHA256 helper.
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Build the request signature per Violet Media Pay spec. */
export function violetSignature(
  cfg: VioletConfig,
  refKode: string,
  amount: string | number,
): Promise<string> {
  const nominal = String(amount);
  return hmacSha256Hex(cfg.secretKey, `${refKode}${cfg.apiKey}${nominal}`);
}

/**
 * POST form-encoded request to Violet Media Pay. The `/create` endpoint
 * accepts application/x-www-form-urlencoded per official examples.
 */
export async function violetPostForm<T = any>(
  cfg: VioletConfig,
  path: string,
  fields: Record<string, string | number>,
): Promise<{ ok: boolean; status: number; data: T }> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) body.set(k, String(v));

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: body.toString(),
  });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

export async function violetGet<T = any>(
  cfg: VioletConfig,
  path: string,
  query: Record<string, string | number>,
): Promise<{ ok: boolean; status: number; data: T }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) qs.set(k, String(v));
  const url = `${cfg.baseUrl}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Verify the X-Callback-Signature header on an incoming Violet webhook.
 * Computes hex HMAC-SHA256 of `ref_kode + api_key + amount` (from the
 * callback body) keyed by the merchant secret_key, and compares against
 * the header value.
 */
export async function verifyVioletWebhook(opts: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const cfg = await getVioletConfig();
  if (!cfg.secretKey || !cfg.apiKey) return false;

  const provided =
    opts.headers.get("X-Callback-Signature") ||
    opts.headers.get("x-callback-signature") ||
    opts.headers.get("X-Violet-Signature") ||
    opts.headers.get("Signature") ||
    "";
  if (!provided) return false;

  // Parse payload — Violet posts form-encoded or JSON, accept either.
  let payload: Record<string, unknown> = {};
  const contentType = (opts.headers.get("content-type") || "").toLowerCase();
  try {
    if (contentType.includes("application/json")) {
      payload = JSON.parse(opts.rawBody || "{}");
    } else {
      // form-encoded fallback
      const usp = new URLSearchParams(opts.rawBody);
      for (const [k, v] of usp.entries()) payload[k] = v;
    }
  } catch {
    // If JSON parse fails, still try form-encoded.
    try {
      const usp = new URLSearchParams(opts.rawBody);
      for (const [k, v] of usp.entries()) payload[k] = v;
    } catch { /* ignore */ }
  }

  const refKode = String(payload.ref_kode ?? payload.reference ?? payload.reference_id ?? "");
  const amount = String(payload.amount ?? payload.nominal ?? payload.gross_amount ?? "");
  if (!refKode || !amount) return false;

  const expected = await hmacSha256Hex(cfg.secretKey, `${refKode}${cfg.apiKey}${amount}`);
  const normalized = provided.replace(/^sha256=/i, "").toLowerCase();
  return normalized === expected;
}

/** Parse a callback body (JSON or form-encoded) into a plain object. */
export function parseVioletCallbackBody(rawBody: string, contentType: string): Record<string, any> {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("application/json")) {
    try { return JSON.parse(rawBody || "{}"); } catch { return {}; }
  }
  const usp = new URLSearchParams(rawBody);
  const out: Record<string, string> = {};
  for (const [k, v] of usp.entries()) out[k] = v;
  return out;
}
