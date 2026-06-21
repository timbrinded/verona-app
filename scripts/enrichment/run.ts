import { spawnSync } from "node:child_process";
import { dirname, join, parse } from "node:path";
import { mkdir } from "node:fs/promises";
import { libsql } from "../../src/db/client";

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

const sourceColumns = [
  { name: "id", description: "Stable Verona app place id" },
  { name: "name", description: "Place name" },
  { name: "category", description: "Place category" },
  { name: "address", description: "Known address" },
  { name: "lat", description: "Known latitude" },
  { name: "lng", description: "Known longitude" },
  { name: "website", description: "Known website URL" },
  { name: "google_maps_url", description: "Known Google Maps URL" },
  { name: "booking_url", description: "Known booking URL" },
  { name: "phone", description: "Known phone number" },
  { name: "rating", description: "Known public rating" },
  { name: "review_count", description: "Known review count" },
  { name: "price", description: "Known price tier" },
  { name: "notes", description: "Manual travel notes" },
  { name: "missing_fields", description: "Fields missing from the current database row" },
  { name: "candidate_source", description: "Discovery source URL or batch name for new candidate rows" },
];

const intent = `
Enrich each Verona travel guide place. Return the original id column plus these exact output columns:
${requestedFields.join(", ")}.
Prefer official websites, direct booking/menu pages, Google Maps profiles, Michelin, TheFork restaurant pages, and trustworthy local listings.
Booking_url must be a direct official reservation page, a restaurant-specific TheFork/AutoReserve page, a ticket page, or empty. Never return generic TheFork search URLs.
Use the Verona methodology for score_components: operating_status, recent_reviews, website_responds, multi_source, phone_listed, hours_listed, michelin_listed, authentic_sentiment, rating_consistency, price_quality, undiscovered_gem, local_crowd, tourist_trap_language, menu_photos_outside, declining_ratings.
Keep answers concise and travel-useful. Include source URLs and short citation notes in the citations column as JSON.
Do not invent unavailable data; leave unknown cells empty and lower confidence when sources disagree.
`;

function taskIdFromOutput(output: string): string | null {
  const jsonMatch = output.match(/"taskgroup_id"\s*:\s*"([^"]+)"/);
  if (jsonMatch) return jsonMatch[1];

  const textMatch = output.match(/taskgroup[_ -]?id[:\s]+([a-zA-Z0-9_-]+)/i);
  return textMatch?.[1] ?? null;
}

function monitoringUrlFromOutput(output: string): string {
  const urlMatch = output.match(/https?:\/\/\S+/);
  return urlMatch?.[0] ?? "";
}

async function run(): Promise<void> {
  const source = process.argv[2];
  if (!source) {
    throw new Error("Usage: npm run enrich:run -- data/enrichment/parallel-input-....csv");
  }

  const parsed = parse(source);
  const target = join(parsed.dir || "data/enrichment", `${parsed.name}.output.csv`);
  await mkdir(dirname(target), { recursive: true });

  const args = [
    "enrich",
    "run",
    "--source-type",
    "csv",
    "--source",
    source,
    "--target",
    target,
    "--source-columns",
    JSON.stringify(sourceColumns),
    "--intent",
    intent,
    "--no-wait",
  ];

  const result = spawnSync("parallel-cli", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(output || `parallel-cli exited with status ${result.status}`);
  }

  const taskId = taskIdFromOutput(output) ?? `parallel-${Date.now()}`;
  const monitoringUrl = monitoringUrlFromOutput(output);

  await libsql.execute({
    sql: `
      INSERT OR REPLACE INTO enrichment_runs (
        id, provider, status, input_path, output_path, requested_fields, started_at, error
      )
      VALUES (?, 'parallel', 'running', ?, ?, ?, CURRENT_TIMESTAMP, '')
    `,
    args: [taskId, source, target, JSON.stringify(requestedFields)],
  });

  console.log(output);
  console.log(`Recorded enrichment run ${taskId}`);
  console.log(`Target output: ${target}`);
  if (monitoringUrl) {
    console.log(`Monitoring URL: ${monitoringUrl}`);
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
