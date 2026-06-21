import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, parse } from "node:path";
import { pathToFileURL } from "node:url";
import { listPlaces } from "../../src/lib/places";
import type { Place } from "../../src/lib/place-types";
import { parseCsv, toCsv, type CsvRow } from "./csv";
import { citations } from "./import";
import { methodologyScore } from "./scoring";

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

function candidateConfidence(row: CsvRow): number {
  const explicit = numberValue(get(row, ["confidence", "confidence_score"]));
  if (explicit > 1) return explicit / 100;
  if (explicit > 0) return explicit;

  return methodologyScore(get(row, ["score_components", "methodology_score_components", "confidence_components"]))
    .confidence;
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

function parseArgs(argv: string[]): { source: string; targetCount: number; outputPath: string; reportPath: string } {
  const source = argv.find((arg) => !arg.startsWith("--")) ?? "";
  if (!source) {
    throw new Error("Usage: npm run enrich:merge-candidates -- candidates.output.csv [--target-count 120]");
  }

  const targetIndex = argv.indexOf("--target-count");
  const targetCount = targetIndex >= 0 ? numberValue(argv[targetIndex + 1] ?? "") : 120;
  const parsed = parse(source);
  const outputPath = join(parsed.dir || "data/enrichment", `${parsed.name}.accepted.csv`);
  const reportPath = join(parsed.dir || "data/enrichment", `${parsed.name}.merge-report.json`);

  return { source, targetCount: targetCount || 120, outputPath, reportPath };
}

async function mergeCandidates(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const places = await listPlaces();
  const rows = parseCsv(await readFile(options.source, "utf8"));
  const acceptedRows: CsvRow[] = [];
  const decisions: CandidateDecision[] = [];

  for (const row of rows) {
    const name = get(row, ["official_name", "name"]);
    const category = get(row, ["category", "place_category"]);
    const lat = get(row, ["lat", "latitude"]);
    const lng = get(row, ["lng", "longitude", "lon"]);
    const parsedCitations = citations(get(row, ["citations", "sources"]));
    const confidence = candidateConfidence(row);
    let reason = "";

    if (!name || !category) reason = "missing_name_or_category";
    else if (!lat || !lng) reason = "missing_coordinates";
    else if (parsedCitations.length === 0) reason = "missing_citations";
    else if (confidence > 0 && confidence < 0.6) reason = "low_confidence";
    else if (hasDuplicate(row, places, acceptedRows)) reason = "duplicate";
    else if (places.length + acceptedRows.length >= options.targetCount) reason = "target_count_reached";

    if (reason) {
      decisions.push({ row, accepted: false, reason });
      continue;
    }

    const accepted = { ...row, id: get(row, ["id", "place_id"]) || randomUUID() };
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
        currentPlaces: places.length,
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

  console.log(`Accepted ${acceptedRows.length} candidates from ${basename(options.source)}`);
  console.log(`Candidate CSV: ${options.outputPath}`);
  console.log(`Merge report: ${options.reportPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mergeCandidates().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
