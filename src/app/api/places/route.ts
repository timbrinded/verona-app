import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import type { Place } from "@/lib/place-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function shouldUseSqlite(): boolean {
  if (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL) return true;
  return process.env.VERCEL !== "1";
}

async function loadStaticPlaces(): Promise<Place[]> {
  const path = join(process.cwd(), "public", "data", "places.json");
  return JSON.parse(await readFile(path, "utf8")) as Place[];
}

export async function GET() {
  try {
    if (!shouldUseSqlite()) {
      const places = await loadStaticPlaces();

      return NextResponse.json(places, {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
          "X-Places-Source": "static-fallback",
        },
      });
    }

    const { listPlaces } = await import("@/lib/places");
    const places = await listPlaces();

    return NextResponse.json(places, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        "X-Places-Source": "sqlite",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load places";

    return NextResponse.json(
      { error: message },
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
