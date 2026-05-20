/**
 * Centralized JSON-LD blobs for site-wide schema.org markup.
 * These are referenced from the Index page so Google sees them on the homepage,
 * which is the canonical place for Organization & SoftwareApplication entities.
 */

export const SITE_URL = "https://bushidovault.com";
const LOGO_URL = `${SITE_URL}/favicon.webp`;

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PT. BUSHIDO TOVARICH TECHNOLOGY",
  alternateName: "Bushido Vault",
  url: SITE_URL,
  logo: LOGO_URL,
  description:
    "PT. BUSHIDO TOVARICH TECHNOLOGY adalah pengembang Bushido Vault — platform kolektibel online Indonesia dengan sistem adil, transparan, dan berbasis komunitas.",
  foundingLocation: {
    "@type": "Place",
    address: { "@type": "PostalAddress", addressCountry: "ID" },
  },
  sameAs: [SITE_URL],
};

export const softwareApplicationLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Bushido Vault",
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  image: LOGO_URL,
  description:
    "Platform kolektibel online Indonesia dengan pengalaman kolektibel terpercaya, sistem adil, jaminan Pity System, dan transfer koin antar pengguna.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "IDR",
  },
  featureList: [
    "Transparent Pity System",
    "Peer-to-Peer Coin Transfer",
    "Provably Fair Draws",
    "Real-time Prize Pool",
    "Last-One Bonus Prize",
    "Community Leaderboard",
  ],
  publisher: {
    "@type": "Organization",
    name: "PT. BUSHIDO TOVARICH TECHNOLOGY",
  },
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Bushido Vault",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};
