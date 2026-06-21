import { describe, expect, it } from "vitest";
import type { Place } from "../../src/lib/place-types";
import { preserveStableTimestamps, serializePlaces } from "../../scripts/db/export";

function place(overrides: Partial<Place> = {}): Place {
  return {
    id: "place-1",
    slug: "place-one",
    name: "Place One",
    category: "Pub",
    rating: 0,
    reviews: 0,
    price: "",
    distance: 0,
    vibe: 0,
    confidence: 0,
    address: "",
    phone: "",
    website: "",
    googleMaps: "",
    booking: "",
    notes: "",
    description: "",
    isHomeBase: false,
    status: "active",
    links: [],
    details: {
      openingHours: [],
      bestTimeToVisit: "",
      reservationGuidance: "",
      dietaryTags: [],
      accessibilityNotes: "",
      paymentNotes: "",
      photoUrls: [],
      menuHighlights: "",
      visitTips: "",
      bookingNotes: "",
      socialLinks: {},
      updatedAt: "old-detail-time",
    },
    sources: [],
    media: [],
    dataQuality: {},
    lastEnrichedAt: "old-enriched-time",
    updatedAt: "old-place-time",
    ...overrides,
  };
}

describe("static export stability", () => {
  it("preserves timestamps when only volatile fields changed", () => {
    const next = place({ updatedAt: "new-place-time", details: { ...place().details, updatedAt: "new-detail-time" } });
    const [stable] = preserveStableTimestamps([next], [place()]);

    expect(stable.updatedAt).toBe("old-place-time");
    expect(stable.details.updatedAt).toBe("old-detail-time");
    expect(stable.lastEnrichedAt).toBe("old-enriched-time");
  });

  it("keeps new timestamps when content changed", () => {
    const next = place({ name: "Renamed", updatedAt: "new-place-time" });
    const [stable] = preserveStableTimestamps([next], [place()]);

    expect(stable.updatedAt).toBe("new-place-time");
  });

  it("serializes with a trailing newline", () => {
    expect(serializePlaces([place()]).endsWith("\n")).toBe(true);
  });
});
