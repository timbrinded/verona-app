# Verona App Agent Notes

## Production Data Source

- Production `/api/places` reads from Turso/libSQL through `src/db/client.ts`.
- `public/data/places.json` is only a generated snapshot. It is useful for repo review and fallback/debugging, but it does not drive the production place count.
- A Git push to `main` deploys the app on Vercel, but it does not update production rows unless Turso is seeded/imported too.
- The expected production response header is `x-places-source: sqlite`.

## Known Projects And Secrets

- Doppler scope: `clawd/dev_personal`.
- Vercel project: `timbrindeds-projects/verona-app`.
- Turso database name: `verona-app`.
- Turso database URL: `libsql://verona-app-timbrinded.aws-eu-west-1.turso.io`.
- Doppler has `TURSO_API_KEY`, `VERCEL_API_KEY`, `PARALLEL_API_KEY`, and `GOOGLE_PLACES_API_KEY`.
- Doppler may not have `TURSO_DATABASE_URL` or `TURSO_AUTH_TOKEN`. Do not stop at `npm run enrich:preflight` when only those two are missing.
- Do not print secret values. Use names-only listings, temporary files, or one-shot command environments.

## Complete Production DB Update Flow

Run from the repository root.

1. Verify local data and app checks first:

```bash
npm run enrich:qa
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

2. Confirm Vercel project/env metadata without printing values:

```bash
doppler run --project clawd --config dev_personal -- sh -c \
  'VERCEL_TOKEN="$VERCEL_API_KEY" npx --yes vercel project ls --token "$VERCEL_API_KEY"'

doppler run --project clawd --config dev_personal -- sh -c \
  'VERCEL_TOKEN="$VERCEL_API_KEY" npx --yes vercel env ls production --format json --token "$VERCEL_API_KEY"'
```

Vercel sensitive env pulls may show `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` as present but inject empty values locally. If that happens, use the Turso API key path below.

3. Verify Turso access and get the DB URL:

```bash
doppler run --project clawd --config dev_personal -- sh -c \
  'TURSO_API_TOKEN="$TURSO_API_KEY" /Users/timbo/.turso/turso db list'

doppler run --project clawd --config dev_personal -- sh -c \
  'TURSO_API_TOKEN="$TURSO_API_KEY" /Users/timbo/.turso/turso db show verona-app --url'
```

4. Mint a short-lived database auth token:

```bash
doppler run --project clawd --config dev_personal -- sh -c \
  'TURSO_API_TOKEN="$TURSO_API_KEY" /Users/timbo/.turso/turso db tokens create verona-app --expiration 7d >/tmp/verona-turso-token'
```

5. Back up production before writing:

```bash
doppler run --project clawd --config dev_personal -- sh -c \
  'TURSO_API_TOKEN="$TURSO_API_KEY" /Users/timbo/.turso/turso db export verona-app --output-file data/verona-prod-backup-before-update-$(date +%Y-%m-%d-%H%M%S).db --overwrite'
```

6. Check the current production row count:

```bash
TURSO_DATABASE_URL="libsql://verona-app-timbrinded.aws-eu-west-1.turso.io" \
TURSO_AUTH_TOKEN="$(cat /tmp/verona-turso-token)" \
npx tsx -e "import { libsql } from './src/db/client'; async function main(){ const r=await libsql.execute(\"select count(*) as count from places where status = 'active'\"); console.log(JSON.stringify({activePlaces:Number(r.rows[0].count)})); } main();"
```

7. Apply schema and seed the promoted dataset:

```bash
TURSO_DATABASE_URL="libsql://verona-app-timbrinded.aws-eu-west-1.turso.io" \
TURSO_AUTH_TOKEN="$(cat /tmp/verona-turso-token)" \
npm run db:migrate

TURSO_DATABASE_URL="libsql://verona-app-timbrinded.aws-eu-west-1.turso.io" \
TURSO_AUTH_TOKEN="$(cat /tmp/verona-turso-token)" \
npm run db:seed
```

8. If the change came from a Parallel enrichment/import run, import the accepted CSV into Turso after seeding so details, links, citations, and score components are populated:

```bash
TURSO_DATABASE_URL="libsql://verona-app-timbrinded.aws-eu-west-1.turso.io" \
TURSO_AUTH_TOKEN="$(cat /tmp/verona-turso-token)" \
npm run enrich:import -- data/enrichment/google-candidates-250-balanced.output.accepted.csv RUN_ID-prod --allow-new --qa-report data/enrichment/import-report-RUN_ID-prod.json
```

After seeding first, this import may report `updatedRows` rather than `insertedRows`; that is expected.

9. Verify Turso and production:

```bash
TURSO_DATABASE_URL="libsql://verona-app-timbrinded.aws-eu-west-1.turso.io" \
TURSO_AUTH_TOKEN="$(cat /tmp/verona-turso-token)" \
npm run enrich:qa

TURSO_DATABASE_URL="libsql://verona-app-timbrinded.aws-eu-west-1.turso.io" \
TURSO_AUTH_TOKEN="$(cat /tmp/verona-turso-token)" \
npx tsx -e "import { libsql } from './src/db/client'; async function main(){ const r=await libsql.execute(\"select count(*) as count from places where status = 'active'\"); console.log(JSON.stringify({activePlaces:Number(r.rows[0].count)})); } main();"

curl -sS -D /tmp/verona-api-headers.txt -o /tmp/verona-api-body.json https://verona-app-eight.vercel.app/api/places
node -e "const fs=require('fs'); const body=JSON.parse(fs.readFileSync('/tmp/verona-api-body.json','utf8')); const headers=fs.readFileSync('/tmp/verona-api-headers.txt','utf8').split(/\r?\n/).filter(l=>/^x-places-source:|^x-vercel-cache:|^age:|^HTTP\//i.test(l)); console.log(JSON.stringify({headers,count:(body.places||body).length},null,2));"
```

Production API responses are cached for about 60 seconds. If the API still shows an old count with `x-vercel-cache: HIT` or a nonzero `age`, wait and retry before assuming the DB write failed.

10. Clean up temporary secrets:

```bash
rm -f /tmp/verona-turso-token .env.vercel.production.local
```

## Common Failure Modes

- `npm run enrich:preflight` can fail because Doppler lacks `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`; use `TURSO_API_KEY` to mint a temporary DB token instead.
- Vercel env metadata can show Turso vars exist while local `vercel env pull`/`vercel env run` injects empty sensitive values. Do not rely on those for Turso writes.
- Pushing `public/data/places.json` and `data/places.seed.json` to GitHub is necessary for repo alignment, but production count changes require the Turso seed/import step.
- The live API may briefly show the old count due to Vercel caching even after Turso is updated.
