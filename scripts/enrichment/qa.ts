import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { listPlaces } from "../../src/lib/places";
import { isDecorativeAsset, isSocialUrl } from "../../src/lib/media-quality";
import { validateBookingUrl } from "./booking";
import { textShowsPastMidnight } from "./merge-late-night";

interface QaIssue {
  id: string;
  name: string;
  field: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isUnknown(value: string): boolean {
  return !value || ["unknown", "unclear", "not specified", "not available"].includes(value.toLowerCase());
}

async function qa(): Promise<void> {
  const soft = process.argv.includes("--soft");
  const reportIndex = process.argv.indexOf("--report");
  const reportPath =
    reportIndex >= 0
      ? process.argv[reportIndex + 1]
      : join(process.cwd(), "data", "enrichment", `qa-report-${new Date().toISOString().slice(0, 10)}.json`);
  const places = await listPlaces();
  const issues: QaIssue[] = [];
  const warnings: QaIssue[] = [];

  for (const place of places) {
    if (!place.isHomeBase && (!hasCoordinate(place.lat) || !hasCoordinate(place.lng))) {
      issues.push({ id: place.id, name: place.name, field: "coordinates", message: "Missing coordinates" });
    }

    if (place.booking) {
      const booking = validateBookingUrl(place.booking);
      if (!booking.valid) {
        issues.push({
          id: place.id,
          name: place.name,
          field: "booking",
          message: `Invalid booking URL: ${booking.reason}`,
        });
      }
    }

    if (!place.isHomeBase && place.sources.length === 0) {
      issues.push({ id: place.id, name: place.name, field: "citations", message: "Missing citations" });
    }

    if (place.category === "Late Night") {
      const lateNight = isRecord(place.dataQuality.lateNight) ? place.dataQuality.lateNight : {};
      const lateOpenConfidence = numberValue(lateNight.lateOpenConfidence) || place.confidence;
      const latestClose = stringValue(lateNight.latestConfirmedClose);
      const lateEvidence = stringValue(lateNight.lateHoursEvidence);
      const queueLikelihood = stringValue(lateNight.queueLikelihood);
      const queueDuration = stringValue(lateNight.queueDuration);
      const doorPolicy = stringValue(lateNight.doorPolicy);
      const lastEntryRisk = stringValue(lateNight.lastEntryRisk);

      if (!textShowsPastMidnight([latestClose, lateEvidence, place.details.openingHours.join(" ")].join(" "))) {
        issues.push({
          id: place.id,
          name: place.name,
          field: "late_hours_evidence",
          message: "Late Night venue lacks evidence of being open past midnight",
        });
      }

      if (lateOpenConfidence < 0.7) {
        issues.push({
          id: place.id,
          name: place.name,
          field: "late_open_confidence",
          message: `Late-open confidence below 0.7: ${lateOpenConfidence}`,
        });
      }

      if (queueLikelihood.toLowerCase() === "high" && !queueDuration) {
        warnings.push({
          id: place.id,
          name: place.name,
          field: "queue_duration",
          message: "High queue likelihood without a queue duration estimate",
        });
      }

      if (isUnknown(doorPolicy) || isUnknown(lastEntryRisk)) {
        warnings.push({
          id: place.id,
          name: place.name,
          field: "door_policy",
          message: "Door policy or last-entry risk is unknown",
        });
      }
    }

    for (const media of place.media) {
      if (!media.approved) {
        issues.push({ id: place.id, name: place.name, field: "media", message: "Unapproved media is exposed" });
      }
      if (media.width < 520 || media.height < 320) {
        issues.push({ id: place.id, name: place.name, field: "media", message: `Media too small: ${media.url}` });
      }
      if (isSocialUrl(media.url) || isSocialUrl(media.sourceUrl)) {
        issues.push({ id: place.id, name: place.name, field: "media", message: `Social media image exposed: ${media.url}` });
      }
      if (isDecorativeAsset(`${media.url} ${media.caption}`)) {
        issues.push({ id: place.id, name: place.name, field: "media", message: `Decorative media exposed: ${media.url}` });
      }
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    places: places.length,
    issueCount: issues.length,
    warningCount: warnings.length,
    issues,
    warnings,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`QA report: ${reportPath}`);

  if (!soft && issues.length > 0) {
    throw new Error(`Data QA failed with ${issues.length} issue(s)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  qa().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
