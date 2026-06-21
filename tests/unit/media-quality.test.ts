import { describe, expect, it } from "vitest";
import {
  assessMediaCandidate,
  imageDimensionsFromBuffer,
  isEligibleMediaSource,
} from "../../src/lib/media-quality";

describe("media quality gate", () => {
  it("rejects social CDN images even when they have valid dimensions", () => {
    const assessment = assessMediaCandidate({
      url: "https://scontent.cdninstagram.com/v/t51.2885-15/profile-photo.jpg",
      sourceUrl: "https://www.instagram.com/example/",
      sourceType: "unknown",
      placeName: "The Gelatist",
      category: "Gelato",
      context: "profile photo",
      width: 1200,
      height: 800,
      contentType: "image/jpeg",
    });

    expect(assessment.approved).toBe(false);
    expect(assessment.rejectedReason).toBe("social media image source");
  });

  it("rejects official logos and decorative assets", () => {
    const logoAssessment = assessMediaCandidate({
      url: "https://thegelatist.it/wp-content/uploads/logo+icon.png",
      sourceUrl: "https://thegelatist.it/",
      sourceType: "official_site",
      placeName: "The Gelatist",
      category: "Gelato",
      context: "site logo",
      width: 1200,
      height: 800,
      contentType: "image/png",
    });
    const concatenatedLogoAssessment = assessMediaCandidate({
      url: "https://example.com/wp-content/uploads/2017/04/logogriglia.png",
      sourceUrl: "https://example.com/menu/",
      sourceType: "official_site",
      placeName: "La Griglia",
      category: "Osteria",
      context: "menu image",
      width: 1200,
      height: 800,
      contentType: "image/png",
    });
    const placeholderAssessment = assessMediaCandidate({
      url: "https://example.com/assets/images/placeholders/google-maps-minimal-1280x920.jpg",
      sourceUrl: "https://example.com/contatti",
      sourceType: "official_site",
      placeName: "Bistrò con Amore",
      category: "Fine Dining",
      context: "map placeholder",
      width: 1280,
      height: 920,
      contentType: "image/jpeg",
    });

    expect(logoAssessment.approved).toBe(false);
    expect(concatenatedLogoAssessment.approved).toBe(false);
    expect(placeholderAssessment.approved).toBe(false);
    expect(placeholderAssessment.rejectedReason).toBe("decorative or brand asset");
  });

  it("approves a large relevant official image", () => {
    const assessment = assessMediaCandidate({
      url: "https://ristorante.example/wp-content/uploads/gallery/osteria-dining-room.jpg",
      sourceUrl: "https://ristorante.example/gallery",
      sourceType: "official_site",
      placeName: "Osteria Example",
      category: "Osteria",
      context: "gallery restaurant dining room",
      width: 1400,
      height: 900,
      contentType: "image/jpeg",
    });

    expect(assessment.approved).toBe(true);
    expect(assessment.kind).toBe("interior");
    expect(assessment.qualityScore).toBeGreaterThanOrEqual(10);
  });

  it("rejects generic social profile pages as source pages", () => {
    expect(isEligibleMediaSource("https://www.instagram.com/thegelatist/", "https://thegelatist.it/")).toBe(false);
  });

  it("rejects link hub pages as representative media sources", () => {
    expect(isEligibleMediaSource("https://linktr.ee/ammazza_caffe", "https://linktr.ee/ammazza_caffe")).toBe(false);
  });

  it("parses PNG dimensions from a header", () => {
    const buffer = Buffer.alloc(24);
    buffer[0] = 0x89;
    buffer.write("PNG", 1, "ascii");
    buffer.writeUInt32BE(1200, 16);
    buffer.writeUInt32BE(800, 20);

    expect(imageDimensionsFromBuffer(buffer)).toEqual({ width: 1200, height: 800, type: "png" });
  });
});
