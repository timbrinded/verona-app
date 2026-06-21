import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { InStatement } from "@libsql/client";
import { libsql } from "../../src/db/client";
import type { Place } from "../../src/lib/place-types";
import { listPlaces } from "../../src/lib/places";
import {
  absoluteHttpUrl,
  assessMediaCandidate,
  cleanHttpUrl,
  htmlDecode,
  imageDimensionsFromBuffer,
  isEligibleMediaSource,
  isLikelyImageUrl,
  sourceTypeForUrl,
  type MediaAssessment,
  type MediaSourceType,
} from "../../src/lib/media-quality";
import { csvEscape } from "./csv";

interface MediaSource {
  url: string;
  sourceType: MediaSourceType;
  context: string;
}

interface ExtractedCandidate {
  url: string;
  sourceUrl: string;
  sourceType: MediaSourceType;
  context: string;
}

interface CandidateReport extends ExtractedCandidate, MediaAssessment {
  width: number;
  height: number;
  contentType: string;
}

interface PlaceMediaReport {
  id: string;
  name: string;
  category: string;
  sourceCount: number;
  candidateCount: number;
  approvedCount: number;
  rejectedCount: number;
  approved: CandidateReport[];
  rejected: CandidateReport[];
}

interface MediaReport {
  generatedAt: string;
  places: number;
  placesWithApprovedMedia: number;
  approvedImages: number;
  rejectedImages: number;
  reportPath: string;
  approvedCsvPath: string;
  rows: PlaceMediaReport[];
}

const USER_AGENT = "Mozilla/5.0 (compatible; VeronaGuide/1.0; +https://verona-app-eight.vercel.app)";
const MAX_HTML_BYTES = 1_200_000;
const MAX_IMAGE_BYTES = 1_100_000;
const MAX_SOURCE_URLS_PER_PLACE = 4;
const MAX_CANDIDATES_PER_SOURCE = 10;
const MAX_PROBED_CANDIDATES_PER_PLACE = 18;
const MAX_APPROVED_PER_PLACE = 4;

function optionValue(flag: string): string {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? "" : "";
}

function numberOption(flag: string, fallback: number): number {
  const value = Number(optionValue(flag));
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sourceSortScore(source: MediaSource, place: Place): number {
  let score = 0;
  if (source.url === place.website) score += 10;
  if (source.sourceType === "official_site") score += 8;
  if (source.sourceType === "wikimedia") score += 7;
  if (source.sourceType === "direct_image") score += 6;
  if (/(gallery|galleria|photo|foto|media|images|menu|rooms|ristorante|cucina)/i.test(source.url)) score += 4;
  if (source.context === "place website") score += 3;
  return score;
}

function addSource(sources: MediaSource[], seen: Set<string>, rawUrl: string, place: Place, context: string): void {
  const url = cleanHttpUrl(rawUrl);
  if (!url || seen.has(url) || !isEligibleMediaSource(url, place.website)) return;
  seen.add(url);
  sources.push({
    url,
    sourceType: sourceTypeForUrl(url, place.website),
    context,
  });
}

function placeSources(place: Place): MediaSource[] {
  const seen = new Set<string>();
  const sources: MediaSource[] = [];

  addSource(sources, seen, place.website, place, "place website");

  for (const photoUrl of place.details.photoUrls) {
    addSource(sources, seen, photoUrl, place, "enriched photo URL");
  }

  for (const link of place.links) {
    if (["website", "menu"].includes(link.type)) {
      addSource(sources, seen, link.url, place, `${link.type} link`);
    }
  }

  for (const source of place.sources) {
    addSource(sources, seen, source.sourceUrl, place, source.sourceTitle || source.fieldName || "citation");
  }

  return sources.sort((a, b) => sourceSortScore(b, place) - sourceSortScore(a, place)).slice(0, MAX_SOURCE_URLS_PER_PLACE);
}

async function readLimitedBody(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.from(await response.arrayBuffer());

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { value, done } = await reader.read();
    if (done || !value) break;
    const remaining = maxBytes - total;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    chunks.push(chunk);
    total += chunk.byteLength;
  }

  return Buffer.concat(chunks);
}

async function fetchHtml(sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8_000),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("text/html")) return "";
  return new TextDecoder().decode(await readLimitedBody(response, MAX_HTML_BYTES));
}

function attrValue(tag: string, name: string): string {
  const pattern = new RegExp(`${name}=["']([^"']+)["']`, "i");
  return htmlDecode(pattern.exec(tag)?.[1] ?? "");
}

function candidateSortScore(candidate: ExtractedCandidate): number {
  const haystack = `${candidate.url} ${candidate.context}`.toLowerCase();
  let score = 0;
  if (candidate.sourceType === "official_site") score += 8;
  if (candidate.sourceType === "wikimedia") score += 8;
  if (candidate.sourceType === "direct_image") score += 6;
  if (/(og:image|twitter:image)/.test(haystack)) score += 5;
  if (/(gallery|galleria|photo|foto|media|image|uploads|wp-content|hero)/.test(haystack)) score += 4;
  if (/(logo|favicon|icon|avatar|placeholder|badge)/.test(haystack)) score -= 20;
  return score;
}

function imageFamilyKey(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of ["width", "w", "im_w", "quality", "auto", "format", "fm", "fit"]) {
      url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/-\d+x\d+(?=\.(?:jpe?g|png|webp)$)/i, "");
    return url.toString().toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function addCandidate(candidates: Map<string, ExtractedCandidate>, rawUrl: string, source: MediaSource, context: string): void {
  const url = absoluteHttpUrl(rawUrl.replaceAll("\\/", "/"), source.url);
  if (!url || !isLikelyImageUrl(url)) return;
  if (candidates.has(url)) return;
  candidates.set(url, {
    url,
    sourceUrl: source.url,
    sourceType: source.sourceType === "direct_image" ? "direct_image" : source.sourceType,
    context: `${source.context}; ${context}`.slice(0, 500),
  });
}

function extractImagesFromHtml(html: string, source: MediaSource): ExtractedCandidate[] {
  const candidates = new Map<string, ExtractedCandidate>();

  for (const tag of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi)) {
    addCandidate(candidates, attrValue(tag[0], "content"), source, "og:image");
  }

  for (const tag of html.matchAll(/<meta[^>]+content=["'][^"']+["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi)) {
    addCandidate(candidates, attrValue(tag[0], "content"), source, "og:image");
  }

  for (const tag of html.matchAll(/<(?:img|source)[^>]+>/gi)) {
    const context = [attrValue(tag[0], "alt"), attrValue(tag[0], "title"), attrValue(tag[0], "class"), attrValue(tag[0], "id")]
      .filter(Boolean)
      .join(" ");
    for (const attr of ["src", "data-src", "data-lazy-src", "data-original", "data-bg"]) {
      addCandidate(candidates, attrValue(tag[0], attr), source, context || attr);
    }
    const srcset = attrValue(tag[0], "srcset");
    for (const item of srcset.split(",")) {
      addCandidate(candidates, item.trim().split(/\s+/)[0] ?? "", source, context || "srcset");
    }
  }

  for (const match of html.matchAll(/https?:\\?\/\\?\/[^"'<>\\\s]+?\.(?:jpe?g|png|webp)(?:\?[^"'<>\\\s]*)?/gi)) {
    addCandidate(candidates, match[0], source, "embedded image URL");
  }

  return [...candidates.values()].sort((a, b) => candidateSortScore(b) - candidateSortScore(a)).slice(0, MAX_CANDIDATES_PER_SOURCE);
}

async function extractCandidates(source: MediaSource): Promise<ExtractedCandidate[]> {
  if (isLikelyImageUrl(source.url)) {
    return [
      {
        url: source.url,
        sourceUrl: source.url,
        sourceType: "direct_image",
        context: source.context,
      },
    ];
  }

  try {
    const html = await fetchHtml(source.url);
    if (!html) return [];
    return extractImagesFromHtml(html, source);
  } catch {
    return [];
  }
}

async function probeCandidate(place: Place, candidate: ExtractedCandidate): Promise<CandidateReport> {
  let width = 0;
  let height = 0;
  let contentType = "";

  try {
    const response = await fetch(candidate.url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        range: `bytes=0-${MAX_IMAGE_BYTES - 1}`,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    });

    contentType = response.headers.get("content-type") ?? "";
    if (response.ok) {
      const dimensions = imageDimensionsFromBuffer(await readLimitedBody(response, MAX_IMAGE_BYTES));
      width = dimensions?.width ?? 0;
      height = dimensions?.height ?? 0;
    }
  } catch {
    const assessment = assessMediaCandidate({
      ...candidate,
      placeName: place.name,
      category: place.category,
      width,
      height,
      contentType,
    });
    return { ...candidate, ...assessment, width, height, contentType, rejectedReason: "image fetch failed" };
  }

  const assessment = assessMediaCandidate({
    ...candidate,
    placeName: place.name,
    category: place.category,
    width,
    height,
    contentType,
  });

  return {
    ...candidate,
    ...assessment,
    width,
    height,
    contentType,
  };
}

async function withConcurrency<T, U>(items: T[], concurrency: number, task: (item: T, index: number) => Promise<U>): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

async function processPlace(place: Place): Promise<PlaceMediaReport> {
  const sources = placeSources(place);
  const extracted = (await Promise.all(sources.map(extractCandidates))).flat();
  const uniqueCandidates = [...new Map(extracted.map((candidate) => [candidate.url, candidate])).values()]
    .sort((a, b) => candidateSortScore(b) - candidateSortScore(a))
    .slice(0, MAX_PROBED_CANDIDATES_PER_PLACE);
  const probed = await withConcurrency(uniqueCandidates, 4, (candidate) => probeCandidate(place, candidate));
  const approved: CandidateReport[] = [];
  const duplicateApproved: CandidateReport[] = [];
  const approvedFamilies = new Set<string>();
  const rawApproved = probed
    .filter((candidate) => candidate.approved)
    .sort((a, b) => b.qualityScore - a.qualityScore || b.width * b.height - a.width * a.height);

  for (const candidate of rawApproved) {
    const family = imageFamilyKey(candidate.url);
    if (approvedFamilies.has(family) || approved.length >= MAX_APPROVED_PER_PLACE) {
      duplicateApproved.push({
        ...candidate,
        approved: false,
        rejectedReason: "duplicate approved image variant",
      });
      continue;
    }
    approvedFamilies.add(family);
    approved.push(candidate);
  }

  const approvedUrls = new Set(approved.map((candidate) => candidate.url));
  const rejected = [
    ...probed.filter((candidate) => !approvedUrls.has(candidate.url) && !candidate.approved),
    ...duplicateApproved,
  ];

  return {
    id: place.id,
    name: place.name,
    category: place.category,
    sourceCount: sources.length,
    candidateCount: probed.length,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    approved,
    rejected,
  };
}

function insertStatements(row: PlaceMediaReport): InStatement[] {
  const statements: InStatement[] = [
    {
      sql: "DELETE FROM place_media WHERE place_id = ?",
      args: [row.id],
    },
  ];

  const candidates = [...row.approved, ...row.rejected.slice(0, 8)];
  for (const candidate of candidates) {
    statements.push({
      sql: `
        INSERT INTO place_media (
          place_id, url, source_url, source_type, kind, caption, attribution,
          width, height, quality_score, approved, rejected_reason, retrieved_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(place_id, url) DO UPDATE SET
          source_url = excluded.source_url,
          source_type = excluded.source_type,
          kind = excluded.kind,
          caption = excluded.caption,
          attribution = excluded.attribution,
          width = excluded.width,
          height = excluded.height,
          quality_score = excluded.quality_score,
          approved = excluded.approved,
          rejected_reason = excluded.rejected_reason,
          retrieved_at = CURRENT_TIMESTAMP
      `,
      args: [
        row.id,
        candidate.url,
        candidate.sourceUrl,
        candidate.sourceType,
        candidate.kind,
        candidate.caption,
        candidate.attribution,
        candidate.width,
        candidate.height,
        candidate.qualityScore,
        candidate.approved ? 1 : 0,
        candidate.rejectedReason,
      ],
    });
  }

  return statements;
}

async function writeApprovedCsv(rows: PlaceMediaReport[], approvedCsvPath: string): Promise<void> {
  const lines = [
    [
      "place_id",
      "name",
      "category",
      "url",
      "source_url",
      "source_type",
      "kind",
      "caption",
      "attribution",
      "width",
      "height",
      "quality_score",
    ].join(","),
  ];

  for (const row of rows) {
    for (const media of row.approved) {
      lines.push(
        [
          row.id,
          row.name,
          row.category,
          media.url,
          media.sourceUrl,
          media.sourceType,
          media.kind,
          media.caption,
          media.attribution,
          media.width,
          media.height,
          media.qualityScore,
        ]
          .map(csvEscape)
          .join(","),
      );
    }
  }

  await mkdir(dirname(approvedCsvPath), { recursive: true });
  await writeFile(approvedCsvPath, `${lines.join("\n")}\n`);
}

async function processMedia(): Promise<void> {
  await libsql.execute("PRAGMA foreign_keys = ON");

  const dryRun = process.argv.includes("--dry-run");
  const limit = numberOption("--limit", 0);
  const placeId = optionValue("--place-id");
  const concurrency = numberOption("--concurrency", 5);
  const stamp = nowStamp();
  const reportPath =
    optionValue("--report") || join(process.cwd(), "data", "enrichment", `media-report-${stamp}.json`);
  const approvedCsvPath =
    optionValue("--approved-csv") || join(process.cwd(), "data", "enrichment", `media-approved-${stamp}.csv`);

  let places = await listPlaces();
  if (placeId) places = places.filter((place) => place.id === placeId || place.slug === placeId);
  if (limit > 0) places = places.slice(0, limit);

  const rows = await withConcurrency(places, concurrency, async (place, index) => {
    const row = await processPlace(place);
    console.log(
      `[${index + 1}/${places.length}] ${row.name}: ${row.approvedCount} approved, ${row.rejectedCount} rejected from ${row.sourceCount} sources`,
    );
    return row;
  });

  if (!dryRun) {
    const statements = rows.flatMap(insertStatements);
    if (statements.length > 0) await libsql.batch(statements, "write");
  }

  const report: MediaReport = {
    generatedAt: new Date().toISOString(),
    places: rows.length,
    placesWithApprovedMedia: rows.filter((row) => row.approvedCount > 0).length,
    approvedImages: rows.reduce((sum, row) => sum + row.approvedCount, 0),
    rejectedImages: rows.reduce((sum, row) => sum + row.rejectedCount, 0),
    reportPath,
    approvedCsvPath,
    rows,
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeApprovedCsv(rows, approvedCsvPath);

  console.log(
    `Processed ${report.places} places; ${report.approvedImages} approved image(s) for ${report.placesWithApprovedMedia} place(s).`,
  );
  console.log(`Media report: ${reportPath}`);
  console.log(`Approved media CSV: ${approvedCsvPath}`);

  if (!dryRun && report.approvedImages === 0) {
    throw new Error("Media processing wrote no approved images; refusing a silent no-op");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  processMedia().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
