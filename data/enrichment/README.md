# Verona Enrichment Workflow

Run commands from the repository root. Use Doppler for secret-backed steps:

```bash
doppler run --project clawd --config dev_personal -- npm run enrich:preflight
npm run enrich:audit
npm run enrich:prepare -- --all
doppler run --project clawd --config dev_personal -- npm run enrich:run -- data/enrichment/parallel-input-YYYY-MM-DD.csv
doppler run --project clawd --config dev_personal -- parallel-cli enrich poll TASKGROUP_ID --timeout 540 --json -o data/enrichment/parallel-input-YYYY-MM-DD.output.json
npm run enrich:parallel-json-to-csv -- data/enrichment/parallel-input-YYYY-MM-DD.output.json
npm run enrich:import -- data/enrichment/parallel-input-YYYY-MM-DD.output.csv
```

For 250-place expansion discoveries:

```bash
doppler run --project clawd --config dev_personal -- npm run enrich:discover
doppler run --project clawd --config dev_personal -- npm run enrich:google-candidates -- --target data/enrichment/google-candidates-250.csv
doppler run --project clawd --config dev_personal -- npm run enrich:run -- data/enrichment/google-candidates-250-balanced.csv
doppler run --project clawd --config dev_personal -- parallel-cli enrich poll TASKGROUP_ID --timeout 540 --json -o data/enrichment/google-candidates-250-balanced.output.json
npm run enrich:parallel-json-to-csv -- data/enrichment/google-candidates-250-balanced.output.json
npm run enrich:merge-candidates -- data/enrichment/google-candidates-250-balanced.output.csv --target-count 250
npm run enrich:import -- data/enrichment/google-candidates-250-balanced.output.accepted.csv TASKGROUP_ID-250 --allow-new --qa-report data/enrichment/import-report-TASKGROUP_ID-250.json
npm run enrich:promote-seed
npm run db:export
npm run enrich:qa
```

The generated CSV/JSON enrichment run artifacts are intentionally gitignored. The durable outputs are the promoted seed file, the public export, the discovery batch definitions, and this workflow document.

Booking links must be direct reservation, restaurant-specific TheFork/AutoReserve, ticket, or Airbnb room links. Generic search URLs are rejected and cleared during import.
