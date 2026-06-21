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

interface SearchSpec {
  query: string;
  category: string;
  minRating?: number;
  minReviews?: number;
  radius?: number;
}

const SEARCHES: SearchSpec[] = [
  { query: "best osteria in Verona Italy locals", category: "Osteria", minRating: 4.3, minReviews: 40 },
  { query: "osteria tradizionale Verona centro storico", category: "Osteria", minRating: 4.3, minReviews: 35 },
  { query: "osteria Via Sottoriva Verona locals", category: "Osteria", minRating: 4.2, minReviews: 25 },
  { query: "osteria San Zeno Verona locals", category: "Osteria", minRating: 4.2, minReviews: 25 },
  { query: "osteria Veronetta Verona locals", category: "Osteria", minRating: 4.2, minReviews: 20 },
  { query: "osteria Borgo Trento Verona locals", category: "Osteria", minRating: 4.2, minReviews: 20 },
  { query: "osteria Cittadella Verona", category: "Osteria", minRating: 4.2, minReviews: 20 },
  { query: "best trattoria in Verona Italy locals", category: "Trattoria", minRating: 4.3, minReviews: 40 },
  { query: "trattoria tipica Verona centro", category: "Trattoria", minRating: 4.2, minReviews: 30 },
  { query: "trattoria San Zeno Verona", category: "Trattoria", minRating: 4.2, minReviews: 25 },
  { query: "trattoria Veronetta Verona", category: "Trattoria", minRating: 4.2, minReviews: 20 },
  { query: "pastificio ravioli Verona centro", category: "Trattoria", minRating: 4.4, minReviews: 20 },
  { query: "best restaurants Verona Italy Michelin Bib Gourmand", category: "Fine Dining", minRating: 4.3, minReviews: 30 },
  { query: "fine dining Verona tasting menu", category: "Fine Dining", minRating: 4.4, minReviews: 25 },
  { query: "romantic restaurant Verona fine dining", category: "Fine Dining", minRating: 4.3, minReviews: 30 },
  { query: "seafood restaurant Verona high rated", category: "Fine Dining", minRating: 4.3, minReviews: 30 },
  { query: "modern restaurant Verona centro", category: "Fine Dining", minRating: 4.3, minReviews: 25 },
  { query: "best wine bars Verona Italy", category: "Wine Bar", minRating: 4.4, minReviews: 25 },
  { query: "enoteca Verona centro storico", category: "Wine Bar", minRating: 4.4, minReviews: 20 },
  { query: "wine bar Piazza Erbe Verona", category: "Wine Bar", minRating: 4.2, minReviews: 20 },
  { query: "wine bar Veronetta Verona", category: "Wine Bar", minRating: 4.2, minReviews: 15 },
  { query: "natural wine Verona", category: "Wine Bar", minRating: 4.2, minReviews: 10 },
  { query: "best cocktail bars Verona Italy", category: "Cocktail Bar", minRating: 4.4, minReviews: 25 },
  { query: "cocktail bar Verona centro storico", category: "Cocktail Bar", minRating: 4.3, minReviews: 20 },
  { query: "cocktail bar Piazza Bra Verona", category: "Cocktail Bar", minRating: 4.2, minReviews: 20 },
  { query: "cocktail bar Veronetta Verona", category: "Cocktail Bar", minRating: 4.2, minReviews: 15 },
  { query: "best aperitivo Verona locals", category: "Aperitivo", minRating: 4.3, minReviews: 25 },
  { query: "aperitivo Piazza Erbe Verona", category: "Aperitivo", minRating: 4.2, minReviews: 20 },
  { query: "aperitivo San Zeno Verona", category: "Aperitivo", minRating: 4.2, minReviews: 15 },
  { query: "aperitivo Veronetta Verona", category: "Aperitivo", minRating: 4.2, minReviews: 15 },
  { query: "best craft beer pubs Verona Italy", category: "Pub", minRating: 4.3, minReviews: 25 },
  { query: "birreria Verona craft beer", category: "Pub", minRating: 4.3, minReviews: 20 },
  { query: "pub Verona centro storico", category: "Pub", minRating: 4.2, minReviews: 30 },
  { query: "pub San Zeno Verona", category: "Pub", minRating: 4.2, minReviews: 20 },
  { query: "best gelato Verona Italy", category: "Gelato", minRating: 4.4, minReviews: 40 },
  { query: "gelateria artigianale Verona centro", category: "Gelato", minRating: 4.4, minReviews: 25 },
  { query: "gelato San Zeno Verona", category: "Gelato", minRating: 4.3, minReviews: 20 },
  { query: "gelato Veronetta Verona", category: "Gelato", minRating: 4.3, minReviews: 15 },
  { query: "best cafes Verona Italy specialty coffee", category: "Aperitivo", minRating: 4.4, minReviews: 25 },
  { query: "specialty coffee Verona", category: "Aperitivo", minRating: 4.4, minReviews: 15 },
  { query: "cafe Verona centro historic", category: "Aperitivo", minRating: 4.2, minReviews: 30 },
  { query: "pasticceria Verona centro", category: "Aperitivo", minRating: 4.3, minReviews: 30 },
  { query: "breakfast cafe Verona locals", category: "Aperitivo", minRating: 4.3, minReviews: 25 },
  { query: "hidden sights Verona Italy churches museums gardens", category: "Sights", minRating: 4.2, minReviews: 20 },
  { query: "Verona churches to visit", category: "Sights", minRating: 4.2, minReviews: 20 },
  { query: "Verona museums tickets official", category: "Sights", minRating: 4.1, minReviews: 20 },
  { query: "Verona gardens historic", category: "Sights", minRating: 4.2, minReviews: 15 },
  { query: "Verona Roman ruins archaeological sites", category: "Sights", minRating: 4.1, minReviews: 15 },
  { query: "Verona courtyards palaces to visit", category: "Sights", minRating: 4.1, minReviews: 10 },
  { query: "Verona artisan shops historic center", category: "Sights", minRating: 4.3, minReviews: 15 },
  { query: "best viewpoints Verona Italy", category: "Viewpoint", minRating: 4.3, minReviews: 20 },
  { query: "panoramic view Verona", category: "Viewpoint", minRating: 4.2, minReviews: 15 },
  { query: "viewpoint near Castel San Pietro Verona", category: "Viewpoint", minRating: 4.2, minReviews: 15 },
  { query: "Lungadige Verona viewpoints", category: "Viewpoint", minRating: 4.1, minReviews: 10 },
  { query: "restaurants near Piazza delle Erbe Verona locals", category: "Osteria", minRating: 4.2, minReviews: 30 },
  { query: "restaurants near Arena di Verona locals", category: "Osteria", minRating: 4.2, minReviews: 35 },
  { query: "restaurants near Castelvecchio Verona locals", category: "Trattoria", minRating: 4.2, minReviews: 25 },
  { query: "restaurants near Ponte Pietra Verona locals", category: "Osteria", minRating: 4.2, minReviews: 25 },
  { query: "bars restaurants San Zeno Verona locals", category: "Pub", minRating: 4.2, minReviews: 20 },
  { query: "Veronetta Verona restaurants bars locals", category: "Osteria", minRating: 4.2, minReviews: 15 },
  { query: "Borgo Trento Verona restaurants", category: "Trattoria", minRating: 4.2, minReviews: 20 },
  { query: "Cittadella Verona restaurants bars", category: "Aperitivo", minRating: 4.2, minReviews: 20 },
  { query: "Porta Nuova Verona restaurants", category: "Trattoria", minRating: 4.2, minReviews: 25 },
  { query: "Borgo Venezia Verona restaurants", category: "Trattoria", minRating: 4.2, minReviews: 20, radius: 5200 },
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
        "places.primaryType",
        "places.types",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: search.query,
      locationBias: {
        circle: {
          center: { latitude: 45.4384, longitude: 10.9916 },
          radius: search.radius ?? 4200,
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

function meetsSearchQuality(place: GooglePlace, search: SearchSpec): boolean {
  const rating = place.rating ?? 0;
  const reviews = place.userRatingCount ?? 0;
  if (search.minRating && rating < search.minRating) return false;
  if (search.minReviews && reviews < search.minReviews) return false;
  return true;
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
    const places = await searchPlaces(apiKey, search);
    for (const place of places) {
      const name = place.displayName?.text ?? "";
      const normalized = normalize(name);
      if (!name || !isOpen(place)) continue;
      if (!meetsSearchQuality(place, search)) continue;
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
