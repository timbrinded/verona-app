import { describe, expect, it } from "vitest";
import {
  confidenceFromComponents,
  lateNightConfidenceFromComponents,
  lateNightMethodologyScore,
  lateNightVibeFromComponents,
  methodologyScore,
  parseLateNightScoreComponents,
  parseScoreComponents,
  vibeFromComponents,
} from "../../scripts/enrichment/scoring";

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

  it("parses and scores late-night components separately", () => {
    const components = parseLateNightScoreComponents(
      "open past midnight; recent late evidence; official source; multi-source; music style; good crowd; manageable queue; transport; hot",
    );

    expect(lateNightConfidenceFromComponents(components)).toBe(0.85);
    expect(lateNightVibeFromComponents(components)).toBe(14);
  });

  it("scores structured late-night components", () => {
    const score = lateNightMethodologyScore(
      JSON.stringify({
        openPastMidnight: true,
        recentLateEvidence: true,
        hoursListed: true,
        multiSource: true,
        officialSource: true,
        eventSocialProof: true,
        musicDefined: true,
        crowdFit: true,
        strictDoorWarning: true,
      }),
    );

    expect(score.confidence).toBe(1);
    expect(score.vibe).toBe(14);
  });
});
