import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { libsql } from "../../src/db/client";

const requestedFields = [
  "id",
  "official_name",
  "category",
  "source_category",
  "formatted_address",
  "lat",
  "lng",
  "phone",
  "website",
  "google_maps_url",
  "booking_url",
  "ticket_url",
  "social_instagram",
  "social_facebook",
  "social_tiktok",
  "rating",
  "review_count",
  "price_level",
  "opening_hours",
  "late_open_confidence",
  "late_hours_evidence",
  "latest_confirmed_close",
  "late_days",
  "music_style",
  "crowd_age_range",
  "crowd_type",
  "queue_likelihood",
  "queue_duration",
  "door_policy",
  "busy_level",
  "peak_time",
  "heat_sweat_level",
  "dancefloor",
  "last_entry_risk",
  "best_time_to_visit",
  "reservation_guidance",
  "accessibility_notes",
  "payment_notes",
  "photo_urls",
  "visit_tips",
  "booking_notes",
  "description",
  "confidence",
  "vibe_score",
  "nightlife_score_components",
  "citations",
];

const sourceColumns = [
  { name: "id", description: "Stable candidate id" },
  { name: "name", description: "Venue name" },
  { name: "category", description: "Public Verona app category, expected to be Late Night" },
  { name: "source_category", description: "Candidate nightlife subtype such as club, late_bar, pub, live_music" },
  { name: "address", description: "Known address" },
  { name: "lat", description: "Known latitude" },
  { name: "lng", description: "Known longitude" },
  { name: "website", description: "Known website URL" },
  { name: "google_maps_url", description: "Known Google Maps URL" },
  { name: "booking_url", description: "Known booking or ticket URL" },
  { name: "phone", description: "Known phone number" },
  { name: "rating", description: "Known public rating" },
  { name: "review_count", description: "Known review count" },
  { name: "price", description: "Known price tier" },
  { name: "notes", description: "Candidate discovery note" },
  { name: "missing_fields", description: "Candidate marker" },
  { name: "candidate_source", description: "Discovery source URL or query evidence" },
];

const intent = `
Enrich each Verona late-night venue candidate. Return the original id column plus these exact output columns:
${requestedFields.join(", ")}.
Category must remain "Late Night". Preserve the nightlife subtype in source_category.
Only include a venue if credible current evidence shows it is open past 00:00 on at least one useful night.
Prefer official venue websites, Google Business profiles, Instagram/TikTok/public social pages, event pages, promoter pages, RA, DICE, Skiddle, and trustworthy local nightlife listings.
Do not use Tripadvisor or TheFork as evidence for this category.
Use direct venue, ticket, or event URLs for booking_url; leave it empty when there is no direct page.
late_open_confidence must be 0 to 1 and should reflect how confident a traveler can be that the venue is genuinely open late.
latest_confirmed_close should be a concise time such as 00:30, 01:00, 02:00, 04:00, or empty if not confirmed.
late_days should list the nights with current evidence, separated by semicolons or as JSON.
Estimate music_style, crowd_age_range, crowd_type, queue_likelihood, queue_duration, door_policy, busy_level, peak_time, heat_sweat_level, dancefloor, and last_entry_risk only when evidence supports it; otherwise leave concise unknown wording.
Use nightlife_score_components as JSON booleans with these keys: openPastMidnight, recentLateEvidence, hoursListed, multiSource, officialSource, eventSocialProof, musicDefined, crowdFit, queueManageable, transportAccess, comfortWarning, strictDoorWarning, deadNightRisk.
Set confidence and vibe_score consistently with the evidence; vibe_score is 0 to 20.
Include source URLs and short citation notes in the citations column as JSON. Do not invent unavailable data; leave unknown cells empty and lower confidence when sources disagree.
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
    throw new Error("Usage: npm run enrich:run:late-night -- data/enrichment/late-night-candidates.csv");
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

  const taskId = taskIdFromOutput(output) ?? `parallel-late-night-${Date.now()}`;
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
