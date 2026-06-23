import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { listPlaces } from "../../src/lib/places";
import { toCsv, type CsvRow } from "./csv";

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  businessStatus?: string;
}

interface SearchResponse {
  places?: GooglePlace[];
}

interface SearchSpec {
  query: string;
  sourceCategory: string;
  minRating?: number;
  minReviews?: number;
  radius?: number;
}

const SEARCHES: SearchSpec[] = [
  { query: "nightclub Verona Italy", sourceCategory: "club", minRating: 3.8, minReviews: 20 },
  { query: "discoteca Verona centro", sourceCategory: "club", minRating: 3.8, minReviews: 20 },
  { query: "bar Verona open late", sourceCategory: "late_bar", minRating: 4.0, minReviews: 25 },
  { query: "cocktail bar Verona open late", sourceCategory: "cocktail_bar", minRating: 4.1, minReviews: 20 },
  { query: "Verona nightlife DJ bar", sourceCategory: "dj_bar", minRating: 4.0, minReviews: 15 },
  { query: "Verona live music bar", sourceCategory: "live_music", minRating: 4.0, minReviews: 15 },
  { query: "Piazza Erbe Verona late night bar", sourceCategory: "late_bar", minRating: 4.0, minReviews: 20 },
  { query: "Veronetta Verona late night bar", sourceCategory: "late_bar", minRating: 4.0, minReviews: 15 },
  { query: "student nightlife Verona bar", sourceCategory: "student_bar", minRating: 3.8, minReviews: 15 },
  { query: "pub Verona open late", sourceCategory: "pub", minRating: 4.0, minReviews: 25 },
  { query: "karaoke Verona bar", sourceCategory: "karaoke", minRating: 3.8, minReviews: 10 },
  { query: "latin music club Verona", sourceCategory: "club", minRating: 3.8, minReviews: 10 },
];

function price(value: string | undefined): string {
  if (!value) return "";
  const levels: Record<string, string> = {
    PRICE_LEVEL_INEXPENSIVE: "EUR",
    PRICE_LEVEL_MODERATE: "EUR EUR",
    PRICE_LEVEL_EXPENSIVE: "EUR EUR EUR",
    PRICE_LEVEL_VERY_EXPENSIVE: "EUR EUR EUR EUR",
  };
  return levels[value] ?? "";
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function isOpen(place: GooglePlace): boolean {
  return !place.businessStatus || place.businessStatus === "OPERATIONAL";
}

function meetsSearchQuality(place: GooglePlace, search: SearchSpec): boolean {
  const rating = place.rating ?? 0;
  const reviews = place.userRatingCount ?? 0;
  if (search.minRating && rating < search.minRating) return false;
  if (search.minReviews && reviews < search.minReviews) return false;
  return true;
}

async function searchPlaces(apiKey: string, search: SearchSpec): Promise<GooglePlace[]> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.googleMapsUri",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.businessStatus",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: search.query,
      locationBias: {
        circle: {
          center: { latitude: 45.4384, longitude: 10.9916 },
          radius: search.radius ?? 5200,
        },
      },
      pageSize: 20,
      languageCode: "en",
      regionCode: "IT",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places search failed for "${search.query}": ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as SearchResponse;
  return payload.places ?? [];
}

function rowFromPlace(place: GooglePlace, search: SearchSpec): CsvRow {
  const name = place.displayName?.text ?? "";
  const googleId = place.id ?? name;

  return {
    id: `google-${googleId.replace(/^places\//, "").replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    name,
    category: "Late Night",
    source_category: search.sourceCategory,
    address: place.formattedAddress ?? "",
    lat: place.location?.latitude?.toString() ?? "",
    lng: place.location?.longitude?.toString() ?? "",
    website: place.websiteUri ?? "",
    google_maps_url: place.googleMapsUri ?? "",
    booking_url: "",
    phone: place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? "",
    rating: place.rating?.toString() ?? "",
    review_count: place.userRatingCount?.toString() ?? "",
    price: price(place.priceLevel),
    notes: `Late-night Google Places candidate from query: ${search.query}`,
    missing_fields: "new_late_night_candidate",
    candidate_source: place.googleMapsUri ?? "",
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is required");

  const targetIndex = process.argv.indexOf("--target");
  const target =
    targetIndex >= 0
      ? process.argv[targetIndex + 1]
      : join(process.cwd(), "data", "enrichment", "late-night-candidates.csv");
  const existingPlaces = await listPlaces();
  const existingNames = new Set(existingPlaces.map((place) => normalize(place.name)));
  const existingMaps = new Set(existingPlaces.map((place) => place.googleMaps).filter(Boolean));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const rows: CsvRow[] = [];

  for (const search of SEARCHES) {
    const places = await searchPlaces(apiKey, search);
    for (const place of places) {
      const name = place.displayName?.text ?? "";
      const normalized = normalize(name);
      if (!name || !isOpen(place)) continue;
      if (!meetsSearchQuality(place, search)) continue;
      if (existingNames.has(normalized) || seenNames.has(normalized)) continue;
      if (place.googleMapsUri && existingMaps.has(place.googleMapsUri)) continue;

      const row = rowFromPlace(place, search);
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      seenNames.add(normalized);
      rows.push(row);
    }
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, toCsv(rows));
  console.log(`Wrote ${rows.length} late-night candidates to ${target}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
