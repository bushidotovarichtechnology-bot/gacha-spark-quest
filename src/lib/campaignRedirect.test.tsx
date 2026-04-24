import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { resolveCanonicalCampaignPath } from "@/lib/campaignRedirect";

/**
 * Unit tests — pure redirect resolver.
 *
 * Verifies the rule: when the route param is a legacy ID (anything that does
 * not equal the campaign's canonical slug), we must produce the canonical
 * slug path so the caller can `navigate(path, { replace: true })`.
 */
describe("resolveCanonicalCampaignPath", () => {
  it("redirects when route param is a legacy ID different from the slug", () => {
    expect(
      resolveCanonicalCampaignPath("abc-123-uuid", { slug: "nama-event-gacha" }),
    ).toBe("/campaign/nama-event-gacha");
  });

  it("returns null when route param already matches the canonical slug", () => {
    expect(
      resolveCanonicalCampaignPath("nama-event-gacha", { slug: "nama-event-gacha" }),
    ).toBeNull();
  });

  it("returns null when campaign has no slug (cannot redirect)", () => {
    expect(resolveCanonicalCampaignPath("anything", { slug: null })).toBeNull();
    expect(resolveCanonicalCampaignPath("anything", { slug: "" })).toBeNull();
    expect(resolveCanonicalCampaignPath("anything", {})).toBeNull();
  });

  it("returns null when campaign is missing entirely", () => {
    expect(resolveCanonicalCampaignPath("anything", null)).toBeNull();
    expect(resolveCanonicalCampaignPath("anything", undefined)).toBeNull();
  });

  it("returns null when route param is empty/undefined", () => {
    expect(resolveCanonicalCampaignPath("", { slug: "x" })).toBeNull();
    expect(resolveCanonicalCampaignPath(undefined, { slug: "x" })).toBeNull();
  });

  it("treats UUID-style legacy IDs as redirect candidates", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(
      resolveCanonicalCampaignPath(uuid, { slug: "naruto-blindbox-s1" }),
    ).toBe("/campaign/naruto-blindbox-s1");
  });
});

/**
 * Integration test — verifies the resolver wires up correctly with React
 * Router's `useNavigate({ replace: true })`. We render a tiny component that
 * mirrors how `CampaignDetail` performs the redirect (without pulling in the
 * heavy page + Supabase + providers), and assert that landing on a legacy
 * ID URL ends up on the canonical slug URL after the redirect runs.
 */
const TestRedirector = ({
  campaign,
}: {
  campaign: { slug: string | null } | null;
}) => {
  const { slug: routeParam } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const canonical = resolveCanonicalCampaignPath(routeParam, campaign);
  if (canonical) navigate(canonical, { replace: true });
  return <div data-testid="route-param">{routeParam ?? ""}</div>;
};

describe("Legacy /campaign/:id → /campaign/:slug redirect (router integration)", () => {
  it("redirects ID-based URL to canonical slug URL using replace navigation", () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/campaign/abc-123-legacy-id"]}>
        <Routes>
          <Route
            path="/campaign/:slug"
            element={<TestRedirector campaign={{ slug: "nama-event-gacha" }} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // After the synchronous redirect, React Router re-renders at the new URL
    // and useParams() reports the canonical slug.
    expect(getByTestId("route-param").textContent).toBe("nama-event-gacha");
  });

  it("does NOT redirect when already on the canonical slug URL", () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/campaign/nama-event-gacha"]}>
        <Routes>
          <Route
            path="/campaign/:slug"
            element={<TestRedirector campaign={{ slug: "nama-event-gacha" }} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByTestId("route-param").textContent).toBe("nama-event-gacha");
  });

  it("redirects different legacy IDs to their canonical slugs", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const { getByTestId } = render(
      <MemoryRouter initialEntries={[`/campaign/${uuid}`]}>
        <Routes>
          <Route
            path="/campaign/:slug"
            element={<TestRedirector campaign={{ slug: "naruto-blindbox-s1" }} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(getByTestId("route-param").textContent).toBe("naruto-blindbox-s1");
  });
});
