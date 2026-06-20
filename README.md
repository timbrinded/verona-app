# Verona Guide

Mobile-first Verona travel guide backed by SQLite-compatible Turso/libSQL.

## App

- Next.js app with a full-screen Mapbox map.
- `/api/places` reads active places from SQLite.
- The browser fetches places once on load; database/API failures are shown as visible errors.
- `data/places.seed.json` is the editable seed source.
- `public/data/places.json` is a generated data snapshot exported from SQLite. The app does not read it at runtime.

## Environment

Local development defaults to `file:./data/verona.db` when no database variables are set.

For production on Vercel, configure:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

For manual enrichment:

```bash
PARALLEL_API_KEY=your_parallel_api_key
```

## Data Workflow

Install dependencies:

```bash
npm ci
```

Create/update the local schema, seed from `data/places.seed.json`, and export the static data snapshot:

```bash
npm run db:setup
```

Generate a new schema migration after changing `src/db/schema.ts`:

```bash
npm run db:generate -- --name describe_the_change
```

Run the app:

```bash
npm run dev
```

After editing `data/places.seed.json`, run:

```bash
npm run db:seed
npm run db:export
```

## Enrichment

Prepare rows with missing or stale enriched data:

```bash
npm run enrich:prepare
```

Start a Parallel enrichment job:

```bash
npm run enrich:run -- data/enrichment/parallel-input-YYYY-MM-DD.csv
```

When the Parallel output CSV is ready, import it and regenerate the static data snapshot:

```bash
npm run enrich:import -- data/enrichment/parallel-input-YYYY-MM-DD.output.csv
npm run db:export
```

The importer fills missing core fields, adds rich travel details, stores citations, and preserves protected seed/manual fields such as the home-base flag, notes, and pinned coordinates.

## Checks

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

`npm run test:e2e` starts the production build locally, checks `/api/places`, verifies map markers and filtering, and forces an API failure to confirm the error is visible.

## Deployment

Vercel deploys from the public GitHub repo `timbrinded/verona-app` on `main`.

Before deploying a database-backed change:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io TURSO_AUTH_TOKEN=... npm run db:setup
git push origin HEAD:main
```

After deployment, verify production is reading Turso:

```bash
curl -I https://verona-app-eight.vercel.app/api/places
```

The response should include `x-places-source: sqlite`. If a Turso API token was shared outside a secret manager, rotate it after use.
