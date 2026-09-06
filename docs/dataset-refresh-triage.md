# Dataset refresh triage runbook

Use this runbook when the **Refresh medical code database** workflow
(`.github/workflows/refresh-medical-db.yml`) fails or opens a PR with
unexpected changes.

## Quick checklist

1. Open the failed workflow run → read the job summary and `update-report.md` artifact.
2. Identify which upstream source failed (CMS ICD-10, CMS HCPCS, ChEMBL ATC, CDC CVX, NBER ICD-9).
3. Decide: **retry**, **fix parser**, **skip source**, or **pin previous data**.
4. Run local validation before merging any refresh PR:
   ```bash
   npm run validate:data
   npm run benchmark
   npm run eval:heldout:generate
   npm run eval:heldout
   ```
5. Merge only when validation, the fixture smoke, and the held-out harness pass.

## Workflow outputs

| Artifact / file | Location | Purpose |
|-----------------|----------|---------|
| Update report | `build/medical-db/update-report.md` | Added/removed/changed counts per dataset |
| Refreshed JSON | `data/vocabularies/*.json` | Runtime vocabulary files consumed by the app |
| Crosswalk | `data/vocabularies/icd9_to_icd10_gem.json` | ICD-9 ↔ ICD-10 GEM mappings |
| CI artifact | `medical-code-db` (workflow upload) | Full `build/medical-db/` bundle |

Canonical vocabulary path: **`data/vocabularies/`** (not `assets/data/`).

## Common failure modes

### Upstream URL unreachable

**Symptoms:** `urllib.error.URLError`, HTTP 404/503 in refresh logs.

**Actions:**
1. Run the upstream sentinel locally:
   ```bash
   python3 agents/upstream-sentinel/sentinel.py --strict
   ```
2. Check whether CMS published a new annual file (ICD-10 / HCPCS year rollover).
3. If the URL moved, update `scripts/refresh_medical_db.py` URL resolvers and open a fix PR.
4. If transient, re-run the workflow via **workflow_dispatch**.

### Parser / format change

**Symptoms:** Empty dataset, validation error, or dramatically wrong record counts.

**Actions:**
1. Download the upstream ZIP/CSV manually and inspect column layout.
2. Update the relevant parser in `scripts/refresh_medical_db.py`.
3. Run `npm run refresh:data` locally and compare counts with `data/vocabularies/source-metadata.json`.
4. Add a regression check in `npm run validate:data` if the failure mode is repeatable.

### Crosswalk integrity failure

**Symptoms:** `agents/crosswalk-validator/validate_crosswalk.py` exits 1.

**Actions:**
1. Read orphan counts and cardinality warnings in validator output.
2. Confirm `icd9.json` and `icd10.json` were refreshed together (not partial PR).
3. If ICD-10 codes were removed upstream, rebuild crosswalk or filter orphaned mappings in the refresh script.
4. Do **not** merge until referential integrity passes or an explicit exception is documented.

### Search quality regression

**Symptoms:** `npm run benchmark` or `npm run eval:heldout` exits 1 after a data refresh PR.

**Actions:**
1. Fixture smoke: read `build/search-quality/benchmark-report.json`. Prefer not to expand hand-picked `expected_codes` as the evaluation story.
2. Held-out IR: regenerate with `npm run eval:heldout:generate` if codes/labels changed, then `npm run eval:heldout` and update `data/eval/heldout-report.json` plus the README tables from that file.
3. If ranking genuinely degraded, fix data normalization or search layers before merging.

## When to re-run vs skip

| Situation | Recommendation |
|-----------|----------------|
| Transient network error | Re-run workflow |
| One non-critical demo subset stale | Document and schedule fix; do not block full refresh |
| CMS annual file not yet published | Pin previous year in resolver; skip until available |
| Malformed upstream file | Skip automated PR; fix parser first |

## Local reproduction

```bash
# Validate bundled data only (no network)
npm run validate:data

# Full refresh (requires network)
npm run refresh:data

# Crosswalk check
python3 agents/crosswalk-validator/validate_crosswalk.py

# Search quality
npm run benchmark
npm run eval:heldout:generate
npm run eval:heldout
```

## Merge criteria for refresh PRs

- [ ] `update-report.md` reviewed — no unexpected mass deletions
- [ ] `npm run validate:data` passes
- [ ] Crosswalk validator passes
- [ ] `npm run benchmark` passes
- [ ] `npm run eval:heldout` passes and README tables match `data/eval/heldout-report.json`
- [ ] `source-metadata.json` record counts updated
- [ ] No PHI or patient-specific data introduced

## Escalation

- Open a **Data issue** using `.github/ISSUE_TEMPLATE/data_issue.yml`.
- Tag with dataset / CI labels per `CONTRIBUTING.md`.
- Link the failing workflow run and attach relevant lines from `update-report.md`.
