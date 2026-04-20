/**
 * Convert a Supabase Storage public URL into a transformed (resized) URL.
 * Falls back to the original URL for non-Supabase or non-public URLs.
 */
export function supabaseImg(url: string | null | undefined, width = 500, quality = 80): string {
  if (!url) return "";
  if (!url.includes("/storage/v1/object/public/")) return url;
  const transformed = url.replace("/object/public/", "/render/image/public/");
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=${quality}`;
}
