import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { listPlaces } from "../../src/lib/places";
import { toCsv, type CsvRow } from "./csv";

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function missingFields(place: Awaited<ReturnType<typeof listPlaces>>[number]): string[] {
  const missing: string[] = [];

  if (!place.phone) missing.push("phone");
  if (!place.website) missing.push("website");
  if (!place.googleMaps) missing.push("google_maps");
  if (!place.booking && !place.isHomeBase) missing.push("booking");
  if (place.details.openingHours.length === 0) missing.push("opening_hours");
  if (!place.details.bestTimeToVisit) missing.push("best_time_to_visit");
  if (!place.details.reservationGuidance) missing.push("reservation_guidance");
  if (!place.details.menuHighlights) missing.push("menu_highlights");
  if (!place.details.visitTips) missing.push("visit_tips");
  if (place.sources.length === 0) missing.push("citations");

  return missing;
}

async function prepare(): Promise<void> {
  const includeAll = process.argv.includes("--all");
  const places = await listPlaces();
  const rows: CsvRow[] = places
    .map((place) => ({ place, missing: missingFields(place) }))
    .filter(({ place, missing }) => includeAll || !place.lastEnrichedAt || missing.length > 0)
    .map(({ place, missing }) => ({
      id: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      lat: place.lat?.toString() ?? "",
      lng: place.lng?.toString() ?? "",
      website: place.website,
      google_maps_url: place.googleMaps,
      booking_url: place.booking,
      phone: place.phone,
      rating: place.rating ? place.rating.toString() : "",
      review_count: place.reviews ? place.reviews.toString() : "",
      price: place.price,
      notes: place.notes,
      missing_fields: missing.join(";"),
    }));

  const target = join(process.cwd(), "data", "enrichment", `parallel-input-${timestamp()}.csv`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, toCsv(rows));

  console.log(`Prepared ${rows.length} places for enrichment`);
  console.log(target);
}

prepare().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
