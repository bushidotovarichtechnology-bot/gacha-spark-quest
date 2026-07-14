// Shared Violet Media Pay (violetmediapay.com) helper.
// NOTE: Endpoint paths dan skema payload di bawah ini adalah PLACEHOLDER —
// sesuaikan dengan dokumentasi resmi https://violetmediapay.com/docs
// setelah kredensial merchant diperoleh.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type VioletMode = "sandbox" | "production";

export interface VioletConfig {
  mode: VioletMode;
  apiKey: string;
  merchantId: string;
  baseUrl: string;
}

const SANDBOX_BASE = "https://sandbox.violetmediapay.com/api/v1";
const PRODUCTION_BASE = "https://api.violetmediapay.com/api/v1";

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
  const merchantId = mode === "production"
    ? Deno.env.get("VIOLETMEDIAPAY_MERCHANT_ID_PRODUCTION") ?? ""
    : Deno.env.get("VIOLETMEDIAPAY_MERCHANT_ID_SANDBOX") ?? "";

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

  return { mode, apiKey, merchantId, baseUrl };
}


/**
 * Perform a POST request to Violet Media Pay. Adjust the auth header format
 * to match the official Violet Media Pay documentation (Bearer / X-API-Key /
 * signed request, dll). The current implementation uses a standard
 * `Authorization: Bearer <api_key>` header, which is the most common pattern.
 */
export async function violetRequest<T = any>(
  cfg: VioletConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${cfg.apiKey}`,
      "X-Merchant-Id": cfg.merchantId,
    },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Verify webhook signature. Violet Media Pay is expected to sign each webhook
 * payload with HMAC-SHA256 using the merchant webhook secret. Header name
 * (`X-Violet-Signature`) may need adjustment per official docs.
 */
export async function verifyVioletWebhook(opts: {
  headers: Headers;
  rawBody: string;
}): Promise<boolean> {
  const secret = Deno.env.get("VIOLETMEDIAPAY_WEBHOOK_SECRET") ?? "";
  if (!secret) return false;
  const signature =
    opts.headers.get("X-Violet-Signature") ||
    opts.headers.get("x-violet-signature") ||
    opts.headers.get("Signature") ||
    "";
  if (!signature) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(opts.rawBody));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  // Support hex or "sha256=<hex>" formats
  const provided = signature.replace(/^sha256=/i, "").toLowerCase();
  return provided === expectedHex;
}
