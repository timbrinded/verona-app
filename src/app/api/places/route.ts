import { NextResponse } from "next/server";
import { listPlaces } from "@/lib/places";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
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
