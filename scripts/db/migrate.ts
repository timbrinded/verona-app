import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { databaseUrl, libsql } from "../../src/db/client";

const migrationId = "0001_initial_sqlite_place_store";

function localDatabasePath(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  const path = url.slice("file:".length);
  return resolve(path.startsWith("//") ? path.slice(2) : path);
}

async function execute(sql: string): Promise<void> {
  await libsql.execute(sql);
}

async function migrate(): Promise<void> {
  const localPath = localDatabasePath(databaseUrl);
  if (localPath) {
    await mkdir(dirname(localPath), { recursive: true });
  }

  await execute("PRAGMA foreign_keys = ON");

  await execute(`
    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY NOT NULL,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      source_category TEXT NOT NULL DEFAULT '',
      rating REAL NOT NULL DEFAULT 0,
      reviews INTEGER NOT NULL DEFAULT 0,
      price TEXT NOT NULL DEFAULT '',
      distance REAL NOT NULL DEFAULT 0,
      vibe INTEGER NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0,
      address TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      google_maps TEXT NOT NULL DEFAULT '',
      booking TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      lat REAL,
      lng REAL,
      is_home_base INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      data_quality TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_enriched_at TEXT
    )
  `);
  await execute("CREATE UNIQUE INDEX IF NOT EXISTS places_slug_unique ON places (slug)");
  await execute("CREATE INDEX IF NOT EXISTS places_category_idx ON places (category)");
  await execute("CREATE INDEX IF NOT EXISTS places_status_idx ON places (status)");
  await execute("CREATE INDEX IF NOT EXISTS places_updated_at_idx ON places (updated_at)");

  await execute(`
    CREATE TABLE IF NOT EXISTS place_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      confidence REAL NOT NULL DEFAULT 1,
      retrieved_at TEXT
    )
  `);
  await execute("CREATE INDEX IF NOT EXISTS place_links_place_idx ON place_links (place_id)");
  await execute("CREATE INDEX IF NOT EXISTS place_links_type_idx ON place_links (type)");
  await execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS place_links_place_type_url_unique ON place_links (place_id, type, url)",
  );

  await execute(`
    CREATE TABLE IF NOT EXISTS place_details (
      place_id TEXT PRIMARY KEY NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      opening_hours TEXT NOT NULL DEFAULT '[]',
      best_time_to_visit TEXT NOT NULL DEFAULT '',
      reservation_guidance TEXT NOT NULL DEFAULT '',
      dietary_tags TEXT NOT NULL DEFAULT '[]',
      accessibility_notes TEXT NOT NULL DEFAULT '',
      payment_notes TEXT NOT NULL DEFAULT '',
      photo_urls TEXT NOT NULL DEFAULT '[]',
      menu_highlights TEXT NOT NULL DEFAULT '',
      visit_tips TEXT NOT NULL DEFAULT '',
      booking_notes TEXT NOT NULL DEFAULT '',
      social_links TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS place_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_title TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      confidence REAL NOT NULL DEFAULT 0,
      retrieved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await execute("CREATE INDEX IF NOT EXISTS place_sources_place_idx ON place_sources (place_id)");
  await execute("CREATE INDEX IF NOT EXISTS place_sources_field_idx ON place_sources (field_name)");

  await execute(`
    CREATE TABLE IF NOT EXISTS enrichment_runs (
      id TEXT PRIMARY KEY NOT NULL,
      provider TEXT NOT NULL DEFAULT 'parallel',
      status TEXT NOT NULL DEFAULT 'pending',
      input_path TEXT NOT NULL DEFAULT '',
      output_path TEXT NOT NULL DEFAULT '',
      requested_fields TEXT NOT NULL DEFAULT '[]',
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      error TEXT NOT NULL DEFAULT ''
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS enrichment_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL REFERENCES enrichment_runs(id) ON DELETE CASCADE,
      place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      input_payload TEXT NOT NULL DEFAULT '{}',
      output_payload TEXT NOT NULL DEFAULT '{}',
      error TEXT NOT NULL DEFAULT '',
      imported_at TEXT
    )
  `);
  await execute("CREATE INDEX IF NOT EXISTS enrichment_items_run_idx ON enrichment_items (run_id)");
  await execute("CREATE INDEX IF NOT EXISTS enrichment_items_place_idx ON enrichment_items (place_id)");

  await execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await libsql.execute({
    sql: "INSERT OR IGNORE INTO schema_migrations (id) VALUES (?)",
    args: [migrationId],
  });

  console.log(`Applied ${migrationId} to ${databaseUrl}`);
}

migrate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
