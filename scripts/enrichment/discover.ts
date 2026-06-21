import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

interface DiscoveryBatch {
  id: string;
  objective: string;
  queries: string[];
  maxResults?: number;
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function loadBatches(): Promise<DiscoveryBatch[]> {
  const source = join(process.cwd(), "data", "enrichment", "discovery-batches.json");
  return JSON.parse(await readFile(source, "utf8")) as DiscoveryBatch[];
}

async function discover(): Promise<void> {
  const selectedBatch = process.argv.includes("--batch")
    ? process.argv[process.argv.indexOf("--batch") + 1]
    : "";
  const outputDir = join(process.cwd(), "data", "enrichment", "discovery", timestamp());
  await mkdir(outputDir, { recursive: true });

  const batches = (await loadBatches()).filter((batch) => !selectedBatch || batch.id === selectedBatch);
  if (batches.length === 0) {
    throw new Error(`No discovery batches matched ${selectedBatch}`);
  }

  for (const batch of batches) {
    const outputPath = join(outputDir, `${batch.id}.json`);
    const args = [
      "search",
      batch.objective,
      ...batch.queries.flatMap((query) => ["-q", query]),
      "--json",
      "--max-results",
      String(batch.maxResults ?? 10),
      "--excerpt-max-chars-total",
      "27000",
      "-o",
      outputPath,
    ];
    const result = spawnSync("parallel-cli", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (result.status !== 0) {
      throw new Error(`${batch.id} failed: ${result.stderr || result.stdout}`);
    }
    console.log(`${batch.id}: ${outputPath}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  discover().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
