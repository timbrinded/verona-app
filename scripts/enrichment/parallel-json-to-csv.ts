import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, parse } from "node:path";
import { pathToFileURL } from "node:url";
import { toCsv, type CsvRow } from "./csv";

const requestedFields = [
  "id",
  "official_name",
  "category",
  "formatted_address",
  "lat",
  "lng",
  "phone",
  "website",
  "google_maps_url",
  "booking_url",
  "menu_url",
  "social_instagram",
  "social_facebook",
  "rating",
  "review_count",
  "price_level",
  "opening_hours",
  "best_time_to_visit",
  "reservation_guidance",
  "dietary_tags",
  "accessibility_notes",
  "payment_notes",
  "photo_urls",
  "menu_highlights",
  "visit_tips",
  "booking_notes",
  "description",
  "confidence",
  "vibe_score",
  "score_components",
  "citations",
];

interface ParallelResult {
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

interface Citation {
  fieldName: string;
  sourceUrl: string;
  sourceTitle: string;
  excerpt: string;
  confidence: number;
}

interface ScoreComponents {
  operatingStatus: boolean;
  recentReviews: boolean;
  websiteResponds: boolean;
  multiSource: boolean;
  phoneListed: boolean;
  hoursListed: boolean;
  michelinListed: boolean;
  authenticSentiment: boolean;
  ratingConsistency: boolean;
  priceQuality: boolean;
  undiscoveredGem: boolean;
  localCrowd: boolean;
  touristTrapLanguage: boolean;
  menuPhotosOutside: boolean;
  decliningRatings: boolean;
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function get(record: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const value = record[name];
    const text = stringValue(value).trim();
    if (!text) continue;
    if (["null", "n/a", "na", "none", "not available", "not specified"].includes(text.toLowerCase())) continue;
    return text;
  }
  return "";
}

function numberValue(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sourceTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function citationFromText(value: string, confidence: number): Citation | null {
  const match = value.match(/(https?:\/\/[^\s,;]+)/);
  if (!match) return null;

  const sourceUrl = match[1].replace(/[.)\]]+$/, "");
  const excerpt = value.replace(sourceUrl, "").replace(/^[\s:,-]+/, "").trim();
  return {
    fieldName: "general",
    sourceUrl,
    sourceTitle: sourceTitle(sourceUrl),
    excerpt: excerpt.slice(0, 240),
    confidence,
  };
}

function citationFromRecord(value: Record<string, unknown>, confidence: number): Citation | null {
  const sourceUrl = stringValue(value.sourceUrl ?? value.url ?? "").trim();
  if (!sourceUrl) return null;

  return {
    fieldName: stringValue(value.fieldName ?? value.field ?? "general").trim() || "general",
    sourceUrl,
    sourceTitle: stringValue(value.sourceTitle ?? value.title ?? sourceTitle(sourceUrl)).trim(),
    excerpt: stringValue(value.excerpt ?? value.note ?? "").trim().slice(0, 240),
    confidence: numberValue(stringValue(value.confidence ?? "")) || confidence,
  };
}

function normalizeCitations(input: Record<string, unknown>, output: Record<string, unknown>): string {
  const confidence = numberValue(get(output, ["confidence"])) || 0.75;
  const citations: Citation[] = [];
  const raw = output.citations;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const citation =
        typeof item === "string"
          ? citationFromText(item, confidence)
          : item && typeof item === "object"
            ? citationFromRecord(item as Record<string, unknown>, confidence)
            : null;
      if (citation) citations.push(citation);
    }
  } else if (typeof raw === "string") {
    for (const chunk of raw.split(/\n|;/)) {
      const citation = citationFromText(chunk, confidence);
      if (citation) citations.push(citation);
    }
  }

  const candidateSource = get(input, ["candidate_source", "google_maps_url"]);
  if (candidateSource && !citations.some((citation) => citation.sourceUrl === candidateSource)) {
    citations.push({
      fieldName: "general",
      sourceUrl: candidateSource,
      sourceTitle: sourceTitle(candidateSource) || "Google Maps",
      excerpt: "Google Places discovery source.",
      confidence,
    });
  }

  return JSON.stringify(citations);
}

function combinedSearchText(input: Record<string, unknown>, output: Record<string, unknown>): string {
  return [
    get(input, ["name", "category", "notes"]),
    get(output, [
      "description",
      "reservation_guidance",
      "booking_notes",
      "score_components",
      "menu_highlights",
      "visit_tips",
      "citations",
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function includesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function scoreComponents(input: Record<string, unknown>, output: Record<string, unknown>): string {
  const text = combinedSearchText(input, output);
  const rating = numberValue(get(input, ["rating"]));
  const reviewCount = numberValue(get(input, ["review_count", "reviews"]));
  const website = get(input, ["website"]) || get(output, ["website"]);
  const phone = get(input, ["phone"]) || get(output, ["phone"]);
  const openingHours = get(output, ["opening_hours"]);
  const price = get(output, ["price_level"]) || get(input, ["price"]);
  const citationCount = Array.isArray(output.citations) ? output.citations.length : 0;

  const components: ScoreComponents = {
    operatingStatus: !includesAny(text, [/permanently closed/, /temporarily closed/]) && Boolean(openingHours || rating),
    recentReviews: reviewCount >= 20 && rating >= 4,
    websiteResponds: Boolean(website),
    multiSource: citationCount >= 2,
    phoneListed: Boolean(phone) || includesAny(text, [/\bphone\b/, /\+39/]),
    hoursListed: Boolean(openingHours),
    michelinListed: includesAny(text, [/\bmichelin\b/, /bib gourmand/]),
    authenticSentiment: includesAny(text, [
      /\bauthentic\b/,
      /\blocals?\b/,
      /family[- ]run/,
      /\btraditional\b/,
      /\bneighborhood\b/,
      /\baccogliente\b/,
      /\bosteria\b/,
    ]),
    ratingConsistency: rating >= 4.4 && reviewCount >= 40,
    priceQuality: includesAny(text, [/value/, /price[- ]quality/, /good price/]) || Boolean(price && price.length <= 2 && rating >= 4.3),
    undiscoveredGem:
      includesAny(text, [/hidden gem/, /undiscovered/, /under[- ]the[- ]radar/]) ||
      (reviewCount > 0 && reviewCount < 500 && rating >= 4.4),
    localCrowd: includesAny(text, [/local crowd/, /italian reviews/, /\blocals?\b/]),
    touristTrapLanguage: includesAny(text, [/tourist trap/, /overpriced/, /\bavoid\b/, /rip[- ]?off/, /too touristy/]),
    menuPhotosOutside: includesAny(text, [/menu photos outside/, /menu outside/]),
    decliningRatings: includesAny(text, [/declining/, /trending down/, /downward trend/]),
  };

  return JSON.stringify(components);
}

function outputPathFor(source: string): string {
  const parsed = parse(source);
  return join(parsed.dir || "data/enrichment", `${parsed.name.replace(/\.output$/i, "")}.output.csv`);
}

function parseArgs(argv: string[]): { source: string; target: string } {
  const positional: string[] = [];
  let target = "";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target") {
      target = argv[index + 1] ?? "";
      index += 1;
    } else if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
    } else {
      positional.push(arg);
    }
  }

  const source = positional[0];
  if (!source) {
    throw new Error("Usage: npm run enrich:parallel-json-to-csv -- data/enrichment/results.output.json [--target output.csv]");
  }

  return { source, target: target || outputPathFor(source) };
}

function rowFromResult(result: ParallelResult): CsvRow {
  const input = result.input ?? {};
  const output = result.output ?? {};
  const row: CsvRow = {};

  const values: Record<string, string> = {
    id: get(input, ["id", "place_id"]),
    official_name: get(output, ["official_name", "name"]) || get(input, ["name"]),
    category: get(input, ["category"]) || get(output, ["category"]),
    formatted_address: get(output, ["formatted_address", "address"]) || get(input, ["address"]),
    lat: get(input, ["lat", "latitude"]) || get(output, ["lat", "latitude"]),
    lng: get(input, ["lng", "longitude", "lon"]) || get(output, ["lng", "longitude", "lon"]),
    phone: get(output, ["phone", "phone_number"]) || get(input, ["phone", "phone_number"]),
    website: get(output, ["website", "official_website"]) || get(input, ["website", "official_website"]),
    google_maps_url: get(input, ["google_maps_url", "google_maps", "maps_url"]) || get(output, ["google_maps_url"]),
    booking_url: get(output, ["booking_url", "booking"]) || get(input, ["booking_url", "booking"]),
    menu_url: get(output, ["menu_url", "menu"]),
    social_instagram: get(output, ["social_instagram", "instagram"]),
    social_facebook: get(output, ["social_facebook", "facebook"]),
    rating: get(output, ["rating"]) || get(input, ["rating"]),
    review_count: get(output, ["review_count", "reviews"]) || get(input, ["review_count", "reviews"]),
    price_level: get(output, ["price_level", "price"]) || get(input, ["price_level", "price"]),
    opening_hours: get(output, ["opening_hours"]),
    best_time_to_visit: get(output, ["best_time_to_visit"]),
    reservation_guidance: get(output, ["reservation_guidance"]),
    dietary_tags: stringValue(output.dietary_tags),
    accessibility_notes: get(output, ["accessibility_notes"]),
    payment_notes: get(output, ["payment_notes"]),
    photo_urls: stringValue(output.photo_urls),
    menu_highlights: stringValue(output.menu_highlights),
    visit_tips: stringValue(output.visit_tips),
    booking_notes: get(output, ["booking_notes"]),
    description: get(output, ["description"]),
    confidence: get(output, ["confidence"]),
    vibe_score: get(output, ["vibe_score"]),
    score_components: scoreComponents(input, output),
    citations: normalizeCitations(input, output),
  };

  for (const field of requestedFields) row[field] = values[field] ?? "";
  return row;
}

async function convert(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await readFile(options.source, "utf8")) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error("Invalid Parallel JSON: expected top-level array");
  }

  const rows = raw.map((result) => rowFromResult(result as ParallelResult));
  await mkdir(dirname(options.target), { recursive: true });
  await writeFile(options.target, toCsv(rows));

  console.log(`Converted ${rows.length} Parallel rows from ${basename(options.source)}`);
  console.log(`CSV: ${options.target}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  convert().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
