import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, parse } from "node:path";
import { pathToFileURL } from "node:url";
import { listPlaces } from "../../src/lib/places";
import type { Place } from "../../src/lib/place-types";
import { parseCsv, toCsv, type CsvRow } from "./csv";
import { citations } from "./import";
import { lateNightMethodologyScore } from "./scoring";

interface CandidateDecision {
  row: CsvRow;
  accepted: boolean;
  reason: string;
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

function normalizedText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function isDisallowedSource(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("tripadvisor.") || host.includes("thefork.");
  } catch {
    return /tripadvisor|thefork/i.test(url);
  }
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const radiusKm = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function confidence(row: CsvRow): number {
  const explicit = numberValue(get(row, ["confidence", "confidence_score", "late_open_confidence", "late_confidence"]));
  if (explicit > 1) return explicit / 100;
  if (explicit > 0) return explicit;

  return lateNightMethodologyScore(
    get(row, ["nightlife_score_components", "late_night_score_components", "score_components"]),
  ).confidence;
}

function hasDuplicate(row: CsvRow, places: Place[], acceptedRows: CsvRow[]): boolean {
  const name = normalizedText(get(row, ["official_name", "name"]));
  const address = normalizedText(get(row, ["formatted_address", "address"]));
  const lat = numberValue(get(row, ["lat", "latitude"]));
  const lng = numberValue(get(row, ["lng", "longitude", "lon"]));

  const knownRows = [
    ...places.map((place) => ({
      name: normalizedText(place.name),
      address: normalizedText(place.address),
      lat: place.lat ?? 0,
      lng: place.lng ?? 0,
    })),
    ...acceptedRows.map((accepted) => ({
      name: normalizedText(get(accepted, ["official_name", "name"])),
      address: normalizedText(get(accepted, ["formatted_address", "address"])),
      lat: numberValue(get(accepted, ["lat", "latitude"])),
      lng: numberValue(get(accepted, ["lng", "longitude", "lon"])),
    })),
  ];

  return knownRows.some((known) => {
    if (name && known.name === name) return true;
    if (address && known.address === address) return true;
    if (lat && lng && known.lat && known.lng && distanceKm(lat, lng, known.lat, known.lng) <= 0.05) {
      return name.split(" ").some((part) => part.length > 3 && known.name.includes(part));
    }
    return false;
  });
}

export function textShowsPastMidnight(value: string): boolean {
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

export function hasLateHoursEvidence(row: CsvRow): boolean {
  return textShowsPastMidnight(
    [
      get(row, ["latest_confirmed_close"]),
      get(row, ["late_hours_evidence"]),
      get(row, ["opening_hours"]),
      get(row, ["best_time_to_visit"]),
    ].join(" "),
  );
}

function parseArgs(argv: string[]): { source: string; targetCount: number; outputPath: string; reportPath: string } {
  const source = argv.find((arg) => !arg.startsWith("--")) ?? "";
  if (!source) {
    throw new Error("Usage: npm run enrich:merge-late-night -- candidates.output.csv [--target-count 12]");
  }

  const targetIndex = argv.indexOf("--target-count");
  const targetCount = targetIndex >= 0 ? numberValue(argv[targetIndex + 1] ?? "") : 12;
  const parsed = parse(source);
  const outputPath = join(parsed.dir || "data/enrichment", `${parsed.name}.accepted.csv`);
  const reportPath = join(parsed.dir || "data/enrichment", `${parsed.name}.merge-report.json`);

  return { source, targetCount: targetCount || 12, outputPath, reportPath };
}

async function mergeLateNight(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const places = await listPlaces();
  const rows = parseCsv(await readFile(options.source, "utf8"));
  const acceptedRows: CsvRow[] = [];
  const decisions: CandidateDecision[] = [];

  for (const row of rows) {
    const name = get(row, ["official_name", "name"]);
    const lat = get(row, ["lat", "latitude"]);
    const lng = get(row, ["lng", "longitude", "lon"]);
    const parsedCitations = citations(get(row, ["citations", "sources"])).filter(
      (citation) => !isDisallowedSource(citation.sourceUrl),
    );
    const candidateConfidence = confidence(row);
    let reason = "";

    if (!name) reason = "missing_name";
    else if (!lat || !lng) reason = "missing_coordinates";
    else if (parsedCitations.length === 0) reason = "missing_citations";
    else if (!hasLateHoursEvidence(row)) reason = "missing_midnight_evidence";
    else if (candidateConfidence < 0.7) reason = "low_late_open_confidence";
    else if (hasDuplicate(row, places, acceptedRows)) reason = "duplicate";
    else if (acceptedRows.length >= options.targetCount) reason = "target_count_reached";

    if (reason) {
      decisions.push({ row, accepted: false, reason });
      continue;
    }

    const accepted = {
      ...row,
      id: get(row, ["id", "place_id"]) || randomUUID(),
      category: "Late Night",
      source_category:
        get(row, ["source_category", "venue_type", "venue_subtype", "place_type"]) || get(row, ["category", "place_category"]),
    };
    acceptedRows.push(accepted);
    decisions.push({ row: accepted, accepted: true, reason: "accepted" });
  }

  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, toCsv(acceptedRows));
  await writeFile(
    options.reportPath,
    `${JSON.stringify(
      {
        source: options.source,
        targetCount: options.targetCount,
        accepted: acceptedRows.length,
        rejected: decisions.filter((decision) => !decision.accepted).length,
        decisions: decisions.map((decision) => ({
          id: get(decision.row, ["id", "place_id"]),
          name: get(decision.row, ["official_name", "name"]),
          accepted: decision.accepted,
          reason: decision.reason,
        })),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Accepted ${acceptedRows.length} late-night candidates from ${basename(options.source)}`);
  console.log(`Candidate CSV: ${options.outputPath}`);
  console.log(`Merge report: ${options.reportPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mergeLateNight().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
