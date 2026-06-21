import { describe, expect, it } from "vitest";
import { resolveBookingUpdate, validateBookingUrl } from "../../scripts/enrichment/booking";

describe("booking validation", () => {
  it("rejects generic TheFork search URLs", () => {
    const result = validateBookingUrl("https://www.thefork.com/search?q=Osteria%20Verona");

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("generic_search");
  });

  it("accepts direct booking URLs", () => {
    expect(validateBookingUrl("https://www.thefork.it/ristorante/alchimista-bistrot-e-mescole-r363655").valid).toBe(
      true,
    );
    expect(validateBookingUrl("https://autoreserve.com/en/restaurants/bobpCKxvW7Y65Qoafaw3").valid).toBe(true);
  });

  it("clears stale existing booking links when no direct replacement is verified", () => {
    const update = resolveBookingUpdate("", "https://www.thefork.com/search?q=Osteria%20Verona", "");

    expect(update).toMatchObject({
      shouldUpdate: true,
      url: "",
      reason: "generic_search",
    });
    expect(update.note).toContain("No direct booking link verified");
  });
});
