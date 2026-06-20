import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { libsql } from "../../src/db/client";

interface SeedPlace {
  id: string;
  name: string;
  category: string;
  rating?: number;
  reviews?: number;
  price?: string;
  distance?: number;
  vibe?: number;
  confidence?: number;
  address?: string;
  phone?: string;
  website?: string;
  googleMaps?: string;
  booking?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  isHomeBase?: boolean;
}

interface SeedLink {
  placeId: string;
  type: string;
  label: string;
  url: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeCategory(category: string): string {
  return category === "Craft Beer" ? "Pub" : category;
}

function slugBase(name: string, id: string): string {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || id.replace(/-/g, "").slice(-8);
}

function buildSlugs(places: SeedPlace[]): Map<string, string> {
  const bases = new Map<string, SeedPlace[]>();
  for (const place of places) {
    const base = slugBase(place.name, place.id);
    bases.set(base, [...(bases.get(base) ?? []), place]);
  }

  const slugs = new Map<string, string>();
  for (const [base, rows] of bases) {
    if (rows.length === 1) {
      slugs.set(rows[0].id, base);
    } else {
      for (const row of rows) {
        slugs.set(row.id, `${base}-${row.id.replace(/-/g, "").slice(-8)}`);
      }
    }
  }

  return slugs;
}

function dataQuality(place: SeedPlace): Record<string, boolean | string> {
  return {
    source: "seed",
    missingCoordinates: !(place.lat && place.lng),
    missingGoogleMaps: !text(place.googleMaps),
    missingWebsite: !text(place.website),
    missingBooking: !text(place.booking),
    missingPhone: !text(place.phone),
  };
}

function seedLinks(place: SeedPlace): SeedLink[] {
  const links: SeedLink[] = [];
  const website = text(place.website);
  const googleMaps = text(place.googleMaps);
  const booking = text(place.booking);

  if (website) {
    links.push({
      placeId: place.id,
      type: place.isHomeBase && website.includes("airbnb.") ? "airbnb" : "website",
      label: place.isHomeBase ? "Airbnb" : "Website",
      url: website,
    });
  }
  if (googleMaps) {
    links.push({ placeId: place.id, type: "google_maps", label: "Google Maps", url: googleMaps });
  }
  if (booking) {
    links.push({ placeId: place.id, type: "booking", label: "Book", url: booking });
  }

  return links;
}

async function seed(): Promise<void> {
  await libsql.execute("PRAGMA foreign_keys = ON");

  const seedPath = join(process.cwd(), "data", "places.seed.json");
  const places = JSON.parse(await readFile(seedPath, "utf8")) as SeedPlace[];
  const slugs = buildSlugs(places);
  const activeIds = new Set<string>();
  let seededLinks = 0;

  for (const place of places) {
    activeIds.add(place.id);
    const sourceCategory = text(place.category);
    const category = normalizeCategory(sourceCategory);

    await libsql.execute({
      sql: `
        INSERT INTO places (
          id, slug, name, category, source_category, rating, reviews, price, distance, vibe,
          confidence, address, phone, website, google_maps, booking, notes, description,
          lat, lng, is_home_base, status, data_quality, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          name = excluded.name,
          category = excluded.category,
          source_category = excluded.source_category,
          rating = excluded.rating,
          reviews = excluded.reviews,
          price = excluded.price,
          distance = excluded.distance,
          vibe = excluded.vibe,
          confidence = excluded.confidence,
          address = excluded.address,
          phone = excluded.phone,
          website = excluded.website,
          google_maps = excluded.google_maps,
          booking = excluded.booking,
          notes = excluded.notes,
          lat = excluded.lat,
          lng = excluded.lng,
          is_home_base = excluded.is_home_base,
          status = 'active',
          data_quality = excluded.data_quality,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        place.id,
        slugs.get(place.id) ?? slugBase(place.name, place.id),
        text(place.name),
        category,
        sourceCategory,
        number(place.rating),
        Math.trunc(number(place.reviews)),
        text(place.price),
        number(place.distance),
        Math.trunc(number(place.vibe)),
        number(place.confidence),
        text(place.address),
        text(place.phone),
        text(place.website),
        text(place.googleMaps),
        text(place.booking),
        text(place.notes),
        "",
        typeof place.lat === "number" ? place.lat : null,
        typeof place.lng === "number" ? place.lng : null,
        place.isHomeBase ? 1 : 0,
        JSON.stringify(dataQuality(place)),
      ],
    });

    await libsql.execute({
      sql: `
        INSERT OR IGNORE INTO place_details (place_id)
        VALUES (?)
      `,
      args: [place.id],
    });

    await libsql.execute({
      sql: "DELETE FROM place_links WHERE place_id = ? AND source = 'seed'",
      args: [place.id],
    });

    for (const link of seedLinks(place)) {
      seededLinks += 1;
      await libsql.execute({
        sql: `
          INSERT OR IGNORE INTO place_links (place_id, type, label, url, source, confidence)
          VALUES (?, ?, ?, ?, 'seed', 1)
        `,
        args: [link.placeId, link.type, link.label, link.url],
      });
    }
  }

  if (activeIds.size > 0) {
    const placeholders = Array.from(activeIds, () => "?").join(", ");
    await libsql.execute({
      sql: `UPDATE places SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id NOT IN (${placeholders})`,
      args: Array.from(activeIds),
    });
  }

  console.log(`Seeded ${places.length} active places and ${seededLinks} seed links`);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
