import { describe, expect, it } from "vitest";
import { hasLateHoursEvidence, textShowsPastMidnight } from "../../scripts/enrichment/merge-late-night";

describe("late-night candidate merge gates", () => {
  it("recognizes evidence that a venue is open past midnight", () => {
    expect(textShowsPastMidnight("Friday 19:00-00:30")).toBe(true);
    expect(textShowsPastMidnight("Open until 2am on Saturday")).toBe(true);
    expect(textShowsPastMidnight("Open after midnight on club nights")).toBe(true);
  });

  it("rejects midnight-only or earlier closing evidence", () => {
    expect(textShowsPastMidnight("Friday 18:00-00:00")).toBe(false);
    expect(textShowsPastMidnight("Open until 11:30pm")).toBe(false);
  });

  it("checks the late-night CSV evidence fields", () => {
    expect(
      hasLateHoursEvidence({
        latest_confirmed_close: "01:00",
        late_hours_evidence: "",
        opening_hours: "",
      }),
    ).toBe(true);

    expect(
      hasLateHoursEvidence({
        latest_confirmed_close: "00:00",
        late_hours_evidence: "",
        opening_hours: "",
      }),
    ).toBe(false);
  });
});
