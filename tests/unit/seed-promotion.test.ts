import { describe, expect, it } from "vitest";
import { promoteSeedPlaces } from "../../scripts/enrichment/promote-seed";
import type { SeedPlace } from "../../scripts/db/seed";
import type { Place } from "../../src/lib/place-types";

function place(overrides: Partial<Place> = {}): Place {
  return {
    id: "place-1",
    slug: "place-one",
    name: "Place One",
    category: "Pub",
    rating: 4.8,
    reviews: 120,
    price: "EUR",
    distance: 0.4,
    vibe: 12,
    confidence: 0.9,
    address: "Via Roma 1",
    phone: "+39 000",
    website: "https://example.com",
    googleMaps: "https://maps.google.com/?cid=1",
    booking: "https://example.com/book",
    notes: "Fresh generated note",
    description: "",
    lat: 45.4,
    lng: 10.9,
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
      updatedAt: null,
    },
    sources: [],
    media: [],
    dataQuality: {},
    lastEnrichedAt: null,
    updatedAt: "now",
    ...overrides,
  };
}

describe("seed promotion", () => {
  it("preserves manual notes, home-base flag, and pinned coordinates", () => {
    const seed: SeedPlace[] = [
      {
        id: "place-1",
        name: "Old Name",
        category: "Accommodation",
        notes: "Manual note",
        lat: 1,
        lng: 2,
        isHomeBase: true,
      },
    ];

    const [promoted] = promoteSeedPlaces(seed, [
      place({ name: "Updated Name", category: "Accommodation", lat: 45.4, lng: 10.9, isHomeBase: true }),
    ]);

    expect(promoted.name).toBe("Updated Name");
    expect(promoted.notes).toBe("Manual note");
    expect(promoted.lat).toBe(1);
    expect(promoted.lng).toBe(2);
    expect(promoted.isHomeBase).toBe(true);
  });

  it("adds active DB places that are not already in the seed", () => {
    const promoted = promoteSeedPlaces([], [place({ id: "new-place", name: "New Place" })]);

    expect(promoted).toHaveLength(1);
    expect(promoted[0].id).toBe("new-place");
  });
});
