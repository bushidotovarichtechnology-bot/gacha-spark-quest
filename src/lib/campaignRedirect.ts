/**
 * Pure helper that decides whether the current `/campaign/:slug` route
 * parameter should be redirected to the canonical slug URL.
 *
 * Used by `CampaignDetail` so legacy ID-based URLs (e.g. `/campaign/abc-123`)
 * automatically rewrite to the slug-based canonical URL
 * (e.g. `/campaign/nama-event-gacha`) using a `replace` navigation so the
 * legacy URL does not pollute browser history.
 *
 * Returning `null` means: stay on the current URL.
 * Returning a string means: navigate to that path with `{ replace: true }`.
 */
export interface CampaignSlugLike {
  slug?: string | null;
}

export function resolveCanonicalCampaignPath(
  routeParam: string | undefined | null,
  campaign: CampaignSlugLike | null | undefined,
): string | null {
  if (!campaign || !campaign.slug) return null;
  if (!routeParam) return null;
  if (routeParam === campaign.slug) return null;
  return `/campaign/${campaign.slug}`;
}
