import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import type { Place } from "@/lib/place-types";
import { parsePlacesPayload } from "@/lib/place-validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function shouldUseSqlite(): boolean {
  if (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL) return true;
  return process.env.VERCEL !== "1";
}

async function loadStaticPlaces(): Promise<Place[]> {
  const path = join(process.cwd(), "public", "data", "places.json");
  return parsePlacesPayload(JSON.parse(await readFile(path, "utf8")));
}

function placesResponse(places: Place[], source: string) {
  return NextResponse.json(places, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      "X-Places-Source": source,
    },
  });
}

export async function GET() {
  if (!shouldUseSqlite()) {
    const places = await loadStaticPlaces();
    return placesResponse(places, "static-fallback");
  }

  try {
    const { listPlaces } = await import("@/lib/places");
    const places = await listPlaces();

    return placesResponse(places, "sqlite");
  } catch (error: unknown) {
    console.error("Failed to load places from SQLite", error);

    try {
      const places = await loadStaticPlaces();
      return placesResponse(places, "static-fallback-after-error");
    } catch (fallbackError: unknown) {
      console.error("Failed to load static place fallback", fallbackError);
    }

    return NextResponse.json(
      { error: "Failed to load places" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "X-Places-Source": "sqlite-error",
        },
      },
    );
  }
}
