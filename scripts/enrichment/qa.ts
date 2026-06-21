import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { listPlaces } from "../../src/lib/places";
import { isDecorativeAsset, isSocialUrl } from "../../src/lib/media-quality";
import { validateBookingUrl } from "./booking";

interface QaIssue {
  id: string;
  name: string;
  field: string;
  message: string;
}

function hasCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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
    issues,
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
