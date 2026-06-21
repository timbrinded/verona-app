import { describe, expect, it } from "vitest";
import { confidenceFromComponents, methodologyScore, parseScoreComponents, vibeFromComponents } from "../../scripts/enrichment/scoring";

describe("methodology scoring", () => {
  it("parses score components and applies the Notion confidence weights", () => {
    const components = parseScoreComponents(
      "operational; recent reviews; website responds; multi-source; phone listed; hours listed",
    );

    expect(confidenceFromComponents(components)).toBe(1);
  });

  it("scores vibe positives and red flags", () => {
    const score = methodologyScore(
      JSON.stringify({
        michelinListed: true,
        authenticSentiment: true,
        ratingConsistency: true,
        touristTrapLanguage: true,
      }),
    );

    expect(vibeFromComponents(score.components)).toBe(13);
    expect(score.confidence).toBe(0);
  });
});
