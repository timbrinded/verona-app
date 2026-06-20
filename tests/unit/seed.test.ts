import { describe, expect, it } from "vitest";
import { parseSeedPlaces } from "../../scripts/db/seed";

describe("seed validation", () => {
  it("accepts valid seed rows", () => {
    expect(
      parseSeedPlaces([
        {
          id: "place-1",
          name: "Place One",
          category: "Craft Beer",
          rating: 4.5,
          lat: 45.4,
          lng: 10.9,
        },
      ]),
    ).toHaveLength(1);
  });

  it("rejects missing and duplicate ids", () => {
    expect(() => parseSeedPlaces([{ name: "Missing", category: "Pub" }])).toThrow("missing id");
    expect(() =>
      parseSeedPlaces([
        { id: "place-1", name: "One", category: "Pub" },
        { id: "place-1", name: "Two", category: "Pub" },
      ]),
    ).toThrow("duplicate id place-1");
  });
});
