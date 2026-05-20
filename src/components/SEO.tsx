import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  /** Path beginning with "/" — combined with site origin to form canonical URL. */
  canonicalPath?: string;
  /** Absolute image URL for OG / Twitter cards. */
  image?: string;
  /** "website" | "article" | "product" etc. */
  type?: string;
  /** Optional JSON-LD structured data object(s). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Set true to ask crawlers to skip this page (e.g. auth pages). */
  noindex?: boolean;
}

const SITE_URL = "https://bushidovault.com";
const DEFAULT_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/dY6AwmkFmlRRiJD2BZmVPEqLuqM2/social-images/social-1776672907909-Gemini_Generated_Image_1kqrhc1kqrhc1kqr.webp";

const SEO = ({
  title,
  description,
  canonicalPath,
  image = DEFAULT_IMAGE,
  type = "website",
  jsonLd,
  noindex,
}: SEOProps) => {
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : SITE_URL;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Bushido Vault" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {ldArray.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
