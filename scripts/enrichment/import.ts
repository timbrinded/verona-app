import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { InStatement } from "@libsql/client";
import { libsql } from "../../src/db/client";
import { parseCsv, type CsvRow } from "./csv";
import { resolveBookingUpdate } from "./booking";
import {
  lateNightConfidenceFromComponents,
  lateNightMethodologyScore,
  lateNightVibeFromComponents,
  methodologyScore,
  type LateNightScoreComponents,
} from "./scoring";

interface Citation {
  fieldName: string;
  sourceUrl: string;
  sourceTitle: string;
  excerpt: string;
  confidence: number;
}

interface ImportTargets {
  ids: string[];
  existingIds: string[];
  newIds: string[];
}

interface ExistingPlace {
  id: string;
  booking: string;
  dataQuality: Record<string, unknown>;
}

const LATE_NIGHT_VALUE_FIELDS = [
  ["lateHoursEvidence", ["late_hours_evidence"]],
  ["latestConfirmedClose", ["latest_confirmed_close"]],
  ["musicStyle", ["music_style"]],
  ["crowdAgeRange", ["crowd_age_range"]],
  ["crowdType", ["crowd_type"]],
  ["queueLikelihood", ["queue_likelihood"]],
  ["queueDuration", ["queue_duration"]],
  ["doorPolicy", ["door_policy"]],
  ["busyLevel", ["busy_level"]],
  ["peakTime", ["peak_time"]],
  ["heatSweatLevel", ["heat_sweat_level"]],
  ["dancefloor", ["dancefloor"]],
  ["lastEntryRisk", ["last_entry_risk"]],
] as const;

interface ImportOptions {
  source: string;
  runId: string;
  allowNew: boolean;
  reportPath: string;
}

interface ImportReportRow {
  id: string;
  name: string;
  action: "inserted" | "updated";
  bookingAction: string;
  bookingReason: string;
  confidence: number;
  missing: string[];
}

interface ImportReport {
  source: string;
  runId: string;
  importedRows: number;
  insertedRows: number;
  updatedRows: number;
  bookingCleared: number;
  bookingReplaced: number;
  lowConfidenceRows: ImportReportRow[];
  rowsMissingRequiredQa: ImportReportRow[];
  rows: ImportReportRow[];
}

function get(row: CsvRow, names: string[]): string {
  for (const name of names) {
    const value = row[name];
    const trimmed = value?.trim();
    if (!trimmed) continue;
    if (["null", "n/a", "na", "none", "not available", "not specified"].includes(trimmed.toLowerCase())) continue;
    if (/_url_assessments$/i.test(trimmed)) continue;
    return trimmed;
  }
  return "";
}

function numberValue(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumberValue(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
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

function isLateNightRow(row: CsvRow): boolean {
  const category = get(row, ["category", "place_category"]).toLowerCase();
  return category === "late night" || Boolean(get(row, ["nightlife_score_components", "late_night_score_components"]));
}

function hasTrueComponent(components: object): boolean {
  return Object.values(components).some((value) => value === true);
}

function usefulLateNightValue(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/[.]+$/, "");
  if (!normalized) return false;
  return ![
    "unknown",
    "unavailable",
    "not available",
    "not specified",
    "music style unknown",
    "crowd age range unknown",
    "crowd type unknown",
    "queue likelihood unknown",
    "queue duration unknown",
    "door policy unknown",
    "busy level unknown",
    "peak time unknown",
    "heat/sweat level unknown",
    "dancefloor unknown",
    "last entry risk unknown",
    "best time to visit unknown",
  ].includes(normalized);
}

function textShowsPastMidnight(value: string): boolean {
  const normalized = value.toLowerCase();
  if (/\bafter\s+midnight\b|\bpast\s+midnight\b|\bpast\s+00:00\b/.test(normalized)) return true;

  for (const match of normalized.matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/g)) {
    const hour = Number(match[1]);
    const minute = Number(match[2] ?? "0");
    const suffix = match[3].replace(/\./g, "");
    if (suffix === "am") {
      if (hour === 12 && minute > 0) return true;
      if (hour >= 1 && hour <= 6) return true;
    }
  }

  for (const match of normalized.matchAll(/\b(\d{1,2})[:.](\d{2})\b/g)) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour === 0 && minute > 0) return true;
    if (hour >= 1 && hour <= 6) return true;
  }

  return false;
}

function derivedLateNightComponents(row: CsvRow): LateNightScoreComponents {
  const lateText = [
    get(row, ["latest_confirmed_close"]),
    get(row, ["late_hours_evidence"]),
    get(row, ["opening_hours"]),
  ].join(" ");
  const parsedCitations = citations(get(row, ["citations", "sources"]));
  const citationText = parsedCitations.map((citation) => `${citation.sourceUrl} ${citation.excerpt}`).join(" ").toLowerCase();
  const queue = get(row, ["queue_likelihood", "queue_duration"]).toLowerCase();
  const door = get(row, ["door_policy", "last_entry_risk"]).toLowerCase();
  const heat = get(row, ["heat_sweat_level", "busy_level"]).toLowerCase();

  return {
    openPastMidnight: textShowsPastMidnight(lateText),
    recentLateEvidence: usefulLateNightValue(get(row, ["late_hours_evidence"])),
    hoursListed: usefulLateNightValue(get(row, ["opening_hours"])),
    multiSource: parsedCitations.length >= 2,
    officialSource: Boolean(get(row, ["website", "official_website"])) || /official|instagram|facebook|google/.test(citationText),
    eventSocialProof: /instagram|facebook|event|promoter|dice|ra\.co|resident advisor|dj/.test(citationText),
    musicDefined: usefulLateNightValue(get(row, ["music_style"])),
    crowdFit: usefulLateNightValue(get(row, ["crowd_age_range"])) || usefulLateNightValue(get(row, ["crowd_type"])),
    queueManageable: usefulLateNightValue(queue) && !/\bhigh\b|30\+|long/.test(queue),
    transportAccess: false,
    comfortWarning: /\bhot\b|sweaty|packed|poor ventilation/.test(heat),
    strictDoorWarning: /\bstrict\b|selective|high|dress code|last entry/.test(door),
    deadNightRisk: /\bdead\b|empty|quiet|inconsistent/.test(heat),
  };
}

function shouldUseParsedLateNightComponents(
  parsed: LateNightScoreComponents,
  derived: LateNightScoreComponents,
): boolean {
  if (parsed.openPastMidnight) return true;
  return !derived.openPastMidnight && hasTrueComponent(parsed);
}

export function lateNightData(row: CsvRow): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lateOpenConfidence = numberValue(get(row, ["late_open_confidence", "late_confidence"]));
  const lateDays = stringArray(get(row, ["late_days", "late_nights"]));
  const scoreText = get(row, ["nightlife_score_components", "late_night_score_components"]);

  if (lateOpenConfidence > 0) {
    data.lateOpenConfidence = lateOpenConfidence > 1 ? lateOpenConfidence / 100 : lateOpenConfidence;
  }
  if (lateDays.length > 0) data.lateDays = lateDays;

  for (const [target, names] of LATE_NIGHT_VALUE_FIELDS) {
    const value = get(row, [...names]);
    if (value) data[target] = value;
  }

  if (scoreText || isLateNightRow(row)) {
    const parsed = lateNightMethodologyScore(scoreText).components;
    const derived = derivedLateNightComponents(row);
    data.scoreComponents = shouldUseParsedLateNightComponents(parsed, derived) ? parsed : derived;
  }

  return data;
}

function recordValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function citations(value: string): Citation[] {
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

function normalizeCategory(category: string): string {
  return category === "Craft Beer" ? "Pub" : category;
}

function isDisallowedLateNightSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("tripadvisor.") || host.includes("thefork.");
  } catch {
    return /tripadvisor|thefork/i.test(url);
  }
}

function addLinkStatement(
  statements: InStatement[],
  placeId: string,
  type: string,
  label: string,
  url: string,
  replace = false,
): void {
  if (replace) {
    statements.push({
      sql: "DELETE FROM place_links WHERE place_id = ? AND type = ?",
      args: [placeId, type],
    });
  }
  if (!url) return;

  statements.push({
    sql: `
      INSERT OR IGNORE INTO place_links (place_id, type, label, url, source, confidence, retrieved_at)
      VALUES (?, ?, ?, ?, 'parallel', 0.8, CURRENT_TIMESTAMP)
    `,
    args: [placeId, type, label, url],
  });
}

function validatePlaceId(row: CsvRow, rowNumber: number): string {
  const placeId = get(row, ["id", "place_id"]);
  if (!placeId) {
    throw new Error(`Invalid enrichment row ${rowNumber}: missing id`);
  }
  return placeId;
}

export function validateEnrichmentRows(rows: CsvRow[]): string[] {
  if (rows.length === 0) {
    throw new Error("Invalid enrichment CSV: expected at least one row");
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const placeId = validatePlaceId(row, index + 2);
    if (seen.has(placeId)) {
      throw new Error(`Invalid enrichment CSV: duplicate id ${placeId}`);
    }
    seen.add(placeId);
    ids.push(placeId);
  });

  return ids;
}

export function validateImportTargets(rows: CsvRow[], knownIds: Set<string>, allowNew: boolean): ImportTargets {
  const ids = validateEnrichmentRows(rows);
  const newIds = ids.filter((id) => !knownIds.has(id));
  if (newIds.length > 0 && !allowNew) {
    throw new Error(`Invalid enrichment CSV: unknown place ids ${newIds.join(", ")}`);
  }

  return {
    ids,
    existingIds: ids.filter((id) => knownIds.has(id)),
    newIds,
  };
}

async function existingPlaces(ids: string[]): Promise<Map<string, ExistingPlace>> {
  if (ids.length === 0) return new Map();

  const placeholders = ids.map(() => "?").join(", ");
  const result = await libsql.execute({
    sql: `SELECT id, booking, data_quality FROM places WHERE id IN (${placeholders})`,
    args: ids,
  });

  return new Map(
    result.rows.map((row) => [
      String(row.id),
      {
        id: String(row.id),
        booking: String(row.booking ?? ""),
        dataQuality: recordValue(row.data_quality),
      },
    ]),
  );
}

function rowConfidence(row: CsvRow): { confidence: number; vibe: number; components: Record<string, unknown> } {
  const scoreText = isLateNightRow(row)
    ? get(row, ["nightlife_score_components", "late_night_score_components", "score_components"])
    : get(row, ["score_components", "methodology_score_components", "confidence_components"]);
  const methodology = isLateNightRow(row) ? lateNightMethodologyScore(scoreText) : methodologyScore(scoreText);
  const derivedLateNight = isLateNightRow(row) ? derivedLateNightComponents(row) : null;
  const useParsedLateNight =
    isLateNightRow(row) && derivedLateNight
      ? shouldUseParsedLateNightComponents(methodology.components as LateNightScoreComponents, derivedLateNight)
      : false;
  const derivedLateNightConfidence = derivedLateNight ? lateNightConfidenceFromComponents(derivedLateNight) : 0;
  const derivedLateNightVibe = derivedLateNight ? lateNightVibeFromComponents(derivedLateNight) : 0;
  const components =
    isLateNightRow(row) && !useParsedLateNight
      ? derivedLateNight ?? methodology.components
      : methodology.components;
  const methodologyConfidence = isLateNightRow(row) && !useParsedLateNight ? 0 : methodology.confidence;
  const methodologyVibe = isLateNightRow(row) && !useParsedLateNight ? 0 : methodology.vibe;
  const explicitConfidence = numberValue(get(row, ["confidence", "confidence_score"]));
  const explicitLateConfidence = isLateNightRow(row) ? numberValue(get(row, ["late_open_confidence", "late_confidence"])) : 0;
  const explicitVibe = numberValue(get(row, ["vibe_score", "vibe"]));

  return {
    confidence:
      explicitConfidence > 1
        ? explicitConfidence / 100
        : explicitConfidence ||
          (explicitLateConfidence > 1 ? explicitLateConfidence / 100 : explicitLateConfidence) ||
          methodologyConfidence ||
          derivedLateNightConfidence,
    vibe: Math.trunc(
      explicitVibe > 0 && explicitVibe <= 1 ? explicitVibe * 20 : explicitVibe || methodologyVibe || derivedLateNightVibe,
    ),
    components: scoreText || derivedLateNight ? { ...components } : {},
  };
}

function importDataQuality(
  row: CsvRow,
  existing: ExistingPlace | undefined,
  bookingReason: string,
): Record<string, unknown> {
  const score = rowConfidence(row);
  const lateNight = lateNightData(row);

  return {
    ...(existing?.dataQuality ?? {}),
    source: "parallel",
    lastImportKind: existing ? "refresh" : "new_candidate",
    bookingValidation: bookingReason,
    scoreComponents: score.components,
    ...(Object.keys(lateNight).length > 0 ? { lateNight } : {}),
  };
}

function requireNewPlaceValue(row: CsvRow, names: string[], label: string): string {
  const value = get(row, names);
  if (!value) {
    throw new Error(`Invalid new enrichment row ${get(row, ["id", "place_id"])}: missing ${label}`);
  }
  return value;
}

function addNewPlaceStatement(
  statements: InStatement[],
  row: CsvRow,
  bookingUrl: string,
  dataQuality: Record<string, unknown>,
): void {
  const placeId = get(row, ["id", "place_id"]);
  const name = requireNewPlaceValue(row, ["official_name", "name"], "name");
  const publicCategory = requireNewPlaceValue(row, ["category", "place_category"], "category");
  const sourceCategory = get(row, ["source_category", "venue_type", "venue_subtype", "place_type"]) || publicCategory;
  const category = normalizeCategory(publicCategory);
  const score = rowConfidence(row);
  const lat = nullableNumberValue(get(row, ["lat", "latitude"]));
  const lng = nullableNumberValue(get(row, ["lng", "longitude", "lon"]));

  statements.push({
    sql: `
      INSERT INTO places (
        id, slug, name, category, source_category, rating, reviews, price, distance, vibe,
        confidence, address, phone, website, google_maps, booking, notes, description,
        lat, lng, is_home_base, status, data_quality, updated_at, last_enriched_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    args: [
      placeId,
      slugBase(name, placeId),
      name,
      category,
      sourceCategory,
      numberValue(get(row, ["rating"])),
      Math.trunc(numberValue(get(row, ["review_count", "reviews"]))),
      get(row, ["price_level", "price"]),
      numberValue(get(row, ["distance", "distance_km"])),
      score.vibe,
      score.confidence,
      get(row, ["formatted_address", "address"]),
      get(row, ["phone", "phone_number"]),
      get(row, ["website", "official_website"]),
      get(row, ["google_maps_url", "google_maps", "maps_url"]),
      bookingUrl,
      get(row, ["notes", "travel_note", "why_visit"]),
      get(row, ["description", "summary"]),
      lat,
      lng,
      JSON.stringify(dataQuality),
    ],
  });
}

function addRefreshPlaceStatement(
  statements: InStatement[],
  row: CsvRow,
  bookingUpdate: ReturnType<typeof resolveBookingUpdate>,
  dataQuality: Record<string, unknown>,
): void {
  const placeId = get(row, ["id", "place_id"]);
  const phone = get(row, ["phone", "phone_number"]);
  const website = get(row, ["website", "official_website"]);
  const googleMaps = get(row, ["google_maps_url", "google_maps", "maps_url"]);
  const rating = numberValue(get(row, ["rating"]));
  const reviewCount = Math.trunc(numberValue(get(row, ["review_count", "reviews"])));
  const price = get(row, ["price_level", "price"]);
  const address = get(row, ["formatted_address", "address"]);
  const description = get(row, ["description", "summary"]);
  const score = rowConfidence(row);
  const lat = nullableNumberValue(get(row, ["lat", "latitude"]));
  const lng = nullableNumberValue(get(row, ["lng", "longitude", "lon"]));

  statements.push({
    sql: `
      UPDATE places SET
        phone = CASE WHEN ? != '' THEN ? ELSE phone END,
        website = CASE WHEN ? != '' THEN ? ELSE website END,
        google_maps = CASE WHEN ? != '' THEN ? ELSE google_maps END,
        booking = CASE WHEN ? = 1 THEN ? ELSE booking END,
        rating = CASE WHEN ? > 0 THEN ? ELSE rating END,
        reviews = CASE WHEN ? > 0 THEN ? ELSE reviews END,
        price = CASE WHEN ? != '' THEN ? ELSE price END,
        address = CASE WHEN ? != '' THEN ? ELSE address END,
        description = CASE WHEN ? != '' THEN ? ELSE description END,
        lat = CASE WHEN lat IS NULL AND ? IS NOT NULL THEN ? ELSE lat END,
        lng = CASE WHEN lng IS NULL AND ? IS NOT NULL THEN ? ELSE lng END,
        vibe = CASE WHEN ? > 0 THEN ? ELSE vibe END,
        confidence = CASE WHEN ? > 0 THEN ? ELSE confidence END,
        data_quality = ?,
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
      bookingUpdate.shouldUpdate ? 1 : 0,
      bookingUpdate.url,
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
      lat,
      lat,
      lng,
      lng,
      score.vibe,
      score.vibe,
      score.confidence,
      score.confidence,
      JSON.stringify(dataQuality),
      placeId,
    ],
  });
}

function addDetailStatements(statements: InStatement[], row: CsvRow, bookingNotes: string): void {
  const placeId = get(row, ["id", "place_id"]);

  statements.push({
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
      bookingNotes,
      JSON.stringify(socialLinks(row)),
    ],
  });
}

function addImportRowStatements(
  statements: InStatement[],
  row: CsvRow,
  runId: string,
  existing: ExistingPlace | undefined,
): ImportReportRow {
  const placeId = get(row, ["id", "place_id"]);
  const bookingUpdate = resolveBookingUpdate(
    get(row, ["booking_url", "booking"]),
    existing?.booking ?? "",
    get(row, ["booking_notes"]),
  );
  const dataQuality = importDataQuality(row, existing, bookingUpdate.reason);
  const score = rowConfidence(row);
  const website = get(row, ["website", "official_website"]);
  const googleMaps = get(row, ["google_maps_url", "google_maps", "maps_url"]);
  const menuUrl = get(row, ["menu_url", "menu"]);

  if (existing) {
    addRefreshPlaceStatement(statements, row, bookingUpdate, dataQuality);
  } else {
    addNewPlaceStatement(statements, row, bookingUpdate.url, dataQuality);
  }

  addDetailStatements(statements, row, bookingUpdate.note);
  addLinkStatement(statements, placeId, "website", "Website", website, Boolean(website));
  addLinkStatement(statements, placeId, "google_maps", "Google Maps", googleMaps, Boolean(googleMaps));
  addLinkStatement(statements, placeId, "booking", "Book", bookingUpdate.url, bookingUpdate.shouldUpdate);
  addLinkStatement(statements, placeId, "menu", "Menu", menuUrl, Boolean(menuUrl));

  for (const [network, url] of Object.entries(socialLinks(row))) {
    addLinkStatement(statements, placeId, `social_${network}`, network[0].toUpperCase() + network.slice(1), url, true);
  }

  const parsedCitations = citations(get(row, ["citations", "sources"])).filter(
    (citation) => !isLateNightRow(row) || !isDisallowedLateNightSource(citation.sourceUrl),
  );
  for (const citation of parsedCitations) {
    statements.push({
      sql: "DELETE FROM place_sources WHERE place_id = ? AND field_name = ? AND source_url = ?",
      args: [placeId, citation.fieldName, citation.sourceUrl],
    });
    statements.push({
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

  statements.push({
    sql: `
      INSERT INTO enrichment_items (run_id, place_id, status, output_payload, imported_at)
      VALUES (?, ?, 'imported', ?, CURRENT_TIMESTAMP)
    `,
    args: [runId, placeId, JSON.stringify(row)],
  });

  const missing: string[] = [];
  if (!get(row, ["lat", "latitude"]) && !existing) missing.push("coordinates");
  if (parsedCitations.length === 0) missing.push("citations");

  return {
    id: placeId,
    name: get(row, ["official_name", "name"]),
    action: existing ? "updated" : "inserted",
    bookingAction: bookingUpdate.shouldUpdate ? (bookingUpdate.url ? "set" : "cleared") : "kept",
    bookingReason: bookingUpdate.reason,
    confidence: score.confidence,
    missing,
  };
}

function parseArgs(argv: string[]): ImportOptions {
  const positional: string[] = [];
  let allowNew = false;
  let reportPath = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--allow-new") {
      allowNew = true;
    } else if (arg === "--qa-report") {
      reportPath = argv[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--qa-report=")) {
      reportPath = arg.slice("--qa-report=".length);
    } else {
      positional.push(arg);
    }
  }

  const source = positional[0];
  if (!source) {
    throw new Error(
      "Usage: npm run enrich:import -- data/enrichment/parallel-input-....output.csv [run-id] [--allow-new] [--qa-report path]",
    );
  }

  const runId = positional[1] || basename(source).replace(/\.csv$/i, "");
  return {
    source,
    runId,
    allowNew,
    reportPath: reportPath || join(process.cwd(), "data", "enrichment", `import-report-${runId}.json`),
  };
}

async function writeReport(path: string, report: ImportReport): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}

async function importEnrichment(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const rows = parseCsv(await readFile(options.source, "utf8"));
  const ids = validateEnrichmentRows(rows);
  const existing = await existingPlaces(ids);
  validateImportTargets(rows, new Set(existing.keys()), options.allowNew);

  const statements: InStatement[] = [
    {
      sql: `
        INSERT OR REPLACE INTO enrichment_runs (
          id, provider, status, input_path, output_path, requested_fields, started_at, completed_at, error
        )
        VALUES (?, 'parallel', 'importing', '', ?, '[]', CURRENT_TIMESTAMP, NULL, '')
      `,
      args: [options.runId, options.source],
    },
  ];

  const reportRows: ImportReportRow[] = [];
  for (const row of rows) {
    const placeId = get(row, ["id", "place_id"]);
    reportRows.push(addImportRowStatements(statements, row, options.runId, existing.get(placeId)));
  }

  statements.push({
    sql: "UPDATE enrichment_runs SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [options.runId],
  });

  await libsql.batch(statements, "write");

  const report: ImportReport = {
    source: options.source,
    runId: options.runId,
    importedRows: reportRows.length,
    insertedRows: reportRows.filter((row) => row.action === "inserted").length,
    updatedRows: reportRows.filter((row) => row.action === "updated").length,
    bookingCleared: reportRows.filter((row) => row.bookingAction === "cleared").length,
    bookingReplaced: reportRows.filter((row) => row.bookingAction === "set").length,
    lowConfidenceRows: reportRows.filter((row) => row.confidence > 0 && row.confidence < 0.6),
    rowsMissingRequiredQa: reportRows.filter((row) => row.missing.length > 0),
    rows: reportRows,
  };
  await writeReport(options.reportPath, report);

  console.log(`Imported ${rows.length} enriched rows from ${options.source}`);
  console.log(`QA report: ${options.reportPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importEnrichment().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
