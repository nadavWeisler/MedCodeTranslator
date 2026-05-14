# crosswalk-validator

Validates referential integrity of the ICD-9 → ICD-10 General Equivalence Mapping (GEM)
crosswalk produced by `scripts/refresh_medical_db.py`.

## What it checks

| Check | Pass condition |
|---|---|
| ICD-9 source codes exist | Every `icd9_code` in the crosswalk exists in the current `icd9.json` dataset |
| ICD-10 target codes exist | Every `icd10_code` in the crosswalk exists in the current `icd10.json` dataset |
| Orphan count | Orphaned source codes ≤ `orphan_threshold` (default: 50); above that is an error |
| many:many cardinality | many:many pairs ≤ `many_many_threshold` (default: 5%); above that is a warning |

## Running locally

```bash
# After running npm run refresh:data (writes build/medical-db/icd9_to_icd10_gem.json)
python agents/crosswalk-validator/validate_crosswalk.py

# With explicit paths
python agents/crosswalk-validator/validate_crosswalk.py \
  --icd9-json assets/data/icd9.json \
  --icd10-json assets/data/icd10.json \
  --crosswalk-json build/medical-db/icd9_to_icd10_gem.json

# Skip gracefully if the crosswalk file is absent (e.g., validate-only mode)
python agents/crosswalk-validator/validate_crosswalk.py --allow-missing
```

## CI integration

Integrated as a step in `.github/workflows/refresh-medical-db.yml` immediately after the
refresh script builds `build/medical-db/icd9_to_icd10_gem.json`. The step runs with
`if: success()` so it only executes after a successful refresh.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All checks passed (warnings may have been printed) |
| `1` | Referential integrity failure or orphan/cardinality threshold exceeded |

## Output

- Console summary with cardinality distribution table
- GitHub Actions job summary (when `GITHUB_STEP_SUMMARY` env var is set)

## Configuration

Thresholds can be overridden via CLI args:

| Flag | Default | Description |
|---|---|---|
| `--orphan-threshold` | `50` | Max orphaned ICD-9 codes before escalating to error |
| `--many-many-threshold` | `0.05` | Max fraction of many:many pairs before warning |
