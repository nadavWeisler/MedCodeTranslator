# A License-Aware, Multi-Vocabulary Biomedical Terminology Bundle for Offline Clinical Coding Reference

**Working title**  
**Authors:** [TBD]  
**Target venue:** *Scientific Data* (Nature) — Data Descriptor, or *Database* (Oxford)  
**Draft date:** 2026-07-06

---

## Abstract

Open biomedical applications require terminology datasets that are **redistributable**, **attributed**, and **operationally refreshable**. We describe a curated multi-vocabulary bundle supporting twelve coding schemes—ATC hierarchy (levels 1–5), ICD-10-CM, ICD-9-CM, ICD-11 (demo), LOINC (partial common panel), CPT (demo), HCPCS Level II, and CVX—packaged for offline use in the MedCodeTranslator reference application. Each dataset is accompanied by structured provenance in `source-metadata.json`, including provider, URL, license text, record counts, coverage class (`full`, `partial`, or `demo`), and refresh timestamps. Public schemes are updated through an automated weekly pipeline; restricted schemes (SNOMED CT, full CPT, full LOINC) are explicitly excluded pending license review. We document refresh mechanics, crosswalk validation (ICD-9↔ICD-10 GEM), Hebrew label staging for high-frequency ICD-10 codes, and quality gates that block merges on validation failure. The bundle enables reproducible research snapshots via versioned release tags and supports citation of immutable dataset states. This descriptor is intended for informaticians building offline coding tools, teaching materials, and benchmark corpora—not for clinical decision support.

**Keywords:** biomedical terminology; data curation; ICD-10; LOINC; ATC; licensing; reproducibility

---

## 1. Background

### 1.1 Problem

Terminology consumers face three coupled challenges:

1. **License heterogeneity** — U.S. government ICD/HCPCS/CVX releases differ from WHO, Regenstrief LOINC, and proprietary CPT terms.
2. **Operational drift** — Annual ICD-10-CM updates and ATC alterations invalidate silent bundles.
3. **Transparency** — Applications often ship opaque subsets without coverage labels, misleading users about completeness.

### 1.2 Design principles

| Principle | Implementation |
|-----------|----------------|
| License-first | `DATA_SOURCES.md` matrix; no SNOMED/full CPT without review |
| Coverage honesty | `coverage` field + UI badges |
| Provenance by default | `source-metadata.json` per dataset |
| Refresh automation | GitHub Actions weekly refresh + sentinel |
| Preserve community labels | `merge_name_he` on refresh for Hebrew overlays |

---

## 2. Dataset inventory

### 2.1 Summary table

| Dataset | Records (approx.) | Coverage | Authority | Refresh |
|---------|-------------------|----------|-----------|---------|
| ATC-1 … ATC-5 | 14 – 5,579 | full | WHOCC / ChEMBL-derived | weekly |
| ICD-10-CM | 74,260 | full | CMS | weekly |
| ICD-9-CM | 14,567 | full | NBER/CMS | weekly |
| ICD-11 | 64 | demo | WHO | manual |
| LOINC | 600 | partial | Regenstrief (Top 2000+ subset) | scripted import |
| CPT-like | 64 | demo | curated sample | manual |
| HCPCS | 8,724 | full | CMS | weekly |
| CVX | 289 | full | CDC | weekly |
| ICD-9→ICD-10 GEM | pairs | full | CMS/NBER | weekly |

*Populate exact counts from latest `source-metadata.json` before submission.*

### 2.2 File layout

```
data/vocabularies/
  atc1.json … atc5.json
  icd10.json, icd9.json, icd11.json
  loinc.json, cpt.json, hcpcs.json, cvx.json
  icd9_to_icd10_gem.json
  source-metadata.json
data/aliases/common.json
data/benchmarks/*.json
```

Each vocabulary entry follows `{ code, name_en, name_he? }`.

---

## 3. Methods

### 3.1 Acquisition pipelines

**Automated public refresh** (`scripts/refresh_medical_db.py`):

- Downloads CMS ICD-10-CM ZIP (FY year configurable)
- Parses tabular order files; deduplicates padded labels
- Fetches NBER ICD-9, HCPCS, CVX, ATC alterations
- Validates hierarchy, crosswalk referential integrity
- Writes SQLite artifact mirror under `build/medical-db/`

**Curated imports:**

- LOINC: `scripts/import_loinc_common_panel.py` from OHDSI-mirrored Top 2000+ CSV (600 observation codes)
- Hebrew ICD-10 Stage A: `scripts/import_icd10_hebrew_labels.py` from `icd10_hebrew_stage_a.csv` (prefix propagation to leaf codes)

### 3.2 Crosswalk validation

ICD-9→ICD-10 GEM entries carry cardinality flags (`one-to-one`, `one-to-many`, `many-to-one`). Validator ensures both code sets exist in bundled vocabularies and flags orphan mappings for triage (`docs/DATASET_OPERATIONS.md`).

### 3.3 Hebrew label strategy

Full official Hebrew ICD-10-CM from the Israeli Ministry of Health requires separate license review. Stage A applies curated category-level Hebrew strings to all matching ICD-10-CM leaf codes by prefix, enabling Hebrew search for high-frequency conditions while documenting non-authoritative status in metadata.

### 3.4 Quality assurance

| Gate | Trigger |
|------|---------|
| `validate:data` | Minimum record counts, schema checks |
| Crosswalk validator | Referential integrity |
| `npm run benchmark` | Search regression vs baselines |
| Upstream sentinel | Upstream URL/hash change alerts |

---

## 4. Data records

### 4.1 Example ICD-10-CM record

```json
{
  "code": "E11.9",
  "name_en": "Type 2 diabetes mellitus without complications",
  "name_he": "סוכרת סוג 2 ללא סיבוכים"
}
```

### 4.2 Example source-metadata entry

```json
{
  "dataset": "loinc",
  "provider": "Regenstrief Institute",
  "record_count": 600,
  "coverage": "partial",
  "license_text": "LOINC license/terms apply",
  "dataset_version": "LOINC Top 2000+ common panel (600 codes)"
}
```

### 4.3 Versioning

Git tag format `dataset-YYYY.MM` (planned) marks immutable snapshots post-successful refresh merge. Application About screen displays `generated_at_utc` from metadata.

---

## 5. Technical validation

1. **Structural:** JSON schema consistency; SQLite seed round-trip
2. **Referential:** Crosswalk codes resolve in parent vocabularies
3. **Search:** Benchmark precision thresholds per scheme
4. **Manual:** Maintainer triage runbook for failed weekly refresh

Report validation error logs from `build/medical-db/validation-errors.json` in supplementary material.

---

## 6. Usage notes

### 6.1 Intended use

- Offline terminology lookup in education and coding practice
- Benchmark corpus for retrieval research
- Seed data for institutional forks with their own license reviews

### 6.2 Prohibited use

- Representing demo subsets as complete WHO/AMA distributions
- Clinical decision support without separate regulatory assessment
- Redistribution of derived datasets outside source license terms

### 6.3 Reproduction

```bash
npm ci
npm run refresh:data      # full refresh (requires network)
npm run validate:data     # validation only
npm run import:loinc
npm run import:icd10-he
npm run benchmark
```

---

## 7. Limitations

- LOINC 600-code panel is not clinically exhaustive.
- CPT demo is not AMA CPT; cannot substitute for licensed procedure coding.
- ICD-11 demo (64 codes) is illustrative only.
- Hebrew labels are curated, not MOH-official.
- RxNorm, NDC, SNOMED CT deferred pending licensing spikes.

---

## 8. Data availability

| Resource | Access |
|----------|--------|
| GitHub repository | Public, MIT license (code); data governed per source |
| Live metadata | `data/vocabularies/source-metadata.json` |
| Refresh artifacts | `build/medical-db/` on CI runners |
| Documentation | `DATA_SOURCES.md`, `docs/DATASET_OPERATIONS.md` |

No persistent public download DOI yet—assign Zenodo DOI on tagged dataset release before journal submission.

---

## 9. Code availability

Refresh and import scripts: `scripts/` directory. CI workflows: `.github/workflows/refresh-medical-db.yml`, `upstream-sentinel.yml`.

---

## 10. Conclusion

This bundle shows how multi-authority terminology can be packaged responsibly for offline open-source tools: explicit coverage labels, automated refresh for public sources, and hard exclusions for license-restricted vocabularies. The descriptor supports reproducible informatics research and teaches data stewardship patterns applicable beyond this single application.

---

## References (starter set)

1. CMS. ICD-10-CM Official Guidelines and Files.
2. Regenstrief Institute. LOINC Users' Guide and License.
3. WHO. ICD-11 Reference Guide and Licensing FAQ.
4. AMA. CPT Intellectual Property Policy.
5. CDC. CVX Code Set.
6. Choi S, et al. *Scientific Data* data descriptor guidelines. Nature Portfolio.

---

## Author contributions template

- **Conceptualization:** …
- **Data curation:** …
- **Software:** …
- **Writing – original draft:** …
- **Writing – review & editing:** …

## Competing interests

None declared.

## Ethics

Not applicable (no human subjects data).
