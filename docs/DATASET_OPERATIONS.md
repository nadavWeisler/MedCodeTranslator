# Dataset Operations Runbook

This runbook describes how to triage, refresh, and validate bundled medical terminology data in MedCodeTranslator. It complements [DATA_SOURCES.md](../DATA_SOURCES.md) and the [roadmap](./ROADMAP.md).

> **No PHI:** Never include patient-identifiable data in issues, logs, or refresh artifacts.

---

## Workflows at a glance

| Workflow | Schedule | File | Purpose |
|----------|----------|------|---------|
| Refresh medical DB | Weekly + manual | `.github/workflows/refresh-medical-db.yml` | Rebuild vocabularies from upstream sources |
| Upstream sentinel | Daily 06:00 UTC | `.github/workflows/upstream-sentinel.yml` | Probe upstream URLs before refresh breaks |
| Search quality | PR / push (data changes) | `.github/workflows/search-quality.yml` | Fixture smoke + held-out IR harness |
| Crosswalk validator | Inside refresh workflow | `agents/crosswalk-validator/` | ICD-9 ↔ ICD-10 GEM integrity |

---

## Local commands

```bash
# Full refresh (writes to build/medical-db and updates assets when merged)
npm run refresh:data

# Validate existing assets without downloading
npm run validate:data

# Fixture regression smoke (not the published IR eval)
npm run benchmark

# Held-out IR harness (MRR / nDCG / P@k vs FTS5)
npm run eval:heldout

# Upstream URL probe
python agents/upstream-sentinel/sentinel.py

# Crosswalk check (after refresh)
python agents/crosswalk-validator/validate_crosswalk.py \
  --icd9-json assets/data/icd9.json \
  --icd10-json assets/data/icd10.json \
  --crosswalk-json build/medical-db/icd9_to_icd10_gem.json
```

---

## When a refresh fails

1. **Open the failed GitHub Actions run** for `refresh-medical-db`.
2. **Read the step log** — common failures:
   - Upstream URL moved or returned 404 (CMS annual file rotation)
   - ZIP/CSV parse error (upstream format change)
   - Crosswalk validator: orphan ICD-9 or ICD-10 codes
   - Empty or shrunk dataset (record count drop without explanation)
3. **Check upstream sentinel** — daily probe may have filed an issue already.
4. **Reproduce locally:**
   ```bash
   npm run refresh:data
   ```
5. **Open a `type: data` issue** with:
   - failing workflow link
   - scheme affected
   - upstream URL
   - error excerpt (no PHI)
6. **Do not merge partial/broken data** unless explicitly marked as rollback.

---

## When upstream sentinel alerts

The sentinel probes URLs in `assets/data/source-metadata.json` plus CMS ICD-10-CM and HCPCS files for surrounding fiscal years.

| Alert type | Action |
|------------|--------|
| Source unreachable | Verify URL manually; update `scripts/fetch_public_vocabularies.py` or metadata URL |
| New CMS year file available | Schedule refresh; update candidate URL list in fetch script |
| Intermittent timeout | Retry; increase `probe_timeout_seconds` in `agents/agents-config.json` only if persistent |

Reports are written to `build/upstream-sentinel/`.

---

## Crosswalk validator failures

The validator runs after ICD-9/ICD-10 datasets rebuild:

- Every crosswalk source code must exist in `icd9.json`
- Every crosswalk target code must exist in `icd10.json`
- Alerts when orphan count > `crosswalk_orphan_alert_count` (default 50)
- Alerts when many:many mappings exceed `crosswalk_many_many_pct_alert` (default 5%)

**Fix path:**
1. Confirm ICD-9 and ICD-10 files refreshed together
2. Re-download CMS GEM crosswalk via refresh script
3. If upstream GEM is correct but local ICD-10 subset differs, document the gap — do not invent mappings

---

## Published IR evaluation

Use `npm run eval:heldout`. Numbers in the README must match [`data/eval/heldout-report.json`](../data/eval/heldout-report.json). Protocol: [`data/eval/PROTOCOL.md`](../data/eval/PROTOCOL.md).

After a vocabulary pin change:

1. `npm run eval:heldout:generate`
2. `npm run eval:heldout`
3. Commit the updated `data/eval/heldout-queries.json` and `data/eval/heldout-report.json`
4. Copy the harness macro / by-type tables into the README — do not invent numbers

Athena and UTS/UMLS are intentionally not the CI baseline (hosted service / NLM license). The reproducible baseline is SQLite FTS5 on the same pinned JSON vocabs (`scripts/fts5_baseline.py`).

## Fixture smoke regressions

`npm run benchmark` is a hand-written CI gate, not the published IR eval. Thresholds (from `agents/agents-config.json`) are Success@1 ≥ **0.70** and Success@5 ≥ **0.85** (historically labeled precision@k).

When that gate fails:

1. Run `npm run benchmark` locally
2. Inspect `build/search-quality/benchmark-report.json`
3. Compare failing queries in `data/benchmarks/<scheme>.json`
4. If the product ranking changed, prefer updating the held-out harness report over expanding `expected_codes` theater
5. If the failure is accidental, fix search logic before merge

---

## Updating source metadata

After any vocabulary change, update `data/vocabularies/source-metadata.json`:

| Field | Required when |
|-------|----------------|
| `record_count` | Any add/remove of codes |
| `dataset_version` | Upstream version changes |
| `last_updated_utc` / `retrieved_at_utc` | Every refresh |
| `coverage` | `full`, `partial`, or `demo` — must reflect actual bundle |

Also sync `assets/data/source-metadata.json` if the app reads from assets at runtime.

---

## Demo vs full datasets

| Scheme | Coverage | Notes |
|--------|----------|-------|
| ICD-10, ICD-9, ATC, HCPCS, CVX | `full` | Automated refresh |
| ICD-11 | `demo` | 64-code curated subset; not full ICD-11 |
| LOINC | `partial` | 600-code common-panel subset; not full LOINC |

Do not mark a scheme `full` until an automated or licensed import path exists.

---

## Opening data issues

Use the **Data issue** GitHub template. Include:

- scheme name
- expected vs actual record count or code
- upstream source URL
- whether refresh workflow or manual bundle
- compliance note if licensing is involved

Label: `type: data`, `area: dataset`, appropriate priority.

---

## Escalation

Pause and route for review if a request involves:

- Patient-specific data processing
- Clinical decision support or inferred mappings
- SNOMED CT or full LOINC without license

See [SAFE_SCOPE.md](./SAFE_SCOPE.md).

---

## Related docs

- [ROADMAP.md](./ROADMAP.md)
- [Architecture](./architecture.md)
- [Contributing](../CONTRIBUTING.md)
- [Agents](../agents/README.md)
