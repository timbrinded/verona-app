import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { listPlaces } from "../../src/lib/places";

async function exportPlaces(): Promise<void> {
  const places = await listPlaces();
  const target = join(process.cwd(), "public", "data", "places.json");

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(places, null, 2)}\n`);

  console.log(`Exported ${places.length} places to ${target}`);
}

exportPlaces().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
