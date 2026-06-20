import { NextResponse } from "next/server";
import type { Place } from "@/lib/place-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function placesResponse(places: Place[]) {
  return NextResponse.json(places, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      "X-Places-Source": "sqlite",
    },
  });
}

export async function GET() {
  try {
    const { listPlaces } = await import("@/lib/places");
    const places = await listPlaces();

    return placesResponse(places);
  } catch (error: unknown) {
    console.error("Failed to load places from SQLite", error);

    return NextResponse.json(
      { error: "Failed to load places from SQLite" },
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
