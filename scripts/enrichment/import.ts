import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { libsql } from "../../src/db/client";
import { parseCsv, type CsvRow } from "./csv";

interface Citation {
  fieldName: string;
  sourceUrl: string;
  sourceTitle: string;
  excerpt: string;
  confidence: number;
}

function get(row: CsvRow, names: string[]): string {
  for (const name of names) {
    const value = row[name];
    if (value?.trim()) return value.trim();
  }
  return "";
}

function numberValue(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringArray(value: string): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    // Fall through to delimiter parsing.
  }

  return value
    .split(/[;\n|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function socialLinks(row: CsvRow): Record<string, string> {
  return Object.fromEntries(
    [
      ["instagram", get(row, ["social_instagram", "instagram"])],
      ["facebook", get(row, ["social_facebook", "facebook"])],
      ["tiktok", get(row, ["social_tiktok", "tiktok"])],
    ].filter((entry): entry is [string, string] => entry[1].length > 0),
  );
}

function citations(value: string): Citation[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return null;
          const record = item as Record<string, unknown>;
          const sourceUrl = String(record.sourceUrl ?? record.url ?? "").trim();
          if (!sourceUrl) return null;

          return {
            fieldName: String(record.fieldName ?? record.field ?? "general").trim() || "general",
            sourceUrl,
            sourceTitle: String(record.sourceTitle ?? record.title ?? "").trim(),
            excerpt: String(record.excerpt ?? record.note ?? "").trim(),
            confidence: numberValue(String(record.confidence ?? "0")),
          };
        })
        .filter((item): item is Citation => item !== null);
    }
  } catch {
    // Fall through to URL extraction.
  }

  const urls = value.match(/https?:\/\/[^\s,;]+/g) ?? [];
  return urls.map((url) => ({
    fieldName: "general",
    sourceUrl: url,
    sourceTitle: "",
    excerpt: value.slice(0, 240),
    confidence: 0,
  }));
}

async function upsertLink(placeId: string, type: string, label: string, url: string): Promise<void> {
  if (!url) return;

  await libsql.execute({
    sql: `
      INSERT OR IGNORE INTO place_links (place_id, type, label, url, source, confidence, retrieved_at)
      VALUES (?, ?, ?, ?, 'parallel', 0.8, CURRENT_TIMESTAMP)
    `,
    args: [placeId, type, label, url],
  });
}

async function importRow(row: CsvRow, runId: string): Promise<boolean> {
  const placeId = get(row, ["id", "place_id"]);
  if (!placeId) return false;

  const existing = await libsql.execute({
    sql: "SELECT id FROM places WHERE id = ?",
    args: [placeId],
  });
  if (existing.rows.length === 0) return false;

  const phone = get(row, ["phone", "phone_number"]);
  const website = get(row, ["website", "official_website"]);
  const googleMaps = get(row, ["google_maps_url", "google_maps", "maps_url"]);
  const booking = get(row, ["booking_url", "booking"]);
  const menuUrl = get(row, ["menu_url", "menu"]);
  const rating = numberValue(get(row, ["rating"]));
  const reviewCount = Math.trunc(numberValue(get(row, ["review_count", "reviews"])));
  const price = get(row, ["price_level", "price"]);
  const address = get(row, ["formatted_address", "address"]);
  const description = get(row, ["description", "summary"]);
  const confidence = numberValue(get(row, ["confidence"]));

  await libsql.execute({
    sql: `
      UPDATE places SET
        phone = CASE WHEN phone = '' AND ? != '' THEN ? ELSE phone END,
        website = CASE WHEN website = '' AND ? != '' THEN ? ELSE website END,
        google_maps = CASE WHEN google_maps = '' AND ? != '' THEN ? ELSE google_maps END,
        booking = CASE WHEN booking = '' AND ? != '' THEN ? ELSE booking END,
        rating = CASE WHEN ? > 0 THEN ? ELSE rating END,
        reviews = CASE WHEN ? > 0 THEN ? ELSE reviews END,
        price = CASE WHEN price = '' AND ? != '' THEN ? ELSE price END,
        address = CASE WHEN address = '' AND ? != '' THEN ? ELSE address END,
        description = CASE WHEN ? != '' THEN ? ELSE description END,
        confidence = CASE WHEN ? > confidence THEN ? ELSE confidence END,
        last_enriched_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [
      phone,
      phone,
      website,
      website,
      googleMaps,
      googleMaps,
      booking,
      booking,
      rating,
      rating,
      reviewCount,
      reviewCount,
      price,
      price,
      address,
      address,
      description,
      description,
      confidence,
      confidence,
      placeId,
    ],
  });

  await libsql.execute({
    sql: `
      INSERT INTO place_details (
        place_id, opening_hours, best_time_to_visit, reservation_guidance, dietary_tags,
        accessibility_notes, payment_notes, photo_urls, menu_highlights, visit_tips,
        booking_notes, social_links, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(place_id) DO UPDATE SET
        opening_hours = CASE WHEN excluded.opening_hours != '[]' THEN excluded.opening_hours ELSE place_details.opening_hours END,
        best_time_to_visit = CASE WHEN excluded.best_time_to_visit != '' THEN excluded.best_time_to_visit ELSE place_details.best_time_to_visit END,
        reservation_guidance = CASE WHEN excluded.reservation_guidance != '' THEN excluded.reservation_guidance ELSE place_details.reservation_guidance END,
        dietary_tags = CASE WHEN excluded.dietary_tags != '[]' THEN excluded.dietary_tags ELSE place_details.dietary_tags END,
        accessibility_notes = CASE WHEN excluded.accessibility_notes != '' THEN excluded.accessibility_notes ELSE place_details.accessibility_notes END,
        payment_notes = CASE WHEN excluded.payment_notes != '' THEN excluded.payment_notes ELSE place_details.payment_notes END,
        photo_urls = CASE WHEN excluded.photo_urls != '[]' THEN excluded.photo_urls ELSE place_details.photo_urls END,
        menu_highlights = CASE WHEN excluded.menu_highlights != '' THEN excluded.menu_highlights ELSE place_details.menu_highlights END,
        visit_tips = CASE WHEN excluded.visit_tips != '' THEN excluded.visit_tips ELSE place_details.visit_tips END,
        booking_notes = CASE WHEN excluded.booking_notes != '' THEN excluded.booking_notes ELSE place_details.booking_notes END,
        social_links = CASE WHEN excluded.social_links != '{}' THEN excluded.social_links ELSE place_details.social_links END,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [
      placeId,
      JSON.stringify(stringArray(get(row, ["opening_hours"]))),
      get(row, ["best_time_to_visit"]),
      get(row, ["reservation_guidance"]),
      JSON.stringify(stringArray(get(row, ["dietary_tags"]))),
      get(row, ["accessibility_notes"]),
      get(row, ["payment_notes"]),
      JSON.stringify(stringArray(get(row, ["photo_urls"]))),
      get(row, ["menu_highlights"]),
      get(row, ["visit_tips"]),
      get(row, ["booking_notes"]),
      JSON.stringify(socialLinks(row)),
    ],
  });

  await upsertLink(placeId, "website", "Website", website);
  await upsertLink(placeId, "google_maps", "Google Maps", googleMaps);
  await upsertLink(placeId, "booking", "Book", booking);
  await upsertLink(placeId, "menu", "Menu", menuUrl);

  for (const [network, url] of Object.entries(socialLinks(row))) {
    await upsertLink(placeId, `social_${network}`, network[0].toUpperCase() + network.slice(1), url);
  }

  await libsql.execute({
    sql: "DELETE FROM place_sources WHERE place_id = ?",
    args: [placeId],
  });

  for (const citation of citations(get(row, ["citations", "sources"]))) {
    await libsql.execute({
      sql: `
        INSERT INTO place_sources (place_id, field_name, source_url, source_title, excerpt, confidence, retrieved_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      args: [
        placeId,
        citation.fieldName,
        citation.sourceUrl,
        citation.sourceTitle,
        citation.excerpt,
        citation.confidence,
      ],
    });
  }

  await libsql.execute({
    sql: `
      INSERT INTO enrichment_items (run_id, place_id, status, output_payload, imported_at)
      VALUES (?, ?, 'imported', ?, CURRENT_TIMESTAMP)
    `,
    args: [runId, placeId, JSON.stringify(row)],
  });

  return true;
}

async function importEnrichment(): Promise<void> {
  const source = process.argv[2];
  if (!source) {
    throw new Error("Usage: npm run enrich:import -- data/enrichment/parallel-input-....output.csv [run-id]");
  }

  const runId = process.argv[3] || basename(source).replace(/\.csv$/i, "");
  const rows = parseCsv(await readFile(source, "utf8"));

  await libsql.execute({
    sql: `
      INSERT OR REPLACE INTO enrichment_runs (
        id, provider, status, input_path, output_path, requested_fields, started_at, completed_at, error
      )
      VALUES (?, 'parallel', 'importing', '', ?, '[]', CURRENT_TIMESTAMP, NULL, '')
    `,
    args: [runId, source],
  });

  let imported = 0;
  for (const row of rows) {
    if (await importRow(row, runId)) {
      imported += 1;
    }
  }

  await libsql.execute({
    sql: "UPDATE enrichment_runs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [runId],
  });

  console.log(`Imported ${imported} enriched rows from ${source}`);
}

importEnrichment().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
