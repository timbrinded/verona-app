# Verona Enrichment Workflow

Run commands from the repository root. Use Doppler for secret-backed steps:

```bash
doppler run -- npm run enrich:preflight
npm run enrich:audit
npm run enrich:prepare -- --all
doppler run -- npm run enrich:run -- data/enrichment/parallel-input-YYYY-MM-DD.csv
parallel-cli enrich poll TASKGROUP_ID --timeout 540
npm run enrich:import -- data/enrichment/parallel-input-YYYY-MM-DD.output.csv
```

For new discoveries:

```bash
doppler run -- npm run enrich:discover
doppler run -- npm run enrich:google-candidates
doppler run -- npm run enrich:run -- data/enrichment/candidates.csv
npm run enrich:merge-candidates -- data/enrichment/candidates.output.csv --target-count 120
npm run enrich:import -- data/enrichment/candidates.accepted.csv --allow-new
npm run enrich:promote-seed
npm run db:export
npm run enrich:qa
```

Booking links must be direct reservation, restaurant-specific TheFork/AutoReserve, ticket, or Airbnb room links. Generic search URLs are rejected and cleared during import.
