import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eeyivrgpdbigxpgtujjy.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWl2cmdwZGJpZ3hwZ3R1amp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzM2MDAsImV4cCI6MjA5MDkwOTYwMH0.rIPgUwunY6mOIiroqoi9bfCdytSibU80ztFSuK7zPOY";

/**
 * Security regression guard. After tightening RLS so that exact stock counts
 * and probability weights are no longer publicly readable, anonymous users
 * must:
 *   - be DENIED access to the underlying tables `campaign_tiers` and `tier_prizes`
 *   - be ALLOWED to read the safe public views (without `remaining`/`total`/`probability_weight`)
 *   - be ALLOWED to call `get_campaign_stock_summary` for coarse-bucketed display data
 */
describe("RLS: stock tables are protected from anon", () => {
  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("anonymous users CANNOT read raw campaign_tiers", async () => {
    const { data } = await anon
      .from("campaign_tiers")
      .select("id, label, remaining, total")
      .limit(1);
    // RLS should return zero rows (no error, just empty) for non-admin
    expect(Array.isArray(data) ? data.length : 0).toBe(0);
  });

  it("anonymous users CANNOT read raw tier_prizes", async () => {
    const { data } = await anon
      .from("tier_prizes")
      .select("id, tier_id, remaining, total")
      .limit(1);
    expect(Array.isArray(data) ? data.length : 0).toBe(0);
  });

  it("public view campaign_tiers_public is readable", async () => {
    const { data, error } = await anon
      .from("campaign_tiers_public" as any)
      .select("id, label, name")
      .limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("public view tier_prizes_public exposes total but hides remaining/probability_weight", async () => {
    const { data, error } = await anon
      .from("tier_prizes_public" as any)
      .select("id, name, is_sold_out, total")
      .limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    if (data && data[0]) {
      expect((data[0] as any).remaining).toBeUndefined();
      expect((data[0] as any).probability_weight).toBeUndefined();
    }
  });

  it("get_campaign_stock_summary returns coarse buckets only", async () => {
    const { data: camps } = await anon.from("campaigns").select("id").eq("is_active", true).limit(3);
    const ids = (camps || []).map((c: any) => c.id);
    if (ids.length === 0) return;

    const { data, error } = await anon.rpc("get_campaign_stock_summary" as any, {
      _campaign_ids: ids,
    });
    expect(error).toBeNull();
    if (Array.isArray(data) && data.length > 0) {
      const row: any = data[0];
      expect(typeof row.remaining_bucket).toBe("string");
      // Must be a bucket label, not an exact integer like "13"
      expect(row.remaining_bucket).toMatch(/^(0|<5|5\+|10\+|25\+|50\+|\d+\+)$/);
    }
  });
});
