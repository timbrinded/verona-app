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
  primaryType?: string;
  types?: string[];
}

interface SearchResponse {
  places?: GooglePlace[];
}

const SEARCHES = [
  { query: "best osteria in Verona Italy locals", category: "Osteria" },
  { query: "best trattoria in Verona Italy locals", category: "Trattoria" },
  { query: "best restaurants Verona Italy Michelin Bib Gourmand", category: "Fine Dining" },
  { query: "best wine bars Verona Italy", category: "Wine Bar" },
  { query: "best cocktail bars Verona Italy", category: "Cocktail Bar" },
  { query: "best craft beer pubs Verona Italy", category: "Pub" },
  { query: "best gelato Verona Italy", category: "Gelato" },
  { query: "best cafes Verona Italy specialty coffee", category: "Aperitivo" },
  { query: "hidden sights Verona Italy churches museums gardens", category: "Sights" },
  { query: "best viewpoints Verona Italy", category: "Viewpoint" },
  { query: "restaurants near Piazza delle Erbe Verona locals", category: "Osteria" },
  { query: "bars restaurants San Zeno Verona locals", category: "Pub" },
  { query: "Veronetta Verona restaurants bars locals", category: "Osteria" },
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

async function searchPlaces(apiKey: string, query: string): Promise<GooglePlace[]> {
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
        "places.primaryType",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: 45.4384, longitude: 10.9916 },
          radius: 3500,
        },
      },
      pageSize: 20,
      languageCode: "en",
      regionCode: "IT",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places search failed for "${query}": ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as SearchResponse;
  return payload.places ?? [];
}

function rowFromPlace(place: GooglePlace, category: string, query: string): CsvRow {
  const name = place.displayName?.text ?? "";
  const googleId = place.id ?? name;

  return {
    id: `google-${googleId.replace(/^places\//, "").replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    name,
    category,
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
    notes: `Google Places candidate from query: ${query}`,
    missing_fields: "new_candidate",
    candidate_source: place.googleMapsUri ?? "",
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is required");

  const targetIndex = process.argv.indexOf("--target");
  const target = targetIndex >= 0 ? process.argv[targetIndex + 1] : join(process.cwd(), "data", "enrichment", "candidates.csv");
  const existingPlaces = await listPlaces();
  const existingNames = new Set(existingPlaces.map((place) => normalize(place.name)));
  const existingMaps = new Set(existingPlaces.map((place) => place.googleMaps).filter(Boolean));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const rows: CsvRow[] = [];

  for (const search of SEARCHES) {
    const places = await searchPlaces(apiKey, search.query);
    for (const place of places) {
      const name = place.displayName?.text ?? "";
      const normalized = normalize(name);
      if (!name || !isOpen(place)) continue;
      if (existingNames.has(normalized) || seenNames.has(normalized)) continue;
      if (place.googleMapsUri && existingMaps.has(place.googleMapsUri)) continue;

      const row = rowFromPlace(place, search.category, search.query);
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      seenNames.add(normalized);
      rows.push(row);
    }
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, toCsv(rows));
  console.log(`Wrote ${rows.length} Google Places candidates to ${target}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
