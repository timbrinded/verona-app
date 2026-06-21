import { describe, expect, it } from "vitest";
import { citations, validateEnrichmentRows, validateImportTargets } from "../../scripts/enrichment/import";

describe("enrichment import validation", () => {
  it("requires unique place ids", () => {
    expect(validateEnrichmentRows([{ id: "a" }, { place_id: "b" }])).toEqual(["a", "b"]);
    expect(() => validateEnrichmentRows([{ name: "No id" }])).toThrow("missing id");
    expect(() => validateEnrichmentRows([{ id: "a" }, { id: "a" }])).toThrow("duplicate id a");
  });

  it("allows unknown candidate ids only when explicitly enabled", () => {
    const rows = [{ id: "existing" }, { id: "new-place" }];
    const known = new Set(["existing"]);

    expect(() => validateImportTargets(rows, known, false)).toThrow("unknown place ids new-place");
    expect(validateImportTargets(rows, known, true)).toEqual({
      ids: ["existing", "new-place"],
      existingIds: ["existing"],
      newIds: ["new-place"],
    });
  });

  it("parses structured and loose citations", () => {
    expect(citations('[{"field":"menu","url":"https://example.com/menu","confidence":0.7}]')).toEqual([
      {
        fieldName: "menu",
        sourceUrl: "https://example.com/menu",
        sourceTitle: "",
        excerpt: "",
        confidence: 0.7,
      },
    ]);

    expect(citations("Seen at https://example.com/a and https://example.com/b")).toHaveLength(2);
  });
});
