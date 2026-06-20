import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "../../scripts/enrichment/csv";

describe("CSV helpers", () => {
  it("round-trips quoted commas and newlines", () => {
    const csv = toCsv([{ id: "1", notes: "a,b\nc", quote: '"hello"' }]);

    expect(parseCsv(csv)).toEqual([{ id: "1", notes: "a,b\nc", quote: '"hello"' }]);
  });

  it("rejects malformed CSV", () => {
    expect(() => parseCsv('id,name\n1,"unterminated')).toThrow("unterminated");
    expect(() => parseCsv("id,id\n1,2")).toThrow("duplicate header");
  });
});
