# MedCodeTranslator — Autonomous Agents

This directory contains autonomous and semi-autonomous agents built specifically for the
MedCodeTranslator repository. Each agent is a focused script that runs in CI, on a schedule,
or on-demand to automate a specific engineering workflow.

## Quick-win agents (no LLM required)

| Agent | Location | Run Mode | Value |
|---|---|---|---|
| `upstream-sentinel` | `agents/upstream-sentinel/` | Daily CI schedule | Probes all upstream dataset URLs; alerts before the weekly refresh breaks silently |
| `crosswalk-validator` | `agents/crosswalk-validator/` | CI gate inside `refresh-medical-db` | Validates ICD-9→ICD-10 crosswalk referential integrity after every dataset rebuild |
| `phi-guard` | `agents/phi-guard/` | CI gate on every PR touching `app/`, `db/`, `scripts/` | Scans PR diffs for PHI fields, SAFE_SCOPE violations, and external query transmission |
| `search-quality-benchmarker` | `agents/search-benchmarker/` | CI on dataset/fuzzy changes | Benchmarks Fuse.js and SQLite search precision per scheme |

## Shared configuration

All agents read from [`agents/agents-config.json`](agents-config.json) for thresholds
and shared settings.

## Running agents locally

```bash
# Upstream sentinel — probe all upstream source URLs
python agents/upstream-sentinel/sentinel.py

# Crosswalk validator — run after a local refresh
npm run refresh:data
python agents/crosswalk-validator/validate_crosswalk.py \
  --icd9-json data/vocabularies/icd9.json \
  --icd10-json data/vocabularies/icd10.json \
  --crosswalk-json build/medical-db/icd9_to_icd10_gem.json

# PHI guard — scan uncommitted changes
git diff HEAD | python agents/phi-guard/phi_guard.py

# PHI guard — scan a specific diff file
git diff origin/master...HEAD > /tmp/pr.diff
python agents/phi-guard/phi_guard.py --diff-file /tmp/pr.diff

# Search quality benchmark
npm run benchmark
```

## GitHub Actions integration

| Workflow | File | Trigger |
|---|---|---|
| Upstream sentinel | `.github/workflows/upstream-sentinel.yml` | Daily at 06:00 UTC |
| Crosswalk validator | integrated into `.github/workflows/refresh-medical-db.yml` | Weekly + on-demand |
| PHI guard | `.github/workflows/phi-guard.yml` | Every PR to `master`/`main` touching code |
| Search quality | `.github/workflows/search-quality.yml` | PR/push touching datasets or Fuse.js config |

## Agent descriptions

### `upstream-sentinel`
Probes all upstream source URLs from `data/vocabularies/source-metadata.json` plus CMS
ICD-10-CM and HCPCS annual file URLs for surrounding years. Reports availability and
detects when new annual files are published ahead of the weekly refresh run.
Optionally creates a GitHub Issue when a source becomes unreachable.

### `crosswalk-validator`
Validates that every ICD-9 code in the crosswalk exists in the current `icd9.json`
dataset, and every ICD-10 target code exists in `icd10.json`. Reports cardinality
distribution and flags anomalies (many:many above threshold, orphan counts above
threshold). Integrated as a CI gate in the weekly refresh workflow.

### `phi-guard`
Scans the diff of each PR for patterns that indicate PHI field declarations, clinical
decision support logic, or external HTTP requests from the app/db layer. Hard violations
exit 1 and block the PR. Warnings are informational. Pattern definitions live in
`agents/phi-guard/patterns.json` and can be maintained independently of the script.

### `search-quality-benchmarker`
Runs a curated benchmark suite of clinically representative queries against each coding
scheme using Fuse.js (with the same configuration as the app) and a SQLite LIKE
equivalent. Measures precision@1 and precision@5. Exits 1 if any scheme falls below
the configured threshold.
