// Public sitemap.xml generator. Returns XML listing all static routes plus
// active campaigns by their slug. Cached lightly via Cache-Control.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://bushidogacha.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/login", changefreq: "yearly", priority: "0.3" },
  { path: "/register", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    const urls: string[] = [];

    for (const r of STATIC_ROUTES) {
      urls.push(
        `<url><loc>${SITE_URL}${r.path}</loc><changefreq>${r.changefreq}</changefreq><priority>${r.priority}</priority></url>`,
      );
    }

    for (const c of campaigns ?? []) {
      if (!c.slug) continue;
      const lastmod = c.updated_at ? new Date(c.updated_at).toISOString() : new Date().toISOString();
      urls.push(
        `<url><loc>${SITE_URL}/campaign/${escapeXml(c.slug)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("sitemap error", err);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
      status: 200,
    });
  }
});
