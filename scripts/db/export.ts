import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { listPlaces } from "../../src/lib/places";
import type { Place } from "../../src/lib/place-types";
import { parsePlacesPayload } from "../../src/lib/place-validation";

const execFileAsync = promisify(execFile);

function stableComparable(place: Place): string {
  return JSON.stringify({
    ...place,
    lastEnrichedAt: null,
    updatedAt: "",
    details: {
      ...place.details,
      updatedAt: null,
    },
  });
}

export function preserveStableTimestamps(places: Place[], existingPlaces: Place[]): Place[] {
  const existingById = new Map(existingPlaces.map((place) => [place.id, place]));

  return places.map((place) => {
    const existing = existingById.get(place.id);
    if (!existing || stableComparable(existing) !== stableComparable(place)) {
      return place;
    }

    return {
      ...place,
      lastEnrichedAt: existing.lastEnrichedAt,
      updatedAt: existing.updatedAt,
      details: {
        ...place.details,
        updatedAt: existing.details.updatedAt,
      },
    };
  });
}

export function serializePlaces(places: Place[]): string {
  return `${JSON.stringify(places, null, 2)}\n`;
}

async function readTrackedPlaces(target: string): Promise<Place[]> {
  try {
    const trackedPath = relative(process.cwd(), target);
    const { stdout } = await execFileAsync("git", ["show", `HEAD:${trackedPath}`], {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024,
    });
    return parsePlacesPayload(JSON.parse(stdout));
  } catch {
    return [];
  }
}

async function readCurrentPlaces(target: string): Promise<Place[]> {
  try {
    return parsePlacesPayload(JSON.parse(await readFile(target, "utf8")));
  } catch {
    return [];
  }
}

async function exportPlaces(): Promise<void> {
  const places = await listPlaces();
  const target = join(process.cwd(), "public", "data", "places.json");
  const trackedPlaces = await readTrackedPlaces(target);
  const existingPlaces = trackedPlaces.length ? trackedPlaces : await readCurrentPlaces(target);
  const stablePlaces = preserveStableTimestamps(places, existingPlaces);

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, serializePlaces(stablePlaces));

  console.log(`Exported ${stablePlaces.length} places to ${target}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  exportPlaces().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
