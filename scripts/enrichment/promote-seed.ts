import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { listPlaces } from "../../src/lib/places";
import type { Place } from "../../src/lib/place-types";
import { parseSeedPlaces, type SeedPlace } from "../db/seed";

function optionalNumber(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalString(value: string): string | undefined {
  return value.trim() || undefined;
}

function promotedPlace(place: Place, existing: SeedPlace | undefined): SeedPlace {
  return {
    id: place.id,
    name: place.name,
    category: place.category,
    rating: place.rating || undefined,
    reviews: place.reviews || undefined,
    price: optionalString(place.price),
    distance: place.distance || undefined,
    vibe: place.vibe || undefined,
    confidence: place.confidence || undefined,
    address: optionalString(place.address),
    phone: optionalString(place.phone),
    website: optionalString(place.website),
    googleMaps: optionalString(place.googleMaps),
    booking: optionalString(place.booking),
    notes: existing?.notes !== undefined ? existing.notes : optionalString(place.notes),
    lat: optionalNumber(existing?.lat) ?? optionalNumber(place.lat),
    lng: optionalNumber(existing?.lng) ?? optionalNumber(place.lng),
    isHomeBase: existing?.isHomeBase ?? (place.isHomeBase || undefined),
  };
}

export function promoteSeedPlaces(seedPlaces: SeedPlace[], places: Place[]): SeedPlace[] {
  const seedById = new Map(seedPlaces.map((place) => [place.id, place]));
  const placeById = new Map(places.map((place) => [place.id, place]));
  const promoted: SeedPlace[] = [];
  const seen = new Set<string>();

  for (const seedPlace of seedPlaces) {
    const place = placeById.get(seedPlace.id);
    if (!place) continue;
    promoted.push(promotedPlace(place, seedPlace));
    seen.add(seedPlace.id);
  }

  for (const place of places) {
    if (!seen.has(place.id)) {
      promoted.push(promotedPlace(place, seedById.get(place.id)));
    }
  }

  return promoted;
}

async function promoteSeed(): Promise<void> {
  const seedPath = join(process.cwd(), "data", "places.seed.json");
  const seedPlaces = parseSeedPlaces(JSON.parse(await readFile(seedPath, "utf8")));
  const places = await listPlaces();
  const promoted = promoteSeedPlaces(seedPlaces, places);

  await writeFile(seedPath, `${JSON.stringify(promoted, null, 2)}\n`);
  console.log(`Promoted ${promoted.length} active places into ${seedPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  promoteSeed().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
