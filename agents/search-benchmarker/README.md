# search-quality-benchmarker

CI **fixture smoke** for hand-written queries in `data/benchmarks/`. This is not the
published IR evaluation. For MRR / nDCG / P@k on the held-out set, use
`npm run eval:heldout` and [`data/eval/PROTOCOL.md`](../../data/eval/PROTOCOL.md).

The metrics below are Success@k (any listed `expected_codes` in the top k), historically
labeled precision@k.

## What it measures

| Metric | Description |
|---|---|
| **Success@1** (labeled P@1) | The top result matches an expected code |
| **Success@5** (labeled P@5) | An expected code appears in the top 5 results |

Both layered retrieval and SQLite LIKE are measured independently so you can see
which layer introduces any quality degradation.

## Running locally

```bash
# Install dependencies first (fuse.js is already in package.json)
npm ci

# Run all benchmarks
npm run benchmark

# Or run directly
node agents/search-benchmarker/run_benchmark.js

# Override thresholds via environment variables
BENCHMARK_P1_THRESHOLD=0.80 BENCHMARK_P5_THRESHOLD=0.90 node agents/search-benchmarker/run_benchmark.js
```

## CI integration

`.github/workflows/search-quality.yml` runs the benchmark on any PR or push that
touches `data/vocabularies/**`, `app/services/fuzzySearch.ts`, or `db/queries.ts`.

The workflow uploads `build/search-quality/benchmark-report.json` as an artifact and
writes a summary table to the GitHub Actions job summary.

## Benchmark fixtures

Fixtures live in `data/benchmarks/{scheme}.json`. Each fixture is:

```json
{
  "query": "aspirin",
  "expected_codes": ["B01AC06"],
  "category": "partial-name",
  "note": "Optional human-readable explanation"
}
```

`expected_codes` is an array — the benchmark passes if **any** of the listed codes
appears in the top-N results. Use arrays when multiple codes are valid answers
(e.g., "diabetes" matching both E10 and E11).

## Query categories

| Category | Description |
|---|---|
| `exact-name` | Query matches `name_en` exactly |
| `partial-name` | Query is a substring or key word from `name_en` |
| `exact-code` | Query is the exact code string |
| `misspelling` | Query is a common misspelling (tests fuzzy matching) |

## Configuration

Thresholds can be set in `agents/agents-config.json` or via environment variables:

| Variable | Default | Description |
|---|---|---|
| `BENCHMARK_P1_THRESHOLD` | `0.70` | Minimum precision@1 (layered retrieval) |
| `BENCHMARK_P5_THRESHOLD` | `0.85` | Minimum precision@5 (layered retrieval) |
