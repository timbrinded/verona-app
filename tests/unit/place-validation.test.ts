import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parsePlacesPayload } from "../../src/lib/place-validation";

describe("place payload validation", () => {
  it("accepts the generated data snapshot", async () => {
    const payload = JSON.parse(await readFile("public/data/places.json", "utf8"));

    expect(parsePlacesPayload(payload)).toHaveLength(54);
  });

  it("rejects non-place responses", () => {
    expect(() => parsePlacesPayload({ error: "nope" })).toThrow("expected an array");
    expect(() => parsePlacesPayload([{ id: "missing-fields" }])).toThrow("missing slug");
  });
});
